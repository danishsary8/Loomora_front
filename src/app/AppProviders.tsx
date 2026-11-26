import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { LazyMotion } from 'framer-motion'
import { FocusRuntimeProvider } from '@/features/focus/FocusRuntimeProvider'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  accountDataApi,
  focusSessionsApi,
  notesApi,
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
import { GuestNoteRepository } from '@/lib/storage/GuestNoteRepository'
import { ServerFocusSessionRepository } from '@/lib/storage/ServerFocusSessionRepository'
import { ServerNoteRepository } from '@/lib/storage/ServerNoteRepository'
import { FocusSessionRepositoryContext } from '@/lib/storage/focusSessionContext'
import { NoteRepositoryContext } from '@/lib/storage/noteContext'
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
  const [guestNotes] = useState(() => new GuestNoteRepository({ db: guestDatabase }))
  const [guest] = useState<GuestStorage>(() => ({
    todos: todoRepository ?? new GuestTodoRepository(),
    schedule: scheduleRepository ?? new GuestScheduleRepository(),
    intentions: new GuestDailyIntentionRepository(guestDatabase),
    notes: guestNotes,
  }))
  const [guestStreak] = useState(() => new GuestStreakRepository(guest.todos, guest.schedule))
  const [server] = useState(() => ({
    todos: new ServerTodoRepository(todosApi),
    schedule: new ServerScheduleRepository(scheduleApi),
    streak: new ServerStreakRepository(accountDataApi),
    notes: new ServerNoteRepository(notesApi),
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

  const focusRepository = signedIn ? accountFocus : guestFocus
  const noteRepository = signedIn ? server.notes : guestNotes

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <QueryClientProvider client={client}>
        <GuestStorageContext.Provider value={guest}>
          <TodoRepositoryContext.Provider value={active.todos}>
            <ScheduleRepositoryContext.Provider value={active.schedule}>
              <StreakRepositoryContext.Provider value={active.streak}>
                <NoteRepositoryContext.Provider value={noteRepository}>
                  <GuestPreferenceDatabaseContext.Provider value={guestDatabase}>
                    <FocusSessionRepositoryContext.Provider value={focusRepository}>
                      <FocusRuntimeProvider
                        database={guestDatabase}
                        repository={focusRepository}
                        generation={generation}
                      >
                        {children}
                      </FocusRuntimeProvider>
                    </FocusSessionRepositoryContext.Provider>
                  </GuestPreferenceDatabaseContext.Provider>
                </NoteRepositoryContext.Provider>
              </StreakRepositoryContext.Provider>
            </ScheduleRepositoryContext.Provider>
          </TodoRepositoryContext.Provider>
        </GuestStorageContext.Provider>
      </QueryClientProvider>
    </LazyMotion>
  )
}
