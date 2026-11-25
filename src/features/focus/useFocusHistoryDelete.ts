import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ApiError, useSession } from '@/lib/api'
import { FocusSessionRepositoryContext } from '@/lib/storage/focusSessionContext'
import type { FocusSession } from './types'
import { buildFocusHistoryData, focusHistoryDayKey, type FocusHistoryData } from './useFocusHistory'

const UNDO_WINDOW_MS = 5000
const ERROR_TOAST_MS = 5000

interface UndoEntry {
  session: FocusSession
  generation: number
}

/**
 * Manages Focus History deletion and 5-second Undo restoration (B-046 / F-R3-14).
 * Removes a session from active History only after delete succeeds (204 or Dexie soft-delete),
 * guards against double submissions, and isolates state by auth session generation.
 */
export function useFocusHistoryDelete() {
  const { t } = useTranslation()
  const repository = useContext(FocusSessionRepositoryContext)
  const queryClient = useQueryClient()
  const generation = useSession((state) => state.generation)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [undoEntry, setUndoEntry] = useState<UndoEntry | null>(null)
  const [restoring, setRestoring] = useState(false)
  const [toastError, setToastError] = useState<string | null>(null)

  const deletingRef = useRef<string | null>(null)
  const restoringRef = useRef(false)
  const undoEntryRef = useRef<UndoEntry | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const errorTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const showToastError = useCallback((message: string) => {
    clearTimeout(errorTimer.current)
    setToastError(message)
    errorTimer.current = setTimeout(() => setToastError(null), ERROR_TOAST_MS)
  }, [])

  const clearDeleteError = useCallback(() => {
    setDeleteError(null)
  }, [])

  const confirmDelete = useCallback(
    async (session: FocusSession): Promise<boolean> => {
      const sameSession = () => useSession.getState().generation === generation
      if (!repository || !sameSession() || deletingRef.current !== null) return false

      const id = session.id.toLowerCase()
      deletingRef.current = id
      setDeletingId(id)
      setDeleteError(null)

      try {
        await repository.delete(session.id)
        if (!sameSession()) return false

        const dayKey = focusHistoryDayKey(generation, session.local_date)
        await queryClient.cancelQueries({ queryKey: dayKey })
        if (!sameSession()) return false

        queryClient.setQueryData<FocusHistoryData>(dayKey, (current) => {
          if (!current) return current
          const remaining = current.sessions.filter((row) => row.id.toLowerCase() !== id)
          return buildFocusHistoryData(remaining, session.local_date)
        })

        clearTimeout(errorTimer.current)
        setToastError(null)
        clearTimeout(undoTimer.current)
        const nextUndo: UndoEntry = { session, generation }
        undoEntryRef.current = nextUndo
        setUndoEntry(nextUndo)
        undoTimer.current = setTimeout(() => {
          if (undoEntryRef.current !== nextUndo) return
          undoEntryRef.current = null
          setUndoEntry(null)
        }, UNDO_WINDOW_MS)

        return true
      } catch (error) {
        if (!sameSession()) return false
        if (error instanceof ApiError) {
          if (error.status === 404) {
            setDeleteError(t('focus.history.deleteNotFound'))
            void queryClient.invalidateQueries({
              queryKey: focusHistoryDayKey(generation, session.local_date),
            })
          } else if (error.status === 429) {
            setDeleteError(t('focus.history.rateLimited'))
          } else if (error.status === 0) {
            setDeleteError(t('focus.history.deleteOffline'))
          } else {
            setDeleteError(t('focus.history.deleteError'))
          }
        } else {
          setDeleteError(t('focus.history.deleteError'))
        }
        return false
      } finally {
        if (deletingRef.current === id) {
          deletingRef.current = null
          setDeletingId(null)
        }
      }
    },
    [generation, queryClient, repository, t],
  )

  const undoDelete = useCallback(async () => {
    const entry = undoEntryRef.current
    const sameSession = () => useSession.getState().generation === generation
    if (!repository || !entry || entry.generation !== generation || !sameSession()) return
    if (restoringRef.current) return

    restoringRef.current = true
    setRestoring(true)
    clearTimeout(undoTimer.current)

    try {
      const restored = await repository.restore(entry.session.id)
      if (!sameSession()) return

      const dayKey = focusHistoryDayKey(generation, restored.local_date)
      await queryClient.cancelQueries({ queryKey: dayKey })
      if (!sameSession()) return

      queryClient.setQueryData<FocusHistoryData>(dayKey, (current) => {
        const existing = current?.sessions ?? []
        return buildFocusHistoryData([...existing, restored], restored.local_date)
      })

      if (undoEntryRef.current === entry) {
        undoEntryRef.current = null
        setUndoEntry(null)
      }
    } catch (error) {
      if (!sameSession()) return
      if (undoEntryRef.current === entry) {
        undoEntryRef.current = null
        setUndoEntry(null)
      }
      if (error instanceof ApiError && error.status === 410) {
        showToastError(t('focus.history.restoreExpired'))
      } else if (error instanceof ApiError && error.status === 404) {
        showToastError(t('focus.history.restoreNotFound'))
      } else if (error instanceof ApiError && error.status === 429) {
        showToastError(t('focus.history.rateLimited'))
      } else {
        showToastError(t('focus.history.restoreError'))
      }
      void queryClient.invalidateQueries({
        queryKey: focusHistoryDayKey(generation, entry.session.local_date),
      })
    } finally {
      restoringRef.current = false
      setRestoring(false)
    }
  }, [generation, queryClient, repository, showToastError, t])

  useEffect(
    () => () => {
      clearTimeout(undoTimer.current)
      clearTimeout(errorTimer.current)
    },
    [],
  )

  return {
    deletingId,
    deleteError,
    clearDeleteError,
    confirmDelete,
    undoSession: undoEntry?.generation === generation ? undoEntry.session : null,
    restoring,
    undoDelete,
    toastError,
  }
}
