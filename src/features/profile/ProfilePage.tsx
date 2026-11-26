import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { AppPageHeader } from '@/components/page'
import { Button } from '@/components/ui'
import { SavePlanSheet } from '@/features/auth/SavePlanSheet'
import { useSavePlanIntent } from '@/features/auth/savePlanIntent'
import { useGuestPlan } from '@/features/auth/useGuestPlan'
import { authApi, useSession } from '@/lib/api'
import { isEmptyPlan } from '@/lib/storage'
import { toLocalDate } from '@/lib/date'
import { AccountCard } from './AccountCard'
import { DeleteAccountSheet } from './DeleteAccountSheet'
import { FeedbackSheet } from './FeedbackSheet'
import { GuestPreferencesCard } from './GuestPreferencesCard'
import { ChatIcon, SignOutIcon, TrashIcon } from '@/components/ui/icons'
import { SettingsGroup, SettingsRow } from './SettingsList'
import { StreakCard } from './StreakCard'

/** S9 Profile: account (name, time zone, sign out, delete), streak, Save your plan, feedback. */
export function ProfilePage() {
  const { t } = useTranslation()
  const [openedAt] = useState(() => new Date())
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [saveOpen, setSaveOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const navigate = useNavigate()
  const user = useSession((s) => s.user)
  const generation = useSession((s) => s.generation)
  const signOut = useSession((s) => s.signOut)
  const isGuest = useSession((s) => s.token === null)
  const requestSave = useSavePlanIntent((s) => s.request)
  const plan = useGuestPlan().data
  // After sign-in, a plan left on the device (a failed import) can be sent again from here.
  const leftOnDevice = !isGuest && plan !== undefined && !isEmptyPlan(plan)

  useEffect(() => {
    return useSession.subscribe((state) => {
      if (!state.user) setDeleteOpen(false)
      if (state.token !== null) setSaveOpen(false)
    })
  }, [])

  /** Revoke the token on the server (best effort), then forget it on this device. */
  async function leave() {
    if (signingOut) return
    setSigningOut(true)
    const startGeneration = useSession.getState().generation
    try {
      await authApi.logout()
    } catch {
      // Offline or already revoked: signing out on this device still has to work.
    }
    setSigningOut(false)
    const current = useSession.getState()
    if (current.generation === startGeneration) {
      signOut()
      navigate('/', { replace: true })
    } else if (current.token === null) {
      navigate('/', { replace: true })
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-4">
      <AppPageHeader
        title={t('pages.profile.title')}
        headline={t('pages.profile.headline')}
        subtitle={t(isGuest ? 'profile.subtitleGuest' : 'profile.subtitle')}
      />

      {isGuest && (
        <DeviceDataNotice onSave={() => setSaveOpen(true)}>
          <p className="font-semibold">{t('profile.deviceOnly')}</p>
          <p className="text-sm">{t('profile.deviceWarning')}</p>
        </DeviceDataNotice>
      )}
      {leftOnDevice && (
        <DeviceDataNotice onSave={requestSave}>
          <p className="text-sm">{t('profile.savePlanLeft')}</p>
        </DeviceDataNotice>
      )}

      <StreakCard today={toLocalDate(openedAt, user?.timezone)} />

      {user && <AccountCard key={generation} user={user} />}
      {isGuest && <GuestPreferencesCard />}

      <SettingsGroup title={t('profile.supportTitle')}>
        <SettingsRow
          Icon={ChatIcon}
          label={t('profile.feedback')}
          description={t('profile.feedbackRowHint')}
          onClick={() => setFeedbackOpen(true)}
        />
      </SettingsGroup>

      {user && (
        <SettingsGroup title={t('profile.accountActionsTitle')}>
          <SettingsRow
            Icon={SignOutIcon}
            label={t('profile.signOut')}
            disabled={signingOut}
            aria-busy={signingOut}
            onClick={() => void leave()}
          />
          <SettingsRow
            Icon={TrashIcon}
            label={t('profile.deleteAccount')}
            description={t('profile.deleteHint')}
            tone="danger"
            onClick={() => setDeleteOpen(true)}
          />
        </SettingsGroup>
      )}
      {user && <DeleteAccountSheet open={deleteOpen} onClose={() => setDeleteOpen(false)} />}
      <FeedbackSheet open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <SavePlanSheet open={saveOpen} onClose={() => setSaveOpen(false)} />
    </div>
  )
}

/** Guest data warning: the plan lives only on this device until it is saved to an account. */
function DeviceDataNotice({ onSave, children }: { onSave: () => void; children: ReactNode }) {
  const { t } = useTranslation()
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="flex flex-col gap-3 rounded-lg border-hairline border-warning/30 bg-warning-surface p-4 text-ink shadow-soft-sm"
    >
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {t('profile.deviceTitle')}
      </h2>
      {children}
      <Button size="lg" fullWidth onClick={onSave}>
        {t('profile.savePlan')}
      </Button>
    </section>
  )
}
