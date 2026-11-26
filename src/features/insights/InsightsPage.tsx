import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { EmptyState, ErrorState, LoadingState } from '@/components/states'
import { Button, Card, SegmentedControl } from '@/components/ui'
import { useStreak } from '@/features/streak/useStreak'
import type { LocalDate } from '@/features/todos/types'
import { errorMessageKey, useSession, type StatsDayRow, type StatsSummary } from '@/lib/api'
import { daysBetweenLocalDates, toLocalDate } from '@/lib/date'
import { useTimePreferences } from '@/lib/time/useTimePreferences'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { addDaysLocalDate, isEmptyStatsSummary, weekBoundsForDate } from './computeStatsSummary'
import { useStatsSummary } from './useStatsSummary'

type RangePreset = 'week' | 'last7' | 'last30' | 'last90'

function formatDurationMs(ms: number, locale: string): string {
  const totalMinutes = Math.floor(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  const seconds = Math.floor((ms % 60_000) / 1000)
  const unit = (u: 'hour' | 'minute' | 'second', v: number) =>
    new Intl.NumberFormat(locale, { style: 'unit', unit: u, unitDisplay: 'short' }).format(v)
  if (hours > 0 && minutes > 0) return `${unit('hour', hours)} ${unit('minute', minutes)}`
  if (hours > 0) return unit('hour', hours)
  if (minutes > 0) return unit('minute', minutes)
  if (seconds > 0) return unit('second', seconds)
  return unit('minute', 0)
}

function formatMinutes(minutes: number, locale: string): string {
  return formatDurationMs(minutes * 60_000, locale)
}

function formatCalendarDate(date: LocalDate, locale: string, withYear = false): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    ...(withYear ? { year: 'numeric' } : {}),
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

function formatWeekdayShort(date: LocalDate, locale: string): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

function isActiveDay(day: StatsDayRow): boolean {
  return day.focus_ms > 0 || day.todos_done > 0 || day.blocks_checked > 0
}

function dayActivityScore(day: StatsDayRow): number {
  return day.focus_ms + day.todos_done * 300_000 + day.blocks_checked * 300_000
}

/** R4 Insights dashboard: analytics, Weekly Recap, and Plan vs Reality (B-047). */
export function InsightsPage() {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? 'en'
  const [openedAt] = useState(() => new Date())
  const [preset, setPreset] = useState<RangePreset>('week')
  const [weekOffset, setWeekOffset] = useState(0)

  const signedIn = useSession((s) => s.token !== null)
  const timezone = useSession((s) => (s.token ? s.user?.timezone : undefined))
  const online = useOnlineStatus()
  const { values: preferences } = useTimePreferences()

  const today = toLocalDate(openedAt, timezone)

  const range = useMemo(() => {
    if (preset === 'week') {
      const anchor = addDaysLocalDate(today, weekOffset * 7)
      return weekBoundsForDate(anchor, preferences.week_starts_on)
    }
    const spanDays = preset === 'last7' ? 7 : preset === 'last30' ? 30 : 90
    return {
      from: addDaysLocalDate(today, -(spanDays - 1)),
      to: today,
    }
  }, [preset, today, weekOffset, preferences.week_starts_on])

  const stats = useStatsSummary(range.from, range.to)
  const streak = useStreak(today)

  const rangeOptions = [
    { value: 'week' as const, label: t('insights.ranges.week') },
    { value: 'last7' as const, label: t('insights.ranges.last7') },
    { value: 'last30' as const, label: t('insights.ranges.last30') },
    { value: 'last90' as const, label: t('insights.ranges.last90') },
  ]

  const rangeLabel = `${formatCalendarDate(range.from, locale)} – ${formatCalendarDate(range.to, locale, true)}`
  const isOfflineAccountWithoutData = signedIn && !online && !stats.data

  return (
    <div className="flex flex-col gap-5 pb-4">
      <header className="flex min-w-0 flex-col gap-0.5">
        <PageHeading>{t('pages.insights.title')}</PageHeading>
        <p className="text-sm font-medium text-muted">{t('insights.subtitle')}</p>
      </header>

      <section aria-label={t('insights.rangeLabel')} className="flex flex-col gap-3">
        <SegmentedControl
          label={t('insights.rangeLabel')}
          options={rangeOptions}
          value={preset}
          onChange={(next) => {
            setPreset(next)
            if (next === 'week') setWeekOffset(0)
          }}
          className="flex-wrap"
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold tabular-nums text-ink">{rangeLabel}</p>
          {preset === 'week' && (
            <div
              role="group"
              aria-label={t('insights.weekNav.label')}
              className="flex flex-wrap items-center gap-2"
            >
              <Button
                variant="secondary"
                size="md"
                onClick={() => setWeekOffset((current) => current - 1)}
              >
                {t('insights.weekNav.previous')}
              </Button>
              <Button
                variant="secondary"
                size="md"
                disabled={weekOffset >= 0}
                onClick={() => setWeekOffset((current) => Math.min(0, current + 1))}
              >
                {t('insights.weekNav.next')}
              </Button>
            </div>
          )}
        </div>
      </section>

      {isOfflineAccountWithoutData ? (
        <Card className="bg-warning-surface border-warning/30">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-lg font-semibold text-ink">
              {t('insights.offlineTitle')}
            </h2>
            <p className="text-sm text-muted">{t('insights.offlineBody')}</p>
            <div>
              <Button variant="secondary" size="md" onClick={() => void stats.refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          </div>
        </Card>
      ) : stats.isPending ? (
        <LoadingState />
      ) : stats.isError ? (
        <ErrorState
          message={t(errorMessageKey(stats.error))}
          onRetry={() => void stats.refetch()}
        />
      ) : isEmptyStatsSummary(stats.data) ? (
        <EmptyState title={t('insights.emptyTitle')} message={t('insights.emptyBody')} />
      ) : (
        <div className="flex flex-col gap-5">
          <OverviewSection
            summary={stats.data}
            streakCount={streak.data?.count}
            longestStreak={streak.data?.longest}
            locale={locale}
          />
          {preset === 'week' && (
            <WeeklyRecapCard
              summary={stats.data}
              from={range.from}
              to={range.to}
              today={today}
              locale={locale}
            />
          )}
          <PlanVsRealityCard summary={stats.data} locale={locale} />
          <DailyTrendsCard summary={stats.data} locale={locale} />
        </div>
      )}
    </div>
  )
}

function OverviewSection({
  summary,
  streakCount,
  longestStreak,
  locale,
}: {
  summary: StatsSummary
  streakCount?: number
  longestStreak?: number
  locale: string
}) {
  const { t } = useTranslation()
  const { totals } = summary

  return (
    <section aria-label={t('insights.overviewLabel')} className="grid grid-cols-2 gap-3">
      <Card compact className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('insights.metrics.focusTime')}
        </p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-ink sm:text-2xl">
          {formatDurationMs(totals.focus_ms, locale)}
        </p>
        <p className="mt-0.5 text-xs text-muted tabular-nums">
          {t('insights.metrics.sessions', { count: totals.sessions })}
        </p>
      </Card>

      <Card compact className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('insights.metrics.todosDone')}
        </p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-ink sm:text-2xl">
          {totals.todos_done}
        </p>
        <p className="mt-0.5 text-xs text-muted tabular-nums">
          {t('insights.metrics.todosDue', { count: totals.todos_due })}
        </p>
      </Card>

      <Card compact className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('insights.metrics.blocksChecked')}
        </p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-ink sm:text-2xl">
          {totals.blocks_checked}
        </p>
        <p className="mt-0.5 text-xs text-muted tabular-nums">
          {t('insights.metrics.plannedMinutes', {
            time: formatMinutes(totals.planned_block_minutes, locale),
          })}
        </p>
      </Card>

      <Card compact className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {t('insights.metrics.currentStreak')}
        </p>
        <p className="mt-1 font-heading text-xl font-semibold tabular-nums text-ink sm:text-2xl">
          {streakCount !== undefined
            ? t('insights.metrics.streakDays', { count: streakCount })
            : '—'}
        </p>
        {longestStreak !== undefined && (
          <p className="mt-0.5 text-xs text-muted tabular-nums">
            {t('insights.metrics.longestStreak', { count: longestStreak })}
          </p>
        )}
      </Card>
    </section>
  )
}

function WeeklyRecapCard({
  summary,
  from,
  to,
  today,
  locale,
}: {
  summary: StatsSummary
  from: LocalDate
  to: LocalDate
  today: LocalDate
  locale: string
}) {
  const { t } = useTranslation()
  const isPartialWeek = today >= from && today < to
  const elapsedDays = isPartialWeek ? daysBetweenLocalDates(today, from) + 1 : summary.days.length
  const activeDays = summary.days.filter(isActiveDay)
  const bestDay = activeDays.reduce<StatsDayRow | null>((best, day) => {
    if (!best) return day
    return dayActivityScore(day) > dayActivityScore(best) ? day : best
  }, null)

  return (
    <Card>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-heading text-lg font-semibold text-ink">
            {t('insights.recap.title')}
          </h2>
          {isPartialWeek && (
            <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-semibold text-primary">
              {t('insights.weekNav.inProgress')}
            </span>
          )}
        </div>
        {isPartialWeek && (
          <p className="text-sm text-muted">
            {t('insights.recap.partialNote', { elapsed: elapsedDays })}
          </p>
        )}
        <p className="text-sm font-medium tabular-nums text-ink">
          {t('insights.recap.activeDays', { active: activeDays.length, total: elapsedDays })}
        </p>
        {bestDay ? (
          <p className="text-sm text-muted">
            {t('insights.recap.bestDay', {
              day: formatWeekdayShort(bestDay.local_date, locale),
            })}
          </p>
        ) : (
          <p className="text-sm text-muted">{t('insights.recap.empty')}</p>
        )}
      </div>
    </Card>
  )
}

function PlanVsRealityCard({ summary, locale }: { summary: StatsSummary; locale: string }) {
  const { t } = useTranslation()
  const { totals, by_mode: byMode } = summary
  const linkedShare =
    totals.focus_ms > 0 ? Math.round((totals.focus_ms_linked / totals.focus_ms) * 100) : 0

  return (
    <Card>
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink">
            {t('insights.planVsReality.title')}
          </h2>
          <p className="text-sm text-muted">{t('insights.planVsReality.subtitle')}</p>
        </div>

        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-border-subtle bg-subtle/40 p-3">
            <dt className="text-xs font-semibold text-muted">
              {t('insights.planVsReality.todosLabel')}
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-ink">
              {t('insights.planVsReality.todosValue', {
                done: totals.todos_done,
                due: totals.todos_due,
              })}
            </dd>
          </div>
          <div className="rounded-md border border-border-subtle bg-subtle/40 p-3">
            <dt className="text-xs font-semibold text-muted">
              {t('insights.planVsReality.scheduleLabel')}
            </dt>
            <dd className="mt-1 text-base font-semibold tabular-nums text-ink">
              {t('insights.planVsReality.scheduleValue', {
                checked: totals.blocks_checked,
                planned: formatMinutes(totals.planned_block_minutes, locale),
              })}
            </dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink">
            {t('insights.planVsReality.focusAttributionLabel')}
          </h3>
          {totals.focus_ms > 0 ? (
            <>
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-subtle"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-normal ease-elemental motion-reduce:transition-none"
                  style={{ width: `${linkedShare}%` }}
                />
              </div>
              <div className="flex flex-wrap justify-between gap-2 text-sm tabular-nums text-muted">
                <span>
                  {t('insights.planVsReality.linkedFocus', {
                    time: formatDurationMs(totals.focus_ms_linked, locale),
                  })}
                </span>
                <span>
                  {t('insights.planVsReality.unplannedFocus', {
                    time: formatDurationMs(totals.focus_ms_unplanned, locale),
                  })}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2 border-t border-border-subtle pt-2 text-xs tabular-nums text-muted">
                <span>
                  {t('insights.planVsReality.countdown', {
                    time: formatDurationMs(byMode.countdown, locale),
                  })}
                </span>
                <span>
                  {t('insights.planVsReality.stopwatch', {
                    time: formatDurationMs(byMode.stopwatch, locale),
                  })}
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">{t('insights.planVsReality.noFocus')}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

function DailyTrendsCard({ summary, locale }: { summary: StatsSummary; locale: string }) {
  const { t } = useTranslation()
  const compactMode = summary.days.length > 14
  const rows = compactMode ? summary.days.filter(isActiveDay) : summary.days
  const maxFocus = rows.reduce((max, day) => Math.max(max, day.focus_ms), 0)

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-ink">
            {t('insights.trends.title')}
          </h2>
          <p className="text-sm text-muted">{t('insights.trends.subtitle')}</p>
          {compactMode && (
            <p className="mt-0.5 text-xs text-muted tabular-nums">
              {t('insights.trends.showingActiveOnly', {
                count: rows.length,
                total: summary.days.length,
              })}
            </p>
          )}
        </div>

        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t('insights.trends.noActiveDays')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {rows.map((day) => {
              const widthPct = maxFocus > 0 ? Math.round((day.focus_ms / maxFocus) * 100) : 0
              return (
                <li
                  key={day.local_date}
                  className="flex flex-col gap-1.5 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">
                      {formatWeekdayShort(day.local_date, locale)}
                    </span>
                    <div className="flex flex-wrap items-center gap-3 text-xs tabular-nums text-muted">
                      <span>
                        {t('insights.trends.focus', {
                          time: formatDurationMs(day.focus_ms, locale),
                        })}
                      </span>
                      <span>{t('insights.trends.todos', { count: day.todos_done })}</span>
                      <span>{t('insights.trends.blocks', { count: day.blocks_checked })}</span>
                    </div>
                  </div>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-subtle"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-primary/80 transition-[width] duration-normal ease-elemental motion-reduce:transition-none"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </Card>
  )
}
