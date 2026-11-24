import { useContext, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { LocalDate } from '@/features/todos/types'
import { useSession } from '@/lib/api'
import { isLocalDate } from '@/lib/date'
import { FocusSessionRepositoryContext } from '@/lib/storage/focusSessionContext'
import type { PendingFocusSave } from './focusRuntime'
import type { FocusSession } from './types'

const historyKey = (generation: number) => ['focus-history', generation] as const

export function useFocusHistory(date: LocalDate) {
  const repository = useContext(FocusSessionRepositoryContext)
  const generation = useSession((state) => state.generation)
  const query = useQuery({
    queryKey: [...historyKey(generation), date],
    enabled: repository !== null && isLocalDate(date),
    networkMode: repository?.mode === 'guest' ? 'always' : 'online',
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!repository || useSession.getState().generation !== generation) {
        throw new Error('Focus history session changed')
      }
      const rows = await repository.listForDate(date)
      const unique = new Map<string, FocusSession>()
      for (const row of rows) {
        if (row.local_date !== date) continue
        const id = row.id.toLowerCase()
        if (!unique.has(id)) unique.set(id, row)
      }
      const sessions = [...unique.values()].sort(
        (a, b) => Date.parse(a.started_at) - Date.parse(b.started_at) || a.id.localeCompare(b.id),
      )
      const totalMs = sessions.reduce((total, row) => total + Math.max(0, row.focus_ms), 0)
      return { sessions, totalMs }
    },
  })
  return { ...query, available: repository !== null, account: repository?.mode === 'account' }
}

export function useRefreshFocusHistory(pending: PendingFocusSave[] | null | undefined) {
  const client = useQueryClient()
  const generation = useSession((state) => state.generation)

  useEffect(() => {
    if (!pending) return
    const queryKey = historyKey(generation)
    // A completed delivery can arrive during the first read, even before this observer mounts.
    void client.cancelQueries({ queryKey }).then(() => client.invalidateQueries({ queryKey }))
  }, [client, generation, pending])
}
