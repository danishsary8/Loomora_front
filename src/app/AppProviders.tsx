import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { LazyMotion } from 'framer-motion'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { accountDataApi, scheduleApi, todosApi, useSession } from '@/lib/api'
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
import { createQueryClient } from './queryClient'

// Animation features load after first paint, keeping them out of the entry chunk.
const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default)

export interface AppProvidersProps {
  children: ReactNode
  /** Tests pass their own guest repositories (on a throwaway database). */
  todoRepository?: GuestTodoRepository
  scheduleRepository?: GuestScheduleRepository
  queryClient?: QueryClient
}

/** Signed out: the plan lives on this device. Signed in: it lives on the server (A8-5). */
export function AppProviders({
  children,
  todoRepository,
  scheduleRepository,
  queryClient,
}: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  const [guest] = useState<GuestStorage>(() => ({
    todos: todoRepository ?? new GuestTodoRepository(),
    schedule: scheduleRepository ?? new GuestScheduleRepository(),
  }))
  const [guestStreak] = useState(() => new GuestStreakRepository(guest.todos, guest.schedule))
  const [server] = useState(() => ({
    todos: new ServerTodoRepository(todosApi),
    schedule: new ServerScheduleRepository(scheduleApi),
    streak: new ServerStreakRepository(accountDataApi),
  }))

  const signedIn = useSession((s) => s.token !== null)
  const previous = useRef(signedIn)
  useEffect(() => {
    if (previous.current === signedIn) return
    previous.current = signedIn
    // Lists read from the other storage now: drop what the old one cached and load again.
    void client.resetQueries()
  }, [signedIn, client])

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
                {children}
              </StreakRepositoryContext.Provider>
            </ScheduleRepositoryContext.Provider>
          </TodoRepositoryContext.Provider>
        </GuestStorageContext.Provider>
      </QueryClientProvider>
    </LazyMotion>
  )
}
