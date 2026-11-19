import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { streakKeys } from '@/features/streak/useStreak'
import { useTodoRepository } from '@/lib/storage'
import type { LocalDate, TodayTodo } from './types'
import { todoKeys } from './useTodos'

export const UNDO_DELETE_DELAY_MS = 5000

export interface UseUndoableDeleteOptions {
  date: LocalDate
  delayMs?: number
}

interface DeletedSnapshot {
  previous: TodayTodo[]
  item: TodayTodo
  index: number
}

export function useUndoableDelete({
  date,
  delayMs = UNDO_DELETE_DELAY_MS,
}: UseUndoableDeleteOptions) {
  const { t } = useTranslation()
  const repo = useTodoRepository()
  const queryClient = useQueryClient()
  const [pending, setPending] = useState<TodayTodo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const snapshotRef = useRef<DeletedSnapshot | null>(null)
  const isRestoringRef = useRef(false)
  const deletePromiseRef = useRef<Promise<void> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = undefined
    }
  }

  const deleteTodo = useCallback(
    async (todo: TodayTodo) => {
      clearTimer()
      setError(null)
      isRestoringRef.current = false

      const key = todoKeys.today(date)
      await queryClient.cancelQueries({ queryKey: key })

      const previous = queryClient.getQueryData<TodayTodo[]>(key) ?? []
      const index = previous.findIndex((t) => t.id === todo.id)

      snapshotRef.current = { previous, item: todo, index }
      setPending(todo)

      // Optimistically remove from query cache
      queryClient.setQueryData<TodayTodo[]>(key, (list) =>
        list?.filter((t) => t.id !== todo.id) ?? [],
      )

      timerRef.current = setTimeout(() => {
        setPending(null)
        snapshotRef.current = null
      }, delayMs)

      const deletePromise = repo.delete(todo.id)
      deletePromiseRef.current = deletePromise

      try {
        await deletePromise
        void queryClient.invalidateQueries({ queryKey: streakKeys.all })
      } catch {
        clearTimer()
        setPending(null)
        if (snapshotRef.current?.previous) {
          queryClient.setQueryData(key, snapshotRef.current.previous)
        }
        snapshotRef.current = null
        setError(t('today.deleteError'))
      }
    },
    [date, delayMs, queryClient, repo, t],
  )

  const undo = useCallback(async () => {
    if (isRestoringRef.current) return
    isRestoringRef.current = true
    clearTimer()

    const snapshot = snapshotRef.current
    const item = pending
    if (!item) {
      isRestoringRef.current = false
      return
    }

    setPending(null)
    snapshotRef.current = null

    try {
      if (deletePromiseRef.current) {
        await deletePromiseRef.current.catch(() => {})
      }
      const restored = await repo.restore(item.id)
      const key = todoKeys.today(date)
      queryClient.setQueryData<TodayTodo[]>(key, (list) => {
        if (!list) return [{ ...item, ...restored }]
        if (list.some((t) => t.id === item.id)) return list
        const next = [...list]
        const targetIndex =
          snapshot?.index !== undefined && snapshot.index >= 0
            ? Math.min(snapshot.index, next.length)
            : next.length
        next.splice(targetIndex, 0, { ...item, ...restored })
        return next
      })
      void queryClient.invalidateQueries({ queryKey: streakKeys.all })
    } catch {
      setError(t('today.saveError'))
    } finally {
      isRestoringRef.current = false
    }
  }, [date, pending, queryClient, repo, t])

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    return () => clearTimer()
  }, [])

  return {
    pending,
    error,
    deleteTodo,
    undo,
    clearError,
  }
}
