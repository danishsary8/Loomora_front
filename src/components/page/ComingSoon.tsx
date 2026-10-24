import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { PageHeading } from './PageHeading'

/** docs/05: Focus and Insights show a "Coming soon" screen in R1. */
export function ComingSoon({ title, message }: { title: string; message: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{title}</PageHeading>
      <Card tone="work" className="flex flex-col gap-2">
        <p className="text-lg font-bold">{t('common.comingSoon')}</p>
        <p>{message}</p>
      </Card>
    </div>
  )
}
