import { createContext, useContext } from 'react'
import type { TodoRepository } from './TodoRepository'

export const TodoRepositoryContext = createContext<TodoRepository | null>(null)

/** The active to-do storage (guest for now; server once the user has an account). */
export function useTodoRepository(): TodoRepository {
  const repo = useContext(TodoRepositoryContext)
  if (!repo) throw new Error('useTodoRepository must be used inside <AppProviders>')
  return repo
}
