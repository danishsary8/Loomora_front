import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import { GuestTodoRepository, TodoRepositoryContext, type TodoRepository } from '@/lib/storage'
import { createQueryClient } from './queryClient'

export interface AppProvidersProps {
  children: ReactNode
  /** Tests pass their own; the app uses guest storage (R1 guest mode). */
  todoRepository?: TodoRepository
  queryClient?: QueryClient
}

export function AppProviders({ children, todoRepository, queryClient }: AppProvidersProps) {
  const [client] = useState(() => queryClient ?? createQueryClient())
  const [repo] = useState(() => todoRepository ?? new GuestTodoRepository())
  return (
    <QueryClientProvider client={client}>
      <TodoRepositoryContext.Provider value={repo}>{children}</TodoRepositoryContext.Provider>
    </QueryClientProvider>
  )
}
