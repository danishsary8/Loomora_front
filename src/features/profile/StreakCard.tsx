import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { CheckIcon, StreakIcon } from '@/components/ui/icons'
import { useStreak } from '@/features/streak'
import type { LocalDate } from '@/features/todos/types'

/** Profile stat tiles: streak summary + real completed/longest stat, with loading/offline/error states. */
export function StreakCard({
  today,
  completedTodos,
}: {
  today: LocalDate
  completedTodos?: number
}) {
  const { t } = useTranslation()
  const streak = useStreak(today)
  const title = <h2 className="text-xs font-semibold text-muted">{t('profile.streakTitle')}</h2>

  if (streak.data) {
    const showLongest = streak.data.longest !== undefined && completedTodos === undefined
    const secondValue = showLongest ? String(streak.data.longest) : String(completedTodos ?? 0)
    const secondLabel = showLongest
      ? t('profile.longestStreakTitle')
      : t('profile.tasksCompletedTitle')

    return (
      <div className="grid grid-cols-1 gap-3 min-[340px]:grid-cols-2">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border-hairline border-accent/35 bg-warning-surface p-4 text-ink shadow-soft-sm">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-ink shadow-soft-sm"
          >
            <StreakIcon className="h-icon-md w-icon-md" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-xl font-bold leading-tight tracking-tight tabular-nums text-ink [overflow-wrap:anywhere]">
              {t('profile.streakDays', { count: streak.data.count })}
            </p>
            {title}
            <p className="text-xs text-muted [overflow-wrap:anywhere]">
              {t(
                streak.data.todayCounted ? 'profile.streakTodayCounted' : 'profile.streakTodayOpen',
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border-hairline border-primary/15 bg-category-health p-4 text-ink shadow-soft-sm">
          <span
            aria-hidden="true"
            className="grid size-10 shrink-0 place-items-center rounded-full bg-paper text-primary shadow-soft-sm"
          >
            <CheckIcon className="h-icon-md w-icon-md" />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-xl font-bold leading-tight tracking-tight tabular-nums text-ink [overflow-wrap:anywhere]">
              {secondValue}
            </p>
            <p className="text-xs font-semibold text-muted [overflow-wrap:anywhere]">
              {secondLabel}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (streak.isError) {
    return (
      <Card className="flex flex-col gap-3">
        {title}
        <p role="alert" className="text-sm font-semibold text-danger">
          {t('profile.streakLoadError')}
        </p>
        <Button variant="secondary" onClick={() => void streak.refetch()}>
          {t('common.retry')}
        </Button>
      </Card>
    )
  }

  if (streak.fetchStatus === 'paused') {
    return (
      <Card className="flex flex-col gap-1">
        {title}
        <p role="status" className="text-sm text-muted">
          {t('profile.streakOffline')}
        </p>
      </Card>
    )
  }

  return (
    <Card role="status" aria-busy="true" className="flex flex-col gap-2">
      {title}
      <span className="sr-only">{t('common.loading')}</span>
      <div
        aria-hidden="true"
        className="h-8 w-28 animate-pulse rounded-md bg-subtle motion-reduce:animate-none"
      />
      <div
        aria-hidden="true"
        className="h-4 w-3/5 animate-pulse rounded-sm bg-subtle motion-reduce:animate-none"
      />
    </Card>
  )
}
