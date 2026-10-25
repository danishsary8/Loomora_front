import { useTranslation } from 'react-i18next'
import { PageHeading, StandalonePage } from '@/components/page'

const SECTION_IDS = ['s1', 's2', 's3', 's4', 's5'] as const

// S13 legal pages: plain English, and only what the app really does today.
function LegalPage({ page }: { page: 'privacy' | 'terms' }) {
  const { t } = useTranslation()
  return (
    <StandalonePage>
      <header className="flex flex-col gap-2">
        <PageHeading>{t(`pages.${page}.title`)}</PageHeading>
        <p className="text-sm text-muted">{t('legal.updated')}</p>
      </header>
      <p className="text-lg">{t(`legal.${page}.intro`)}</p>
      {SECTION_IDS.map((id) => (
        <section key={id} className="flex flex-col gap-1">
          <h2 className="text-xl font-bold">{t(`legal.${page}.${id}.title`)}</h2>
          <p>{t(`legal.${page}.${id}.body`)}</p>
        </section>
      ))}
    </StandalonePage>
  )
}

export function PrivacyPage() {
  return <LegalPage page="privacy" />
}

export function TermsPage() {
  return <LegalPage page="terms" />
}
