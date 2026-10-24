import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { LocalDate } from '@/features/todos/types'
import { useScheduleRepository } from '@/lib/storage'
import type { CreateScheduleItemInput, ExceptionInput, UpdateScheduleItemInput } from './types'

export const scheduleKeys = {
  all: ['schedule'] as const,
  items: ['schedule', 'items'] as const,
  day: (date: LocalDate) => ['schedule', 'day', date] as const,
}

export function useScheduleDay(date: LocalDate) {
  const repo = useScheduleRepository()
  return useQuery({
    queryKey: scheduleKeys.day(date),
    queryFn: () => repo.listForDate(date),
  })
}

function useInvalidateSchedule() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
}

export function useCreateScheduleItem() {
  const repo = useScheduleRepository()
  const invalidate = useInvalidateSchedule()
  return useMutation({
    mutationFn: (input: CreateScheduleItemInput) => repo.create(input),
    onSuccess: invalidate,
  })
}

/** "All repeats" edit. */
export function useUpdateScheduleItem() {
  const repo = useScheduleRepository()
  const invalidate = useInvalidateSchedule()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateScheduleItemInput }) =>
      repo.update(id, patch),
    onSuccess: invalidate,
  })
}

/** "Only today" change. */
export function useSetScheduleException() {
  const repo = useScheduleRepository()
  const invalidate = useInvalidateSchedule()
  return useMutation({
    mutationFn: ({ id, date, input }: { id: string; date: LocalDate; input: ExceptionInput }) =>
      repo.setException(id, date, input),
    onSuccess: invalidate,
  })
}

/** Mark an occurrence done or undo it (docs/08 rule 7). */
export function useSetScheduleCheckin() {
  const repo = useScheduleRepository()
  const invalidate = useInvalidateSchedule()
  return useMutation({
    mutationFn: ({ id, date, done }: { id: string; date: LocalDate; done: boolean }) =>
      repo.setCheckin(id, date, done),
    onSuccess: invalidate,
  })
}
