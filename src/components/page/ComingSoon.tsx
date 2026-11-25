import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { PageHeading } from './PageHeading'

/** Placeholder screen for upcoming release surfaces (e.g. R4 Insights). */
export function ComingSoon({ title, message }: { title: string; message: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{title}</PageHeading>
      <Card className="flex flex-col items-start gap-3">
        <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
          {t('common.comingSoon')}
        </span>
        <p className="text-sm leading-relaxed text-muted">{message}</p>
      </Card>
    </div>
  )
}
