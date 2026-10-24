import { useTranslation } from 'react-i18next'
import { PageHeading, StandalonePage } from '@/components/page'
import { EmptyState } from '@/components/states'

// S13 legal pages. The legal text itself is not written yet (docs/07 S11).
function LegalPage({ page }: { page: 'privacy' | 'terms' }) {
  const { t } = useTranslation()
  return (
    <StandalonePage>
      <PageHeading>{t(`pages.${page}.title`)}</PageHeading>
      <EmptyState title={t('common.comingSoon')} />
    </StandalonePage>
  )
}

export function PrivacyPage() {
  return <LegalPage page="privacy" />
}

export function TermsPage() {
  return <LegalPage page="terms" />
}
