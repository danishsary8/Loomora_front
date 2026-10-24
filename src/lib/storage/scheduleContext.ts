import { createContext, useContext } from 'react'
import type { ScheduleRepository } from './ScheduleRepository'

export const ScheduleRepositoryContext = createContext<ScheduleRepository | null>(null)

/** The active schedule storage (guest for now; server once the user has an account). */
export function useScheduleRepository(): ScheduleRepository {
  const repo = useContext(ScheduleRepositoryContext)
  if (!repo) throw new Error('useScheduleRepository must be used inside <AppProviders>')
  return repo
}
