import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  action?: ReactNode
}

export function ErrorState({ title, message, onRetry, action }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <Card role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
      <h2 className="text-lg font-bold">{title ?? t('states.errorTitle')}</h2>
      <p className="text-muted">{message ?? t('states.errorMessage')}</p>
      {(onRetry || action) && (
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              {t('common.retry')}
            </Button>
          )}
          {action}
        </div>
      )}
    </Card>
  )
}
