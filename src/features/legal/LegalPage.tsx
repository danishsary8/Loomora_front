import { useTranslation } from 'react-i18next'
import { PageHeading, StandalonePage } from '@/components/page'

interface LegalSectionView {
  id: string
  title: string
  body: string
  items?: readonly string[]
}

function useLegalSections(page: 'privacy' | 'terms'): LegalSectionView[] {
  const { t } = useTranslation()

  if (page === 'privacy') {
    return [
      {
        id: 's1',
        title: t('legal.privacy.s1.title'),
        body: t('legal.privacy.s1.body'),
        items: [t('legal.privacy.s1.items.i1'), t('legal.privacy.s1.items.i2')],
      },
      {
        id: 's2',
        title: t('legal.privacy.s2.title'),
        body: t('legal.privacy.s2.body'),
        items: [
          t('legal.privacy.s2.items.i1'),
          t('legal.privacy.s2.items.i2'),
          t('legal.privacy.s2.items.i3'),
          t('legal.privacy.s2.items.i4'),
        ],
      },
      {
        id: 's3',
        title: t('legal.privacy.s3.title'),
        body: t('legal.privacy.s3.body'),
      },
      {
        id: 's4',
        title: t('legal.privacy.s4.title'),
        body: t('legal.privacy.s4.body'),
        items: [
          t('legal.privacy.s4.items.i1'),
          t('legal.privacy.s4.items.i2'),
          t('legal.privacy.s4.items.i3'),
          t('legal.privacy.s4.items.i4'),
          t('legal.privacy.s4.items.i5'),
          t('legal.privacy.s4.items.i6'),
        ],
      },
      {
        id: 's5',
        title: t('legal.privacy.s5.title'),
        body: t('legal.privacy.s5.body'),
        items: [t('legal.privacy.s5.items.i1'), t('legal.privacy.s5.items.i2')],
      },
      {
        id: 's6',
        title: t('legal.privacy.s6.title'),
        body: t('legal.privacy.s6.body'),
        items: [
          t('legal.privacy.s6.items.i1'),
          t('legal.privacy.s6.items.i2'),
          t('legal.privacy.s6.items.i3'),
          t('legal.privacy.s6.items.i4'),
        ],
      },
      {
        id: 's7',
        title: t('legal.privacy.s7.title'),
        body: t('legal.privacy.s7.body'),
      },
    ]
  }

  return [
    {
      id: 's1',
      title: t('legal.terms.s1.title'),
      body: t('legal.terms.s1.body'),
    },
    {
      id: 's2',
      title: t('legal.terms.s2.title'),
      body: t('legal.terms.s2.body'),
      items: [t('legal.terms.s2.items.i1'), t('legal.terms.s2.items.i2')],
    },
    {
      id: 's3',
      title: t('legal.terms.s3.title'),
      body: t('legal.terms.s3.body'),
    },
    {
      id: 's4',
      title: t('legal.terms.s4.title'),
      body: t('legal.terms.s4.body'),
    },
    {
      id: 's5',
      title: t('legal.terms.s5.title'),
      body: t('legal.terms.s5.body'),
    },
    {
      id: 's6',
      title: t('legal.terms.s6.title'),
      body: t('legal.terms.s6.body'),
    },
  ]
}

// S13 legal pages: plain English, and only what the app really does today.
function LegalPage({ page }: { page: 'privacy' | 'terms' }) {
  const { t } = useTranslation()
  const sections = useLegalSections(page)

  return (
    <StandalonePage>
      <header className="flex flex-col gap-2">
        <PageHeading>{t(`pages.${page}.title`)}</PageHeading>
        <p className="text-sm text-muted">{t('legal.updated')}</p>
      </header>
      <p className="text-lg leading-relaxed">{t(`legal.${page}.intro`)}</p>
      {sections.map(({ id, title, body, items }) => (
        <section key={id} className="flex flex-col gap-2">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="leading-relaxed">{body}</p>
          {items && (
            <ul className="flex list-disc flex-col gap-1.5 pl-5 leading-relaxed">
              {items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
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
