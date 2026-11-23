import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { LazyMotion } from 'framer-motion'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  accountDataApi,
  focusSessionsApi,
  scheduleApi,
  todosApi,
  useServiceStatus,
  useSession,
} from '@/lib/api'
import {
  GuestScheduleRepository,
  GuestStorageContext,
  GuestStreakRepository,
  GuestTodoRepository,
  ScheduleRepositoryContext,
  ServerScheduleRepository,
  ServerStreakRepository,
  ServerTodoRepository,
  StreakRepositoryContext,
  TodoRepositoryContext,
  type GuestStorage,
} from '@/lib/storage'
import { GuestDailyIntentionRepository } from '@/lib/storage/GuestDailyIntentionRepository'
import { GuestFocusSessionRepository } from '@/lib/storage/GuestFocusSessionRepository'
import { ServerFocusSessionRepository } from '@/lib/storage/ServerFocusSessionRepository'
import { FocusSessionRepositoryContext } from '@/lib/storage/focusSessionContext'
import type { GuestDatabase } from '@/lib/storage/db'
import { GuestPreferenceDatabaseContext } from '@/lib/storage/guestPreferences'
import { createQueryClient } from './queryClient'

// Animation features load after first paint, keeping them out of the entry chunk.
const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default)

export interface AppProvidersProps {
  children: ReactNode
  /** Tests pass their own guest repositories (on a throwaway database). */
  todoRepository?: GuestTodoRepository
  scheduleRepository?: GuestScheduleRepository
  guestDatabase?: GuestDatabase
  queryClient?: QueryClient
}

/** Signed out: the plan lives on this device. Signed in: it lives on the server (A8-5). */
export function AppProviders({
  children,
  todoRepository,
  scheduleRepository,
  queryClient,
  guestDatabase,
}: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  const [guest] = useState<GuestStorage>(() => ({
    todos: todoRepository ?? new GuestTodoRepository(),
    schedule: scheduleRepository ?? new GuestScheduleRepository(),
    intentions: new GuestDailyIntentionRepository(guestDatabase),
  }))
  const [guestStreak] = useState(() => new GuestStreakRepository(guest.todos, guest.schedule))
  const [server] = useState(() => ({
    todos: new ServerTodoRepository(todosApi),
    schedule: new ServerScheduleRepository(scheduleApi),
    streak: new ServerStreakRepository(accountDataApi),
  }))

  const [guestFocus] = useState(() => new GuestFocusSessionRepository({ db: guestDatabase }))
  const generation = useSession((s) => s.generation)
  const accountFocus = useMemo(
    () => new ServerFocusSessionRepository(focusSessionsApi, guestDatabase, generation),
    [generation, guestDatabase],
  )
  const signedIn = useSession((s) => s.token !== null)
  useEffect(() => {
    let seenGeneration = useSession.getState().generation
    return useSession.subscribe((state) => {
      if (state.generation === seenGeneration) return
      seenGeneration = state.generation
      useServiceStatus.getState().markUp()
      // Drop and cancel the previous session's queries before the next generation mounts.
      void client.cancelQueries()
      client.removeQueries()
    })
  }, [client])

  const active = signedIn
    ? server
    : { todos: guest.todos, schedule: guest.schedule, streak: guestStreak }

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <QueryClientProvider client={client}>
        <GuestStorageContext.Provider value={guest}>
          <TodoRepositoryContext.Provider value={active.todos}>
            <ScheduleRepositoryContext.Provider value={active.schedule}>
              <StreakRepositoryContext.Provider value={active.streak}>
                <GuestPreferenceDatabaseContext.Provider value={guestDatabase}>
                  <FocusSessionRepositoryContext.Provider
                    value={signedIn ? accountFocus : guestFocus}
                  >
                    {children}
                  </FocusSessionRepositoryContext.Provider>
                </GuestPreferenceDatabaseContext.Provider>
              </StreakRepositoryContext.Provider>
            </ScheduleRepositoryContext.Provider>
          </TodoRepositoryContext.Provider>
        </GuestStorageContext.Provider>
      </QueryClientProvider>
    </LazyMotion>
  )
}
