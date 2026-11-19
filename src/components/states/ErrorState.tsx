import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  /** Extra actions shown after Try again, e.g. a link home. */
  actions?: ReactNode
}

export function ErrorState({ title, message, onRetry, actions }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <Card role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
      <h2 className="text-lg font-bold">{title ?? t('states.errorTitle')}</h2>
      <p className="text-muted">{message ?? t('states.errorMessage')}</p>
      {(onRetry || actions) && (
        <div className="mt-2 flex w-full flex-col gap-3">
          {onRetry && (
            <Button variant="secondary" fullWidth onClick={onRetry}>
              {t('common.retry')}
            </Button>
          )}
          {actions}
        </div>
      )}
    </Card>
  )
}
