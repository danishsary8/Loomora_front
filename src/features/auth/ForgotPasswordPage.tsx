import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '@/components/ui'
import { authApi } from '@/lib/api'
import { AuthLayout, AuthLink } from './AuthLayout'
import { FormError, FormSuccess } from './FormError'
import { isEmail } from './validation'
import { useFormAction } from './useFormAction'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { pending, formError, fieldErrors, setFieldErrors, run } = useFormAction()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!isEmail(email)) {
      setFieldErrors({ email: t('auth.errors.emailInvalid') })
      return
    }
    void run(async () => {
      await authApi.forgotPassword(email.trim())
      setSent(true)
    })
  }

  return (
    <AuthLayout
      title={t('auth.forgot.title')}
      subtitle={sent ? undefined : t('auth.forgot.intro')}
      links={<AuthLink to="/sign-in">{t('auth.backToSignIn')}</AuthLink>}
    >
      {sent ? (
        <FormSuccess>{t('auth.forgot.sent')}</FormSuccess>
      ) : (
        <form onSubmit={submit} noValidate aria-busy={pending} className="flex flex-col gap-4">
          <FormError message={formError} />
          <Input
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />
          <Button type="submit" size="lg" fullWidth disabled={pending}>
            {t(pending ? 'auth.forgot.sending' : 'auth.forgot.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
