import { useTranslation } from 'react-i18next'
import { ActionToast } from '@/components/ui'
import type { TodayTodo } from './types'

export interface UndoDeleteToastProps {
  pending: TodayTodo | null
  onUndo: () => void
  error?: string | null
}

/** "Deleted <title> … Undo" shown for 5 seconds after deleting a to-do. */
export function UndoDeleteToast({ pending, onUndo, error }: UndoDeleteToastProps) {
  const { t } = useTranslation()

  if (error) {
    return <ActionToast message={error} tone="danger" />
  }

  return (
    <ActionToast
      message={pending ? t('today.todoDeleted', { title: pending.title }) : null}
      actionLabel={pending ? t('today.undo') : undefined}
      onAction={pending ? onUndo : undefined}
      truncate
    />
  )
}
