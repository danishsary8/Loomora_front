import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { LocalDate } from '@/features/todos/types'
import { accountDataApi, useSession, type StatsSummary } from '@/lib/api'
import { useGuestStorage } from '@/lib/storage'
import { FocusSessionRepositoryContext } from '@/lib/storage/focusSessionContext'
import { GuestFocusSessionRepository } from '@/lib/storage/GuestFocusSessionRepository'
import { computeGuestStatsSummary } from './computeStatsSummary'

export const statsSummaryKeys = {
  all: ['stats-summary'] as const,
  range: (generation: number, from: LocalDate, to: LocalDate) =>
    [...statsSummaryKeys.all, generation, from, to] as const,
}

/**
 * Loads B-047 analytics and Plan vs Reality summary for `[from, to]`.
 * Guests compute locally from Dexie (offline-capable); accounts read `GET /stats/summary`.
 */
export function useStatsSummary(from: LocalDate, to: LocalDate) {
  const guest = useGuestStorage()
  const focusRepo = useContext(FocusSessionRepositoryContext)
  if (!focusRepo) throw new Error('useStatsSummary must be used inside <AppProviders>')
  const generation = useSession((state) => state.generation)
  const signedIn = useSession((state) => state.token !== null)
  const isGuest = !signedIn && focusRepo instanceof GuestFocusSessionRepository

  return useQuery<StatsSummary>({
    queryKey: statsSummaryKeys.range(generation, from, to),
    networkMode: isGuest ? 'always' : 'online',
    queryFn: async ({ signal }) => {
      if (useSession.getState().generation !== generation) {
        throw new Error('Session changed')
      }
      if (!isGuest) {
        return accountDataApi.getStatsSummary(from, to, signal)
      }
      const [todos, items, exceptions, checkins, sessions] = await Promise.all([
        guest.todos.listAll(),
        guest.schedule.listItems(),
        guest.schedule.listExceptions(),
        guest.schedule.listCheckins(),
        focusRepo.listForRange(from, to),
      ])
      if (useSession.getState().generation !== generation) {
        throw new Error('Session changed')
      }
      return computeGuestStatsSummary({
        from,
        to,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        todos,
        items,
        exceptions,
        checkins,
        sessions,
      })
    },
  })
}
