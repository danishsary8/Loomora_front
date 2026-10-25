import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { StandalonePage } from '@/components/page'
import { buttonClasses, Card } from '@/components/ui'
import type { Category } from '@/styles/tokens'

const HIGHLIGHTS: readonly { id: 'plan' | 'now' | 'streak'; tone: Category }[] = [
  { id: 'plan', tone: 'study' },
  { id: 'now', tone: 'work' },
  { id: 'streak', tone: 'life' },
]

/** S1 Landing: promise, "Try it now" (guest mode), Sign in, three highlights. */
export function LandingPage() {
  const { t } = useTranslation()
  return (
    <StandalonePage wide>
      <div className="flex flex-1 flex-col justify-center gap-10">
        <div className="flex flex-col gap-6 md:max-w-lg">
          <h1 className="font-script text-7xl font-bold leading-none">{t('common.appName')}</h1>
          <p className="text-xl font-semibold">{t('common.promise')}</p>
          <div className="flex flex-col gap-3">
            <Link
              to="/today"
              className={buttonClasses({ as: 'link', size: 'lg', fullWidth: true })}
            >
              {t('landing.tryItNow')}
            </Link>
            <p className="text-center text-sm text-muted">{t('landing.noSignup')}</p>
            <Link
              to="/sign-in"
              className={buttonClasses({ as: 'link', variant: 'secondary', fullWidth: true })}
            >
              {t('landing.signIn')}
            </Link>
          </div>
        </div>
        <section aria-labelledby="highlights-heading">
          <h2 id="highlights-heading" className="sr-only">
            {t('landing.highlightsLabel')}
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {HIGHLIGHTS.map(({ id, tone }) => (
              <li key={id}>
                <Card tone={tone} className="h-full">
                  <h3 className="text-lg font-bold">{t(`landing.highlights.${id}.title`)}</h3>
                  <p>{t(`landing.highlights.${id}.body`)}</p>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </StandalonePage>
  )
}
