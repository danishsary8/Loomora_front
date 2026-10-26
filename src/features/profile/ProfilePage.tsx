import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PageHeading } from '@/components/page'
import { Button, Card } from '@/components/ui'
import { SavePlanSheet } from '@/features/auth/SavePlanSheet'
import { useSavePlanIntent } from '@/features/auth/savePlanIntent'
import { useGuestPlan } from '@/features/auth/useGuestPlan'
import { StreakBadge, useStreak } from '@/features/streak'
import { useSession } from '@/lib/api'
import { isEmptyPlan } from '@/lib/storage'
import { toLocalDate } from '@/lib/date'
import { FeedbackSheet } from './FeedbackSheet'

/** S9 Profile: streak, where the data lives, Save your plan, feedback. */
export function ProfilePage() {
  const { t } = useTranslation()
  const [today] = useState(() => toLocalDate())
  const streak = useStreak(today).data
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const isGuest = useSession((s) => s.token === null)
  const requestSave = useSavePlanIntent((s) => s.request)
  const plan = useGuestPlan().data
  // After sign-in, a plan left on the device (a failed import) can be sent again from here.
  const leftOnDevice = !isGuest && plan !== undefined && !isEmptyPlan(plan)

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

      {isGuest && (
        <Card tone="work" className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t('profile.deviceTitle')}</h2>
          <p className="font-semibold">{t('profile.deviceOnly')}</p>
          <p>{t('profile.deviceWarning')}</p>
          <Button size="lg" fullWidth onClick={() => setSaveOpen(true)}>
            {t('profile.savePlan')}
          </Button>
        </Card>
      )}

      {leftOnDevice && (
        <Card tone="work" className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">{t('profile.deviceTitle')}</h2>
          <p>{t('profile.savePlanLeft')}</p>
          <Button size="lg" fullWidth onClick={requestSave}>
            {t('profile.savePlan')}
          </Button>
        </Card>
      )}

      <Button variant="secondary" size="lg" fullWidth onClick={() => setFeedbackOpen(true)}>
        {t('profile.feedback')}
      </Button>
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SavePlanSheet open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  )
}
