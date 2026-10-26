import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Input } from '@/components/ui'
import { authApi, useSession } from '@/lib/api'
import { FormError } from './FormError'
import { isEmail } from './validation'
import { useFormAction } from './useFormAction'

export function SignInForm() {
  const { t } = useTranslation()
  const signIn = useSession((s) => s.signIn)
  const { pending, formError, fieldErrors, run } = useFormAction()
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const problems: Record<string, string> = {}
    if (!isEmail(email)) problems.email = t('auth.errors.emailInvalid')
    if (!password) problems.password = t('auth.errors.passwordRequired')
    setClientErrors(problems)
    if (Object.keys(problems).length > 0) return

    void run(async () => {
      signIn(await authApi.login({ email: email.trim(), password }))
    })
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />
      <Input
        label={t('auth.email')}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={
          clientErrors.email ?? (fieldErrors.email ? t('auth.errors.wrongCredentials') : undefined)
        }
      />
      <Input
        label={t('auth.password')}
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={clientErrors.password}
      />
      <Link
        to="/forgot-password"
        className="inline-flex min-h-touch items-center font-semibold underline"
      >
        {t('auth.forgotLink')}
      </Link>
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {t(pending ? 'auth.signingIn' : 'auth.signInSubmit')}
      </Button>
    </form>
  )
}
