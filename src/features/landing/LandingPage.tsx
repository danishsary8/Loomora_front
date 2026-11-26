import type { ComponentType, SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { StandalonePage } from '@/components/page'
import { buttonClasses, Card } from '@/components/ui'
import { BrandMark, StreakIcon, TodayIcon, WeekIcon } from '@/components/ui/icons'
import { cn } from '@/lib/cn'
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
      <div className="grid flex-1 grid-cols-[minmax(0,1fr)] content-center gap-10 py-6 md:grid-cols-[minmax(0,1.08fr)_minmax(0,1fr)] md:items-center md:gap-14 md:py-12">
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3.5">
              <BrandMark className="size-11 shrink-0 rounded-md shadow-soft-sm sm:size-12" />
              <h1 className="font-heading text-[length:clamp(2.125rem,13vw,3.5rem)] font-bold leading-none tracking-[-0.03em] text-ink [overflow-wrap:anywhere]">
                {t('common.appName')}
                <span aria-hidden="true" className="text-accent">
                  .
                </span>
              </h1>
            </div>
            <p className="max-w-md text-lg font-medium leading-relaxed text-ink/90 sm:text-2xl sm:leading-snug">
              {t('common.promise')}
            </p>
          </div>
          <div className="flex flex-col gap-2.5 sm:max-w-sm">
            <Link
              to="/today"
              className={buttonClasses({ as: 'link', size: 'lg', fullWidth: true })}
            >
              {t('landing.tryItNow')}
            </Link>
            <p className="text-center text-xs font-medium text-muted">{t('landing.noSignup')}</p>
            <Link
              to="/sign-in"
              className={cn(
                buttonClasses({ as: 'link', variant: 'secondary', fullWidth: true }),
                'mt-1.5',
              )}
            >
              {t('landing.signIn')}
            </Link>
          </div>
        </div>
        <section aria-labelledby="highlights-heading">
          <h2 id="highlights-heading" className="sr-only">
            {t('landing.highlightsLabel')}
          </h2>
          <ul className="grid gap-3.5">
            {HIGHLIGHTS.map(({ id, tone, Icon }) => (
              <li key={id}>
                <Card tone={tone} className="flex h-full flex-wrap items-start gap-x-4 gap-y-3 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-paper/90 text-primary shadow-soft-sm">
                    <Icon className="size-5" />
                  </span>
                  <div className="flex min-w-0 flex-1 basis-48 flex-col gap-1 [overflow-wrap:anywhere]">
                    <h3 className="text-base font-semibold leading-snug tracking-tight text-ink sm:text-lg">
                      {t(`landing.highlights.${id}.title`)}
                    </h3>
                    <p className="text-sm leading-relaxed text-muted sm:text-[15px]">
                      {t(`landing.highlights.${id}.body`)}
                    </p>
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
