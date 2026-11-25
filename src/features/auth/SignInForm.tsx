import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '@/components/ui'
import { authApi, useSession } from '@/lib/api'
import { AuthLink } from './AuthLayout'
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
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  function submit(event: FormEvent) {
    event.preventDefault()
    const problems: Record<string, string> = {}
    if (!isEmail(email)) problems.email = t('auth.errors.emailInvalid')
    if (!password) problems.password = t('auth.errors.passwordRequired')
    setClientErrors(problems)
    if (Object.keys(problems).length > 0) return

    const startGeneration = useSession.getState().generation
    void run(async () => {
      const answer = await authApi.login({ email: email.trim(), password })
      if (mounted.current && useSession.getState().generation === startGeneration) signIn(answer)
    })
  }

  return (
    <form onSubmit={submit} noValidate aria-busy={pending} className="flex flex-col gap-4">
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
      <div className="-mt-2 flex justify-end">
        <AuthLink to="/forgot-password">{t('auth.forgotLink')}</AuthLink>
      </div>
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {t(pending ? 'auth.signingIn' : 'auth.signInSubmit')}
      </Button>
    </form>
  )
}
