import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { Card } from '@/components/ui'
import { ChevronDownIcon } from '@/components/ui/icons'

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
  const sectionId = (id: string) => `${page}-${id}`

  return (
    <StandalonePage wide>
      <Link
        to="/"
        className="-ml-2 inline-flex min-h-touch items-center gap-1.5 self-start rounded-md px-2 font-medium text-primary underline-offset-4 hover:underline"
      >
        <ChevronDownIcon className="size-5 rotate-90" />
        {t('common.backHome')}
      </Link>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 [overflow-wrap:anywhere] lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-x-12">
        <header className="flex max-w-[34em] flex-col gap-3 lg:col-start-2">
          <PageHeading>{t(`pages.${page}.title`)}</PageHeading>
          <p className="text-sm text-muted">{t('legal.updated')}</p>
          <p className="text-pretty text-lg leading-relaxed">{t(`legal.${page}.intro`)}</p>
        </header>
        <nav
          aria-labelledby={sectionId('contents')}
          className="lg:sticky lg:top-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:max-h-[calc(100dvh-3rem)] lg:self-start lg:overflow-y-auto"
        >
          <Card className="flex max-w-[34em] flex-col gap-1 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <h2 id={sectionId('contents')} className="text-sm font-semibold text-muted">
              {t('legal.onThisPage')}
            </h2>
            <ol className="flex flex-col">
              {sections.map(({ id, title }) => (
                <li key={id}>
                  {/* A router Link (not a bare #hash) so ScrollRestoration scrolls to the section. */}
                  <Link
                    to={{ hash: sectionId(id) }}
                    onClick={() => document.getElementById(sectionId(id))?.focus()}
                    className="-mx-2 flex min-h-touch items-center rounded-md px-2 py-2 leading-snug text-ink hover:bg-subtle"
                  >
                    {title}
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </nav>
        <div className="flex flex-col lg:col-start-2">
          {sections.map(({ id, title, body, items }) => (
            <section
              key={id}
              id={sectionId(id)}
              aria-labelledby={`${sectionId(id)}-title`}
              tabIndex={-1}
              className="flex max-w-[34em] scroll-mt-6 flex-col gap-3 border-t-hairline border-border-subtle py-6 first:border-t-0 first:pt-0 focus-visible:outline-none"
            >
              <h2
                id={`${sectionId(id)}-title`}
                className="text-balance text-xl font-semibold leading-snug tracking-tight"
              >
                {title}
              </h2>
              <p className="text-pretty leading-relaxed">{body}</p>
              {items && (
                <ul className="flex list-disc flex-col gap-2 pl-5 leading-relaxed marker:text-muted">
                  {items.map((item) => (
                    <li key={item} className="text-pretty pl-1">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </StandalonePage>
  )
}

export function PrivacyPage() {
  return <LegalPage page="privacy" />
}

export function TermsPage() {
  return <LegalPage page="terms" />
}
