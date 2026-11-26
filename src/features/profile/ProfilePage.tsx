import { useEffect, useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { ChatIcon, InsightsIcon, NotesIcon, ProfileIcon, TrashIcon } from '@/components/ui/icons'
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
import { SettingsGroup, SettingsRow } from './SettingsList'
import { StreakCard } from './StreakCard'

/** S9 Profile: hero avatar band, stat tiles, account/preferences, grouped links, feedback, sign out. */
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
  const guestCompletedTodos = isGuest
    ? (plan?.todos.filter((todo) => todo.done_at !== null).length ?? 0)
    : undefined
  const initial = user?.name?.trim().charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()

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
      <header className="relative overflow-hidden rounded-lg border-hairline border-primary/15 bg-gradient-to-b from-primary-soft via-category-health/60 to-paper px-5 pb-5 pt-6 text-center shadow-soft-sm">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -left-8 -top-10 size-32 rounded-full bg-primary/10 blur-xl"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -top-8 size-28 rounded-full bg-accent/15 blur-xl"
        />
        <div className="relative flex flex-col items-center gap-2">
          <div
            aria-hidden="true"
            className="grid size-16 place-items-center rounded-full border-2 border-paper bg-paper font-heading text-2xl font-bold text-primary shadow-soft-md"
          >
            {initial ? initial : <ProfileIcon className="h-icon-xl w-icon-xl" />}
          </div>
          <h1 className="text-sm font-semibold text-muted">{t('pages.profile.title')}</h1>
          <p
            data-page-headline
            className="text-balance font-heading text-[2rem] font-bold leading-[1.1] tracking-tight text-ink [overflow-wrap:anywhere] md:text-[2.25rem]"
          >
            {t('pages.profile.headline')}
          </p>
          <p className="max-w-md text-sm leading-relaxed text-muted">
            {t(isGuest ? 'profile.subtitleGuest' : 'profile.subtitle')}
          </p>
        </div>
      </header>

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

      <StreakCard
        today={toLocalDate(openedAt, user?.timezone)}
        completedTodos={guestCompletedTodos}
      />

      {user && <AccountCard key={generation} user={user} />}
      {isGuest && <GuestPreferencesCard />}

      <SettingsGroup title={t('profile.supportTitle')}>
        <SettingsRow
          Icon={InsightsIcon}
          label={t('profile.myActivity')}
          onClick={() => navigate('/insights')}
        />
        <SettingsRow
          Icon={NotesIcon}
          label={t('profile.myNotes')}
          onClick={() => navigate('/notes')}
        />
        <SettingsRow
          Icon={ChatIcon}
          label={t('profile.feedback')}
          description={t('profile.feedbackRowHint')}
          onClick={() => setFeedbackOpen(true)}
        />
      </SettingsGroup>

      {user && (
        <>
          <SettingsGroup title={t('profile.accountActionsTitle')}>
            <SettingsRow
              Icon={TrashIcon}
              label={t('profile.deleteAccount')}
              description={t('profile.deleteHint')}
              tone="danger"
              onClick={() => setDeleteOpen(true)}
            />
          </SettingsGroup>
          <div className="pt-1 text-center">
            <button
              type="button"
              disabled={signingOut}
              aria-busy={signingOut}
              onClick={() => void leave()}
              className="inline-flex min-h-touch items-center justify-center rounded-md px-5 text-sm font-semibold text-danger transition-colors duration-fast ease-elemental hover:bg-danger/5 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('profile.signOut')}
            </button>
          </div>
        </>
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
