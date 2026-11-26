import { useTranslation } from 'react-i18next'
import { Button, Card } from '@/components/ui'
import { StreakIcon } from '@/components/ui/icons'
import { useStreak } from '@/features/streak'
import type { LocalDate } from '@/features/todos/types'

/** The streak summary, with its loading, offline and error states. */
export function StreakCard({ today }: { today: LocalDate }) {
  const { t } = useTranslation()
  const streak = useStreak(today)
  const title = <h2 className="text-sm font-semibold text-muted">{t('profile.streakTitle')}</h2>

  if (streak.data) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-lg border-hairline border-accent/30 bg-accent/15 p-4 text-ink shadow-soft-sm">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-paper text-ink shadow-soft-sm">
          <StreakIcon className="size-6" />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          {title}
          <p className="text-2xl font-bold tracking-tight tabular-nums text-ink [overflow-wrap:anywhere]">
            {t('profile.streakDays', { count: streak.data.count })}
          </p>
          <p className="text-sm text-muted">
            {t(streak.data.todayCounted ? 'profile.streakTodayCounted' : 'profile.streakTodayOpen')}
          </p>
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
