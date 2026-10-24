import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { EmptyState } from '@/components/states'

// Placeholder until F-006 builds the Today screen.
export function TodayPage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{t('pages.today.title')}</PageHeading>
      <EmptyState title={t('states.emptyTitle')} message={t('states.emptyMessage')} />
    </div>
  )
}
