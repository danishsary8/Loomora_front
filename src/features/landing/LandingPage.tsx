import type { ComponentType, SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { StandalonePage } from '@/components/page'
import { buttonClasses, Card } from '@/components/ui'
import { StreakIcon, TodayIcon, WeekIcon } from '@/components/ui/icons'
import type { Category } from '@/styles/tokens'

// Each highlight borrows the nav icon of the screen it describes.
const HIGHLIGHTS: readonly {
  id: 'plan' | 'now' | 'streak'
  tone: Category
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { id: 'plan', tone: 'study', Icon: WeekIcon },
  { id: 'now', tone: 'work', Icon: TodayIcon },
  { id: 'streak', tone: 'life', Icon: StreakIcon },
]

/** S1 Landing: promise, "Try it now" (guest mode), Sign in, three highlights. */
export function LandingPage() {
  const { t } = useTranslation()
  return (
    <StandalonePage wide>
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] content-center gap-10 py-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:gap-12 md:py-10">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-4">
            <h1 className="font-heading text-[length:clamp(2.125rem,14vw,3.75rem)] font-bold leading-none text-ink [overflow-wrap:anywhere]">
              {t('common.appName')}
            </h1>
            <p className="max-w-md text-xl font-medium leading-snug text-ink sm:text-2xl">
              {t('common.promise')}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:max-w-sm">
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
          <ul className="grid gap-3">
            {HIGHLIGHTS.map(({ id, tone, Icon }) => (
              <li key={id}>
                <Card tone={tone} className="flex h-full flex-wrap items-start gap-x-4 gap-y-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-paper/80 text-ink">
                    <Icon className="size-6" />
                  </span>
                  <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1 [overflow-wrap:anywhere]">
                    <h3 className="text-lg font-semibold leading-snug tracking-tight">
                      {t(`landing.highlights.${id}.title`)}
                    </h3>
                    <p className="leading-relaxed">{t(`landing.highlights.${id}.body`)}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </StandalonePage>
  )
}
