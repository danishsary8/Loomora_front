import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import type { DeleteRequest } from './useUndoableDelete'

export interface UndoDeleteToastProps {
  pending: DeleteRequest | null
  onUndo: () => void
}

/** "Deleted … Undo" shown for 5 seconds after a delete. */
export function UndoDeleteToast({ pending, onUndo }: UndoDeleteToastProps) {
  const { t } = useTranslation()
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-40 flex justify-center px-4"
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
    </div>
  )
}
