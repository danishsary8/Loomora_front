import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { EmptyState } from '@/components/states'

// Placeholder until the account tasks (P4) build Profile.
export function ProfilePage() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{t('pages.profile.title')}</PageHeading>
      <EmptyState title={t('states.emptyTitle')} message={t('states.emptyMessage')} />
    </div>
  )
}
