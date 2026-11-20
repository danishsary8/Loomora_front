import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { streakKeys } from '@/features/streak/useStreak'
import { useSession } from '@/lib/api'
import { useTodoRepository } from '@/lib/storage'
import type { LocalDate, TodayTodo } from './types'
import { changeTodayTodo, insertTodayTodo } from './todayCache'
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
  generation: number
  /** Settles when the remove call ends; resolves to whether it succeeded. */
  removed: Promise<boolean>
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
  const generation = useSession((state) => state.generation)
  const key = todoKeys.today(date, generation)
  const [pending, setPending] = useState<PendingDelete | null>(null)
  const [error, setError] = useState<string | null>(null)

  const current = useRef<PendingDelete | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const restoring = useRef<PendingDelete | null>(null)

  const showError = useCallback((message: string) => {
    clearTimeout(errorTimer.current)
    setError(message)
    errorTimer.current = setTimeout(() => setError(null), ERROR_DELAY_MS)
  }, [])

  const deleteTodo = useCallback(
    async (todo: TodayTodo) => {
      const sameSession = () => useSession.getState().generation === generation
      if (!sameSession()) return
      clearTimeout(undoTimer.current)
      clearTimeout(errorTimer.current)
      setError(null)

      await queryClient.cancelQueries({ queryKey: key })
      if (!sameSession()) return
      const list = queryClient.getQueryData<TodayTodo[]>(key) ?? []
      const index = list.findIndex((row) => row.id === todo.id)
      queryClient.setQueryData<TodayTodo[]>(key, (rows) =>
        changeTodayTodo(rows ?? [], todo.id, () => null),
      )

      const removed = repo.delete(todo.id).then(
        () => true,
        () => false,
      )
      const entry: PendingDelete = { item: todo, index, generation, removed }
      current.current = entry
      setPending(entry)
      undoTimer.current = setTimeout(() => {
        if (current.current !== entry) return
        current.current = null
        setPending(null)
      }, delayMs)

      const succeeded = await removed
      if (!sameSession()) return
      if (succeeded) {
        void queryClient.invalidateQueries({ queryKey: streakKeys.all })
        void queryClient.invalidateQueries({ queryKey: todoKeys.due })
        return
      }
      queryClient.setQueryData<TodayTodo[]>(key, (list) => insertTodayTodo(list ?? [], todo, index))
      if (current.current === entry) {
        clearTimeout(undoTimer.current)
        current.current = null
        setPending(null)
      }
      showError(t('today.deleteError'))
    },
    [delayMs, generation, key, queryClient, repo, showError, t],
  )

  const undo = useCallback(async () => {
    const entry = current.current
    const sameSession = () => useSession.getState().generation === generation
    if (
      !entry ||
      entry.generation !== generation ||
      !sameSession() ||
      restoring.current?.generation === generation
    )
      return
    restoring.current = entry
    clearTimeout(undoTimer.current)
    current.current = null
    setPending(null)
    try {
      // A remove that has not finished must settle first, or restore could run before it.
      if (!(await entry.removed) || !sameSession()) return
      const restored = await repo.restore(entry.item.id)
      if (!sameSession()) return
      queryClient.setQueryData<TodayTodo[]>(key, (list) =>
        insertTodayTodo(list ?? [], { ...entry.item, ...restored }, entry.index),
      )
      void queryClient.invalidateQueries({ queryKey: streakKeys.all })
      void queryClient.invalidateQueries({ queryKey: todoKeys.due })
    } catch {
      if (!sameSession()) return
      void queryClient.invalidateQueries({ queryKey: key })
      showError(t('today.restoreError'))
    } finally {
      if (restoring.current === entry) restoring.current = null
    }
  }, [generation, key, queryClient, repo, showError, t])

  useEffect(
    () => () => {
      clearTimeout(undoTimer.current)
      clearTimeout(errorTimer.current)
    },
    [],
  )

  return {
    pending: pending?.generation === generation ? pending.item : null,
    error,
    deleteTodo,
    undo,
  }
}
