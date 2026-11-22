import { useRef, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useIsPresent } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { create } from 'zustand'
import { Button, Input, Sheet } from '@/components/ui'
import { FormError } from '@/features/auth/FormError'
import { useFormAction } from '@/features/auth/useFormAction'
import { authApi, useSession, type User } from '@/lib/api'
import { GoogleDeletionStart } from './GoogleDeletionStart'

interface DeleteAccountSheetProps {
  open: boolean
  onClose: () => void
}

// Keep the request lock across route changes without storing the password.
const usePendingDeletions = create<ReadonlySet<string>>(() => new Set())

export function DeleteAccountSheet(props: DeleteAccountSheetProps) {
  const user = useSession((s) => s.user)
  const generation = useSession((s) => s.generation)
  if (!user) return null

  return (
    <DeleteAccountSession
      key={`${generation}:${user.id}`}
      {...props}
      user={user}
      generation={generation}
    />
  )
}

function DeleteAccountSession({
  open,
  onClose,
  user,
  generation,
}: DeleteAccountSheetProps & { user: User; generation: number }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const sessionKey = `${generation}:${user.id}`
  const deleting = usePendingDeletions((pending) => pending.has(sessionKey))
  const known = typeof user.has_password === 'boolean'

  function currentSession() {
    const session = useSession.getState()
    if (session.token && session.generation === generation && session.user?.id === user.id) {
      return session
    }
  }

  const lookup = useQuery({
    queryKey: ['delete-account-password', generation, user.id],
    enabled: open && !known,
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) => {
      if (!currentSession()) throw new Error('Session changed')

      const updated = await authApi.getMe(signal, { preserveSessionOnUnauthorized: true })
      if (updated.id !== user.id || typeof updated.has_password !== 'boolean') {
        throw new Error('Account password availability is unknown')
      }

      const current = currentSession()
      if (current?.user && typeof current.user.has_password !== 'boolean') {
        current.setUser({ ...current.user, has_password: updated.has_password })
      }
      return updated.has_password
    },
  })

  async function deleteAccount(password: string) {
    const pending = usePendingDeletions.getState()
    if (pending.has(sessionKey) || currentSession()?.user?.has_password !== true) return
    usePendingDeletions.setState(new Set(pending).add(sessionKey), true)
    try {
      await authApi.deleteMe(password)
      const current = currentSession()
      if (!current) return
      current.signOut()
      navigate('/', { replace: true })
    } finally {
      usePendingDeletions.setState((pending) => {
        const remaining = new Set(pending)
        remaining.delete(sessionKey)
        return remaining
      }, true)
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('profile.deleteTitle')}>
      <div className="flex flex-col gap-4">
        {known ? (
          user.has_password ? (
            <PasswordConfirmation deleting={deleting} onDelete={deleteAccount} />
          ) : (
            open && <GoogleDeletionStart />
          )
        ) : lookup.isFetching ? (
          <p role="status">{t('profile.deleteLookupLoading')}</p>
        ) : (
          <>
            <FormError message={t('profile.deleteLookupError')} />
            <Button
              variant="secondary"
              size="lg"
              fullWidth
              onClick={() => {
                cancelRef.current?.focus()
                void lookup.refetch()
              }}
            >
              {t('common.retry')}
            </Button>
          </>
        )}
        <Button ref={cancelRef} variant="secondary" size="lg" fullWidth onClick={onClose}>
          {t('common.cancel')}
        </Button>
      </div>
    </Sheet>
  )
}

interface PasswordConfirmationProps {
  deleting: boolean
  onDelete: (password: string) => Promise<void>
}

function PasswordConfirmation(props: PasswordConfirmationProps) {
  // Discard sensitive form state when the sheet starts its exit animation.
  const present = useIsPresent()
  return present ? <DeletePasswordForm {...props} /> : null
}

function DeletePasswordForm({ deleting, onDelete }: PasswordConfirmationProps) {
  const { t } = useTranslation()
  const { formError, fieldErrors, setFieldErrors, run } = useFormAction()
  const passwordRef = useRef<HTMLInputElement>(null)
  const [password, setPassword] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (deleting) return
    passwordRef.current?.focus()
    if (password === '') {
      setFieldErrors({ password: t('auth.errors.passwordRequired') })
      return
    }
    void run(() => onDelete(password))
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="font-semibold">{t('profile.deleteWarning')}</p>
      <FormError message={formError} />
      <Input
        ref={passwordRef}
        label={t('profile.deletePassword')}
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <Button type="submit" variant="danger" size="lg" fullWidth disabled={deleting}>
        {t(deleting ? 'profile.deleting' : 'profile.deleteConfirm')}
      </Button>
    </form>
  )
}
