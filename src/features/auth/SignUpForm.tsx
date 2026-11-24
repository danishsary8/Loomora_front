import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Input } from '@/components/ui'
import { authApi, useSession } from '@/lib/api'
import { FormError } from './FormError'
import { deviceTimeZone } from './timezone'
import { MIN_PASSWORD_LENGTH, isEmail, nameFromEmail } from './validation'
import { useFormAction } from './useFormAction'

export function SignUpForm() {
  const { t } = useTranslation()
  const signIn = useSession((s) => s.signIn)
  const { pending, formError, fieldErrors, setFieldErrors, run } = useFormAction()
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
    if (password.length < MIN_PASSWORD_LENGTH) {
      problems.password = t('auth.errors.passwordShort', { count: MIN_PASSWORD_LENGTH })
    }
    setFieldErrors(problems)
    if (Object.keys(problems).length > 0) return

    const startGeneration = useSession.getState().generation
    void run(async () => {
      const address = email.trim()
      const answer = await authApi.register({
        name: nameFromEmail(address),
        email: address,
        password,
        timezone: deviceTimeZone(),
      })
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
        error={fieldErrors.email}
      />
      <Input
        label={t('auth.password')}
        type="password"
        autoComplete="new-password"
        hint={t('auth.passwordHint', { count: MIN_PASSWORD_LENGTH })}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {t(pending ? 'auth.signingUp' : 'auth.signUpSubmit')}
      </Button>
    </form>
  )
}
