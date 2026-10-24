import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { EmptyState } from '@/components/states'

// Placeholder until the schedule tasks (P6) build the Week screen.
export function WeekPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{t('pages.week.title')}</PageHeading>
      <EmptyState title={t('states.emptyTitle')} message={t('states.emptyMessage')} />
    </div>
  )
}
