import { createContext, useContext } from 'react'
import type { StreakRepository } from './StreakRepository'

export const StreakRepositoryContext = createContext<StreakRepository | null>(null)

/** The active streak source (guest or account). */
export function useStreakRepository(): StreakRepository {
  const repo = useContext(StreakRepositoryContext)
  if (!repo) throw new Error('useStreakRepository must be used inside <AppProviders>')
  return repo
}
