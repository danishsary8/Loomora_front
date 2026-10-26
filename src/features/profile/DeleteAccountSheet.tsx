import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Sheet } from '@/components/ui'
import { FormError } from '@/features/auth/FormError'
import { useFormAction } from '@/features/auth/useFormAction'
import { authApi, useSession } from '@/lib/api'

export interface DeleteAccountSheetProps {
  open: boolean
  onClose: () => void
}

/** Delete the account (DELETE /me). The password confirms it; Google-only accounts are told why not yet. */
export function DeleteAccountSheet({ open, onClose }: DeleteAccountSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signOut = useSession((s) => s.signOut)
  const { pending, formError, fieldErrors, setFieldErrors, run } = useFormAction()
  const [password, setPassword] = useState('')

  function close() {
    onClose()
    setPassword('')
    setFieldErrors({})
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (password === '') {
      setFieldErrors({ password: t('auth.errors.passwordRequired') })
      return
    }
    void run(async () => {
      await authApi.deleteMe(password)
      signOut()
      navigate('/', { replace: true })
    })
  }

  return (
    <Sheet open={open} onClose={close} title={t('profile.deleteTitle')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <p className="font-semibold">{t('profile.deleteWarning')}</p>
        <p className="text-sm text-muted">{t('profile.deleteGoogleNote')}</p>
        <FormError message={formError} />
        <Input
          label={t('profile.deletePassword')}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Button type="submit" variant="danger" size="lg" fullWidth disabled={pending}>
          {t(pending ? 'profile.deleting' : 'profile.deleteConfirm')}
        </Button>
        <Button variant="secondary" size="lg" fullWidth onClick={close}>
          {t('common.cancel')}
        </Button>
      </form>
    </Sheet>
  )
}
