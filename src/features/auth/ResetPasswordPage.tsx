import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { Button, Card, Input } from '@/components/ui'
import { authApi } from '@/lib/api'
import { FormError } from './FormError'
import { MIN_PASSWORD_LENGTH } from './validation'
import { useFormAction } from './useFormAction'

export function ResetPasswordPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const token = params.get('token')
  const email = params.get('email')
  const { pending, formError, fieldErrors, setFieldErrors, run } = useFormAction()
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!token || !email) return
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldErrors({ password: t('auth.errors.passwordShort', { count: MIN_PASSWORD_LENGTH }) })
      return
    }
    void run(async () => {
      await authApi.resetPassword({ token, email, password })
      setDone(true)
    })
  }

  const linkProblem =
    !token || !email || fieldErrors.token ? t('auth.reset.invalidLink') : undefined

  return (
    <StandalonePage>
      <PageHeading>{t('auth.reset.title')}</PageHeading>
      {done ? (
        <Card tone="health" role="status">
          {t('auth.reset.done')}
        </Card>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <FormError message={linkProblem ?? formError} />
          <Input
            label={t('auth.reset.newPassword')}
            type="password"
            autoComplete="new-password"
            hint={t('auth.passwordHint', { count: MIN_PASSWORD_LENGTH })}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <Button type="submit" size="lg" fullWidth disabled={pending || !token || !email}>
            {t('auth.reset.submit')}
          </Button>
        </form>
      )}
      <Link
        to={done ? '/sign-in' : '/forgot-password'}
        className="inline-flex min-h-touch items-center font-semibold underline"
      >
        {t(done ? 'auth.backToSignIn' : 'auth.reset.requestNew')}
      </Link>
    </StandalonePage>
  )
}
