import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { LazyMotion } from 'framer-motion'
import { useState, type ReactNode } from 'react'
import {
  GuestScheduleRepository,
  GuestTodoRepository,
  ScheduleRepositoryContext,
  TodoRepositoryContext,
  type ScheduleRepository,
  type TodoRepository,
} from '@/lib/storage'
import { createQueryClient } from './queryClient'

// Animation features load after first paint, keeping them out of the entry chunk.
const loadMotionFeatures = () => import('./motionFeatures').then((mod) => mod.default)

export interface AppProvidersProps {
  children: ReactNode
  /** Tests pass their own; the app uses guest storage (R1 guest mode). */
  todoRepository?: TodoRepository
  scheduleRepository?: ScheduleRepository
  queryClient?: QueryClient
}

export function AppProviders({
  children,
  todoRepository,
  scheduleRepository,
  queryClient,
}: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  const [repo] = useState(() => todoRepository ?? new GuestTodoRepository())
  const [schedule] = useState(() => scheduleRepository ?? new GuestScheduleRepository())
  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <QueryClientProvider client={client}>
        <TodoRepositoryContext.Provider value={repo}>
          <ScheduleRepositoryContext.Provider value={schedule}>
            {children}
          </ScheduleRepositoryContext.Provider>
        </TodoRepositoryContext.Provider>
      </QueryClientProvider>
    </LazyMotion>
  )
}
