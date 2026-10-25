import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { Button, Card } from '@/components/ui'
import { StreakBadge, useStreak } from '@/features/streak'
import { toLocalDate } from '@/lib/date'
import { FeedbackSheet } from './FeedbackSheet'

/** S9 Profile for guests: streak, where the data lives, Save your plan (later), feedback. */
export function ProfilePage() {
  const { t } = useTranslation()
  const [today] = useState(() => toLocalDate())
  const streak = useStreak(today).data
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{t('pages.profile.title')}</PageHeading>

      {streak && (
        <Card className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold">{t('profile.streakTitle')}</h2>
            <p className="font-semibold">{t('profile.streakDays', { count: streak.count })}</p>
            <p className="text-sm text-muted">
              {t(streak.todayCounted ? 'profile.streakTodayCounted' : 'profile.streakTodayOpen')}
            </p>
          </div>
          <StreakBadge {...streak} />
        </Card>
      )}

      <Card tone="work" className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{t('profile.deviceTitle')}</h2>
        <p className="font-semibold">{t('profile.deviceOnly')}</p>
        <p>{t('profile.deviceWarning')}</p>
        <Button size="lg" fullWidth disabled aria-describedby="save-plan-soon">
          {t('profile.savePlan')}
        </Button>
        <p id="save-plan-soon" className="text-center text-sm">
          {t('profile.savePlanSoon')}
        </p>
      </Card>

      <Button variant="secondary" size="lg" fullWidth onClick={() => setFeedbackOpen(true)}>
        {t('profile.feedback')}
      </Button>
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </div>
  )
}
