import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { Button, Card, Input } from '@/components/ui'
import { authApi } from '@/lib/api'
import { FormError } from './FormError'
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
    <StandalonePage>
      <PageHeading>{t('auth.forgot.title')}</PageHeading>
      {sent ? (
        <Card tone="health" role="status">
          {t('auth.forgot.sent')}
        </Card>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <p>{t('auth.forgot.intro')}</p>
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
            {t('auth.forgot.submit')}
          </Button>
        </form>
      )}
      <Link to="/sign-in" className="inline-flex min-h-touch items-center font-semibold underline">
        {t('auth.backToSignIn')}
      </Link>
    </StandalonePage>
  )
}
