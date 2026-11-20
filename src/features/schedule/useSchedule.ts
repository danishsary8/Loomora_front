import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { LocalDate } from '@/features/todos/types'
import { streakKeys } from '@/features/streak/useStreak'
import { useSession } from '@/lib/api'
import {
  GuestScheduleRepository,
  useScheduleRepository,
  type ScheduleRepository,
} from '@/lib/storage'
import type { CreateScheduleItemInput, ExceptionInput, UpdateScheduleItemInput } from './types'

export const scheduleKeys = {
  all: ['schedule'] as const,
  session: (generation: number) => [...scheduleKeys.all, generation] as const,
  items: (generation: number) => [...scheduleKeys.session(generation), 'items'] as const,
  day: (date: LocalDate, generation: number) =>
    [...scheduleKeys.session(generation), 'day', date] as const,
}

function useScheduleStorage() {
  const repo = useScheduleRepository()
  const generation = useSession((state) => state.generation)
  const networkMode = repo instanceof GuestScheduleRepository ? 'always' : 'online'
  const sameSession = () => useSession.getState().generation === generation
  const assertSession = () => {
    if (!sameSession()) throw new Error('Session changed')
  }
  return { repo, generation, networkMode, assertSession } as const
}

export function refreshSchedule(
  queryClient: QueryClient,
  repo: ScheduleRepository,
  generation: number,
  refreshStreak = false,
) {
  const active = useSession.getState()
  // An already-started IndexedDB write can finish after the user returns to the same local plan.
  const sameGuestPlan = active.token === null && repo instanceof GuestScheduleRepository
  if (active.generation !== generation && !sameGuestPlan) return
  if (refreshStreak) void queryClient.invalidateQueries({ queryKey: streakKeys.all })
  return queryClient.invalidateQueries({ queryKey: scheduleKeys.session(active.generation) })
}

/** The repeat definitions used by Week and the occurrence editor. */
export function useScheduleItems(enabled = true) {
  const { repo, generation, networkMode, assertSession } = useScheduleStorage()
  return useQuery({
    queryKey: scheduleKeys.items(generation),
    networkMode,
    enabled,
    queryFn: () => {
      assertSession()
      return repo.listItems()
    },
  })
}

export function useScheduleDay(date: LocalDate) {
  const { repo, generation, networkMode, assertSession } = useScheduleStorage()
  return useQuery({
    queryKey: scheduleKeys.day(date, generation),
    networkMode,
    queryFn: () => {
      assertSession()
      return repo.listForDate(date)
    },
  })
}

export function useScheduleMutation<Input, Result>(
  operation: string,
  write: (repo: ScheduleRepository, input: Input) => Promise<Result>,
  { refreshStreak = false, refreshOnError = false } = {},
) {
  const { repo, generation, networkMode, assertSession } = useScheduleStorage()
  const queryClient = useQueryClient()
  return useMutation({
    // A new generation detaches the observer from any paused mutation.
    mutationKey: [...scheduleKeys.session(generation), operation],
    scope: { id: `schedule:${generation}:${operation}` },
    networkMode,
    mutationFn: (input: Input) => {
      assertSession()
      return write(repo, input)
    },
    onSettled: (_result, error) => {
      if (!error || refreshOnError) {
        return refreshSchedule(queryClient, repo, generation, !error && refreshStreak)
      }
    },
  })
}

export function useCreateScheduleItem() {
  return useScheduleMutation('create', (repo, input: CreateScheduleItemInput) => repo.create(input))
}

/** "All repeats" edit. */
export function useUpdateScheduleItem() {
  return useScheduleMutation(
    'update',
    (repo, { id, patch }: { id: string; patch: UpdateScheduleItemInput }) => repo.update(id, patch),
  )
}

/** "Only today" change. */
export function useSetScheduleException() {
  return useScheduleMutation(
    'exception',
    (repo, { id, date, input }: { id: string; date: LocalDate; input: ExceptionInput }) =>
      repo.setException(id, date, input),
  )
}

/** Mark an occurrence done or undo it (docs/08 rule 7). */
export function useSetScheduleCheckin() {
  return useScheduleMutation(
    'checkin',
    (repo, { id, date, done }: { id: string; date: LocalDate; done: boolean }) =>
      repo.setCheckin(id, date, done),
    { refreshStreak: true },
  )
}
