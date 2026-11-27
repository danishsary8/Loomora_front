import type { ComponentType, SVGProps } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { StandalonePage } from '@/components/page'
import { BlurText } from '@/components/reactbits/BlurText'
import { SpotlightCard } from '@/components/reactbits/SpotlightCard'
import { buttonClasses } from '@/components/ui'
import { CATEGORY_TONES } from '@/components/ui/categoryTones'
import { Hills } from '@/components/ui/Hills'
import {
  BrandMark,
  CheckIcon,
  FocusIcon,
  InsightsIcon,
  NotesIcon,
  StreakIcon,
  TodayIcon,
  WeekIcon,
} from '@/components/ui/icons'
import { cn } from '@/lib/cn'
import { colors, type Category } from '@/styles/tokens'

type HighlightId = 'plan' | 'now' | 'focus' | 'insights' | 'notes' | 'streak'

// Each highlight borrows the icon of the screen it describes.
const HIGHLIGHTS: readonly {
  id: HighlightId
  tone: Category
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}[] = [
  { id: 'plan', tone: 'study', Icon: WeekIcon },
  { id: 'now', tone: 'work', Icon: TodayIcon },
  { id: 'focus', tone: 'health', Icon: FocusIcon },
  { id: 'insights', tone: 'rest', Icon: InsightsIcon },
  { id: 'notes', tone: 'other', Icon: NotesIcon },
  { id: 'streak', tone: 'life', Icon: StreakIcon },
]

/** S1 Landing: promise, "Try it now" (guest mode), Sign in, a card-built preview, highlights. */
export function LandingPage() {
  const { t } = useTranslation()
  return (
    <StandalonePage width="full">
      <div className="flex flex-col gap-14 py-2 md:gap-20 md:py-6">
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-12">
          <div className="flex flex-col gap-7">
            <div className="flex items-center gap-3">
              <BrandMark className="size-10 shrink-0 rounded-md shadow-soft-sm" />
              <h1 className="font-heading text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-ink">
                {t('common.appName')}
                <span aria-hidden="true" className="text-accent">
                  .
                </span>
              </h1>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                {t('landing.eyebrow')}
              </p>
              <BlurText
                text={t('landing.heroTitle')}
                className="text-balance font-heading text-[length:clamp(2.25rem,10vw,3.75rem)] font-bold leading-[1.04] tracking-[-0.035em] text-ink"
              />
              <p className="max-w-md text-lg font-medium leading-relaxed text-ink/90">
                {t('common.promise')}
              </p>
              <p className="max-w-md text-[15px] leading-relaxed text-muted">
                {t('landing.heroBody')}
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
          <ProductPreview />
        </div>

        <section aria-labelledby="highlights-heading">
          <h2
            id="highlights-heading"
            className="mb-5 font-heading text-2xl font-bold tracking-tight text-ink"
          >
            {t('landing.highlightsLabel')}
          </h2>
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {HIGHLIGHTS.map(({ id, tone, Icon }) => (
              <li key={id} className="flex">
                <SpotlightCard
                  spotlightColor={`color-mix(in srgb, ${colors.paper} 70%, transparent)`}
                  className={cn(
                    'flex-1 rounded-lg border-hairline border-ink/5 p-5 shadow-soft-sm',
                    CATEGORY_TONES[tone].surface,
                  )}
                >
                  <div className="flex flex-col gap-3">
                    <span
                      className={cn(
                        'grid size-11 place-items-center rounded-full bg-paper/90 shadow-soft-sm',
                        CATEGORY_TONES[tone].icon,
                      )}
                    >
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <h3 className="text-lg font-semibold leading-snug tracking-tight text-ink">
                      {t(`landing.highlights.${id}.title`)}
                    </h3>
                    <p className="text-[15px] leading-relaxed text-ink/80">
                      {t(`landing.highlights.${id}.body`)}
                    </p>
                  </div>
                </SpotlightCard>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </StandalonePage>
  )
}

/** A still of the app built from real-looking cards (no device frame), over the hills motif. */
function ProductPreview() {
  const { t } = useTranslation()
  const todos: { key: 'todo1' | 'todo2' | 'todo3'; tone: Category; done: boolean }[] = [
    { key: 'todo1', tone: 'work', done: true },
    { key: 'todo2', tone: 'study', done: false },
    { key: 'todo3', tone: 'health', done: false },
  ]
  return (
    <figure
      role="img"
      aria-label={t('landing.previewLabel')}
      className="relative overflow-hidden rounded-lg bg-gradient-to-b from-category-study/70 via-primary-soft to-category-health px-4 pb-24 pt-6 shadow-soft-md sm:px-8 sm:pt-8"
    >
      <div aria-hidden="true" className="relative z-10 mx-auto flex max-w-sm flex-col gap-3">
        <div className="flex items-center justify-between gap-4 rounded-lg bg-primary p-4 text-white shadow-soft-md">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-white/80">
              {t('landing.preview.progress')}
            </span>
            <span className="font-heading text-xl font-bold">
              {t('landing.preview.progressValue')}
            </span>
          </div>
          <svg viewBox="0 0 48 48" className="size-14">
            <circle
              cx="24"
              cy="24"
              r="19"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeWidth="5"
            />
            <circle
              cx="24"
              cy="24"
              r="19"
              fill="none"
              stroke={colors.category.health}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray="119.4"
              strokeDashoffset="47.8"
              transform="rotate(-90 24 24)"
            />
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-category-work p-3">
            <p className="text-xs font-bold text-ink">{t('landing.preview.now')}</p>
            <p className="text-sm text-ink/80">{t('landing.preview.nowValue')}</p>
          </div>
          <div className="rounded-lg bg-category-rest p-3">
            <p className="text-xs font-bold text-ink">{t('landing.preview.next')}</p>
            <p className="text-sm text-ink/80">{t('landing.preview.nextValue')}</p>
          </div>
        </div>
        <ul className="divide-y divide-border-subtle rounded-lg bg-paper shadow-soft-sm">
          {todos.map(({ key, tone, done }) => (
            <li key={key} className="flex items-center gap-3 px-3.5 py-3">
              <span
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full border-control',
                  done ? 'border-primary bg-primary text-white' : 'border-border-control',
                )}
              >
                {done && <CheckIcon className="size-3.5" />}
              </span>
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm font-semibold',
                  done ? 'text-muted line-through' : 'text-ink',
                )}
              >
                {t(`landing.preview.${key}`)}
              </span>
              <span
                className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-semibold text-ink',
                  CATEGORY_TONES[tone].surface,
                )}
              >
                {t(`categories.${tone}`)}
              </span>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex w-3/5 items-center gap-3 rounded-lg bg-paper p-3 shadow-soft-md">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
            <FocusIcon className="size-5" />
          </span>
          <div>
            <p className="font-heading text-lg font-bold leading-none text-ink">
              {t('landing.preview.focusTime')}
            </p>
            <p className="text-xs text-muted">{t('landing.preview.focus')}</p>
          </div>
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-40">
        <Hills ground={colors.cream} />
      </div>
    </figure>
  )
}
