import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/cn'

/** "Loomora." wordmark: forest ink with the restrained terracotta full stop from the concept. */
export function Wordmark({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <p className={cn('font-heading font-bold leading-none tracking-tight text-ink', className)}>
      {t('common.appName')}
      <span aria-hidden="true" className="text-accent">
        .
      </span>
    </p>
  )
}
