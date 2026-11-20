import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from '@/lib/api'
import { useScheduleRepository, type ScheduleRepository } from '@/lib/storage'
import { refreshSchedule } from './useSchedule'
import type { ScheduleItem } from './types'
import type { LocalDate } from '@/features/todos/types'

/** How long Undo is offered before a delete is final. */
export const UNDO_DELAY_MS = 5000

/** What to delete: every repeat, or only one day (a skip exception, docs/08 rule 5). */
export type DeleteRequest =
  { scope: 'all'; item: ScheduleItem } | { scope: 'today'; item: ScheduleItem; date: LocalDate }

interface PendingDelete {
  request: DeleteRequest
  generation: number
}

function run(repo: ScheduleRepository, request: DeleteRequest): Promise<unknown> {
  return request.scope === 'all'
    ? repo.delete(request.item.id)
    : repo.setException(request.item.id, request.date, { type: 'skip' })
}

/**
 * Delete with a 5-second undo. Nothing is written until the delay ends; hosts hide the
 * `pending` target from their lists meanwhile. A new request, or leaving the screen,
 * commits the pending delete at once when the original session is still active.
 */
export function useUndoableDelete(delayMs: number = UNDO_DELAY_MS) {
  const repo = useScheduleRepository()
  const generation = useSession((state) => state.generation)
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const [committing, setCommitting] = useState<PendingDelete[]>([])
  const [failedGeneration, setFailedGeneration] = useState<number | null>(null)
  const pendingRef = useRef<PendingDelete | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const clearPending = useCallback(() => {
    clearTimeout(timer.current)
    pendingRef.current = null
    setPending(null)
  }, [])

  const commit = useCallback(
    async (entry: PendingDelete | null) => {
      if (!entry || entry !== pendingRef.current || entry.generation !== generation) return
      clearPending()
      if (useSession.getState().generation !== generation) return

      setCommitting((entries) => [...entries, entry])
      try {
        await run(repo, entry.request)
        await refreshSchedule(queryClient, repo, generation)
      } catch {
        if (useSession.getState().generation === generation) setFailedGeneration(generation)
      } finally {
        setCommitting((entries) => entries.filter((current) => current !== entry))
      }
    },
    [clearPending, generation, queryClient, repo],
  )

  function undo() {
    if (
      pending === pendingRef.current &&
      pending?.generation === useSession.getState().generation
    ) {
      clearPending()
    }
  }

  function request(next: DeleteRequest) {
    if (useSession.getState().generation !== generation) return
    void commit(pendingRef.current)
    const entry = { request: next, generation }
    pendingRef.current = entry
    setPending(entry)
    setFailedGeneration(null)
    timer.current = setTimeout(() => void commit(entry), delayMs)
  }

  function isDeleting(id: string, date?: LocalDate) {
    return [pending, ...committing].some(
      (entry) =>
        entry?.generation === generation &&
        entry.request.item.id === id &&
        (entry.request.scope === 'all' || entry.request.date === date),
    )
  }

  useEffect(() => () => void commit(pendingRef.current), [commit])

  return {
    pending: pending?.generation === generation ? pending.request : null,
    error: failedGeneration === generation,
    isDeleting,
    request,
    undo,
  }
}
