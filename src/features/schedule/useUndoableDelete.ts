import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useScheduleRepository, type ScheduleRepository } from '@/lib/storage'
import { scheduleKeys } from './useSchedule'
import type { ScheduleItem } from './types'
import type { LocalDate } from '@/features/todos/types'

/** How long Undo is offered before a delete is final. */
export const UNDO_DELAY_MS = 5000

/** What to delete: every repeat, or only one day (a skip exception, docs/08 rule 5). */
export type DeleteRequest =
  { scope: 'all'; item: ScheduleItem } | { scope: 'today'; item: ScheduleItem; date: LocalDate }

function run(repo: ScheduleRepository, request: DeleteRequest): Promise<unknown> {
  return request.scope === 'all'
    ? repo.delete(request.item.id)
    : repo.setException(request.item.id, request.date, { type: 'skip' })
}

/**
 * Delete with a 5-second undo. Nothing is written until the delay ends; hosts hide the
 * `pending` target from their lists meanwhile. A new request, or leaving the screen,
 * commits the pending delete at once.
 */
export function useUndoableDelete(delayMs: number = UNDO_DELAY_MS) {
  const repo = useScheduleRepository()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<DeleteRequest | null>(null)
  const pendingRef = useRef<DeleteRequest | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const commit = useCallback(async () => {
    clearTimeout(timer.current)
    const request = pendingRef.current
    if (!request) return
    pendingRef.current = null
    setPending(null)
    await run(repo, request)
    await queryClient.invalidateQueries({ queryKey: scheduleKeys.all })
  }, [repo, queryClient])

  const undo = useCallback(() => {
    clearTimeout(timer.current)
    pendingRef.current = null
    setPending(null)
  }, [])

  const request = useCallback(
    async (next: DeleteRequest) => {
      await commit()
      pendingRef.current = next
      setPending(next)
      timer.current = setTimeout(() => void commit(), delayMs)
    },
    [commit, delayMs],
  )

  // Leaving the screen makes a pending delete final instead of silently dropping it.
  useEffect(() => () => void commit(), [commit])

  return { pending, request, undo }
}
