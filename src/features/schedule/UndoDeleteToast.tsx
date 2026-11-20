import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import type { DeleteRequest } from './useUndoableDelete'

export interface UndoDeleteToastProps {
  pending: DeleteRequest | null
  onUndo: () => void
  error?: boolean
  aboveTodoToast?: boolean
}

/** "Deleted … Undo" shown for 5 seconds after a delete. */
export function UndoDeleteToast({ pending, onUndo, error, aboveTodoToast }: UndoDeleteToastProps) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4',
        aboveTodoToast ? 'bottom-44' : 'bottom-24',
      )}
    >
      {pending && (
        <div className="pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-md border-thick border-ink bg-paper p-3 shadow-hard-md">
          <span className="font-semibold">
            {t('scheduleForm.deleted', { title: pending.item.title })}
          </span>
          <Button variant="secondary" onClick={onUndo}>
            {t('scheduleForm.undo')}
          </Button>
        </div>
      )}
      {!pending && error && (
        <div className="pointer-events-auto w-full max-w-sm rounded-md border-thick border-ink bg-paper p-3 font-semibold text-danger shadow-hard-md">
          {t('scheduleForm.deleteError')}
        </div>
      )}
    </div>
  )
}
