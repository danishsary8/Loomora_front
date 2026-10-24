import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  const { t } = useTranslation()
  return (
    <Card role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
      <h2 className="text-lg font-bold">{title ?? t('states.errorTitle')}</h2>
      <p className="text-muted">{message ?? t('states.errorMessage')}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-2">
          {t('common.retry')}
        </Button>
      )}
    </Card>
  )
}
