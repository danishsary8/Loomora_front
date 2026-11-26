import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import type { LocalDate } from '@/features/todos/types'
import type { StatsSummary } from '@/lib/api'
import { isEmptyStatsSummary } from './computeStatsSummary'

interface StreakHistoryCardProps {
  summary: StatsSummary
  today: LocalDate
  locale: string
}

export function StreakHistoryCard({ summary, today, locale }: StreakHistoryCardProps) {
  const { t } = useTranslation()
  const { opening_streak: opening, opening_streak_may_be_longer: openingMayBeLonger } = summary
  const days = summary.days.filter((day) => day.local_date <= today)

  // A server serving the older summary contract has no history to display.
  if (opening === undefined || days.some((day) => day.streak === undefined)) return null
  if (
    days.length === 0 ||
    (isEmptyStatsSummary(summary) && opening === 0 && days.every((day) => day.streak === 0))
  ) {
    return null
  }

  const hasLowerBound =
    (opening > 0 && openingMayBeLonger) ||
    days.some((day) => day.streak > 0 && day.streak_may_be_longer)
  const label = (count: number, mayBeLonger: boolean) =>
    count > 0 && mayBeLonger
      ? t('insights.streakHistory.lowerBound', { count })
      : t('insights.metrics.streakDays', { count })
  const dateFormat = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <Card>
      <section aria-labelledby="streak-history-heading" className="flex flex-col gap-2">
        <h2 id="streak-history-heading" className="font-heading text-lg font-semibold text-ink">
          {t('insights.streakHistory.title')}
        </h2>
        {hasLowerBound && (
          <p className="text-sm text-muted">{t('insights.streakHistory.lowerBoundHint')}</p>
        )}
        <dl className="divide-y divide-border-subtle text-sm">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2 text-muted">
            <dt>{t('insights.streakHistory.opening')}</dt>
            <dd className="font-semibold tabular-nums text-ink">
              {label(opening, openingMayBeLonger)}
            </dd>
          </div>
          {days.map((day) => (
            <div
              key={day.local_date}
              className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-2 last:pb-0"
            >
              <dt className="text-muted">
                <time dateTime={day.local_date}>
                  {dateFormat.format(new Date(day.local_date + 'T00:00:00Z'))}
                </time>
              </dt>
              <dd className="font-semibold tabular-nums text-ink">
                {label(day.streak, day.streak_may_be_longer)}
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </Card>
  )
}
