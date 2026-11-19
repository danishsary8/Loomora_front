import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { streakKeys } from '@/features/streak/useStreak'
import { useTodoRepository } from '@/lib/storage'
import type { LocalDate, TodayTodo } from './types'
import { todoKeys } from './useTodos'

export const UNDO_DELETE_DELAY_MS = 5000
const ERROR_DELAY_MS = 5000

export interface UseUndoableDeleteOptions {
  date: LocalDate
  delayMs?: number
}

interface PendingDelete {
  item: TodayTodo
  index: number
  /** Settles when the remove call ends; resolves to whether it succeeded. */
  removed: Promise<boolean>
}

function insertAt(list: TodayTodo[] | undefined, item: TodayTodo, index: number): TodayTodo[] {
  const current = list ?? []
  if (current.some((t) => t.id === item.id)) return current
  const next = [...current]
  next.splice(index >= 0 ? Math.min(index, next.length) : next.length, 0, item)
  return next
}

/**
 * Delete with a short Undo window. The row leaves the cache at once. Only the latest
 * delete offers Undo; an earlier one is final. A failed remove puts only its own row
 * back, and a failed restore leaves the row deleted and says so.
 */
export function useUndoableDelete({
  date,
  delayMs = UNDO_DELETE_DELAY_MS,
}: UseUndoableDeleteOptions) {
  const { t } = useTranslation()
  const repo = useTodoRepository()
  const queryClient = useQueryClient()
  const key = todoKeys.today(date)
  const [pending, setPending] = useState<TodayTodo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const current = useRef<PendingDelete | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const restoring = useRef(false)

  const showError = useCallback((message: string) => {
    clearTimeout(errorTimer.current)
    setError(message)
    errorTimer.current = setTimeout(() => setError(null), ERROR_DELAY_MS)
  }, [])

  const deleteTodo = useCallback(
    async (todo: TodayTodo) => {
      clearTimeout(undoTimer.current)
      clearTimeout(errorTimer.current)
      setError(null)

      await queryClient.cancelQueries({ queryKey: key })
      const index = (queryClient.getQueryData<TodayTodo[]>(key) ?? []).findIndex(
        (row) => row.id === todo.id,
      )
      queryClient.setQueryData<TodayTodo[]>(key, (list) =>
        (list ?? []).filter((row) => row.id !== todo.id),
      )

      const removed = repo.delete(todo.id).then(
        () => true,
        () => false,
      )
      const entry: PendingDelete = { item: todo, index, removed }
      current.current = entry
      setPending(todo)
      undoTimer.current = setTimeout(() => {
        if (current.current !== entry) return
        current.current = null
        setPending(null)
      }, delayMs)

      if (await removed) {
        void queryClient.invalidateQueries({ queryKey: streakKeys.all })
        return
      }
      queryClient.setQueryData<TodayTodo[]>(key, (list) => insertAt(list, todo, index))
      if (current.current === entry) {
        clearTimeout(undoTimer.current)
        current.current = null
        setPending(null)
      }
      showError(t('today.deleteError'))
    },
    [delayMs, key, queryClient, repo, showError, t],
  )

  const undo = useCallback(async () => {
    const entry = current.current
    if (!entry || restoring.current) return
    restoring.current = true
    clearTimeout(undoTimer.current)
    current.current = null
    setPending(null)
    try {
      // A remove that has not finished must settle first, or restore could run before it.
      if (!(await entry.removed)) return
      const restored = await repo.restore(entry.item.id)
      queryClient.setQueryData<TodayTodo[]>(key, (list) =>
        insertAt(list, { ...entry.item, ...restored }, entry.index),
      )
      void queryClient.invalidateQueries({ queryKey: streakKeys.all })
    } catch {
      void queryClient.invalidateQueries({ queryKey: key })
      showError(t('today.restoreError'))
    } finally {
      restoring.current = false
    }
  }, [key, queryClient, repo, showError, t])

  useEffect(
    () => () => {
      clearTimeout(undoTimer.current)
      clearTimeout(errorTimer.current)
    },
    [],
  )

  return { pending, error, deleteTodo, undo }
}
