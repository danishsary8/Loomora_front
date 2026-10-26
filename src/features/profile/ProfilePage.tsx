import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageHeading } from '@/components/page'
import { Button, Card } from '@/components/ui'
import { SavePlanSheet } from '@/features/auth/SavePlanSheet'
import { useSavePlanIntent } from '@/features/auth/savePlanIntent'
import { useGuestPlan } from '@/features/auth/useGuestPlan'
import { StreakBadge, useStreak } from '@/features/streak'
import { authApi, useSession } from '@/lib/api'
import { isEmptyPlan } from '@/lib/storage'
import { toLocalDate } from '@/lib/date'
import { AccountCard } from './AccountCard'
import { DeleteAccountSheet } from './DeleteAccountSheet'
import { FeedbackSheet } from './FeedbackSheet'

/** S9 Profile: account (name, time zone, sign out, delete), streak, Save your plan, feedback. */
export function ProfilePage() {
  const { t } = useTranslation()
  const [today] = useState(() => toLocalDate())
  const streak = useStreak(today).data
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const signOut = useSession((s) => s.signOut)
  const isGuest = useSession((s) => s.token === null)
  const requestSave = useSavePlanIntent((s) => s.request)
  const plan = useGuestPlan().data
  // After sign-in, a plan left on the device (a failed import) can be sent again from here.
  const leftOnDevice = !isGuest && plan !== undefined && !isEmptyPlan(plan)

  /** Revoke the token on the server (best effort), then forget it on this device. */
  async function leave() {
    try {
      await authApi.logout()
    } catch {
      // Offline or already revoked: signing out on this device still has to work.
    }
    signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{t('pages.profile.title')}</PageHeading>

      {user && <AccountCard key={user.id} user={user} />}

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
      {user && (
        <>
          <Button variant="secondary" size="lg" fullWidth onClick={() => void leave()}>
            {t('profile.signOut')}
          </Button>
          <Button variant="ghost" onClick={() => setDeleteOpen(true)}>
            {t('profile.deleteAccount')}
          </Button>
          <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />
        </>
      )}
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SavePlanSheet open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  )
}
