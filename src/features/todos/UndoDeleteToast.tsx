import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import type { TodayTodo } from './types'

export interface UndoDeleteToastProps {
  pending: TodayTodo | null
  onUndo: () => void
  error?: string | null
}

/** "Deleted <title> … Undo" shown for 5 seconds after deleting a to-do. */
export function UndoDeleteToast({ pending, onUndo, error }: UndoDeleteToastProps) {
  const { t } = useTranslation()

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4"
    >
      {error ? (
        <div className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-md border-thick border-ink bg-paper p-3 shadow-hard-md">
          <span className="font-semibold text-danger">{error}</span>
        </div>
      ) : pending ? (
        <div className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-md border-thick border-ink bg-paper p-3 shadow-hard-md">
          <span className="truncate font-semibold">
            {t('today.todoDeleted', { title: pending.title })}
          </span>
          <Button variant="secondary" onClick={onUndo}>
            {t('today.undo')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
