import { useTranslation } from 'react-i18next'
import { ActionToast } from '@/components/ui'
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

  if (pending) {
    return (
      <ActionToast
        message={t('scheduleForm.deleted', { title: pending.item.title })}
        actionLabel={t('scheduleForm.undo')}
        onAction={onUndo}
        stacked={aboveTodoToast}
      />
    )
  }

  return (
    <ActionToast
      message={error ? t('scheduleForm.deleteError') : null}
      tone="danger"
      stacked={aboveTodoToast}
    />
  )
}
