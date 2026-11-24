import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { AuthDivider, AuthLayout, AuthLink } from './AuthLayout'
import { FormError } from './FormError'
import { GoogleButton } from './GoogleButton'
import { SignInForm } from './SignInForm'
import { SignUpForm } from './SignUpForm'

const GOOGLE_ERRORS = [
  'account_not_found',
  'account_already_exists',
  'email_not_verified',
  'google_failed',
] as const

/** The message for the `?error=` the Google callback page sends back, if any. */
function useGoogleError(): string | undefined {
  const { t } = useTranslation()
  const code = useSearchParams()[0].get('error')
  if (!code) return undefined
  const known = GOOGLE_ERRORS.find((e) => e === code) ?? 'google_failed'
  return t(`auth.googleErrors.${known}`)
}

// S10 Sign in / Sign up.
function AuthPage({ mode }: { mode: 'signIn' | 'signUp' }) {
  const { t } = useTranslation()
  const googleError = useGoogleError()
  const other = mode === 'signIn' ? '/sign-up' : '/sign-in'
  return (
    <AuthLayout
      title={t(`pages.${mode}.title`)}
      subtitle={t(`pages.${mode}.subtitle`)}
      links={<AuthLink to={other}>{t(`pages.${mode}.switch`)}</AuthLink>}
    >
      <FormError message={googleError} />
      <GoogleButton intent={mode === 'signIn' ? 'sign_in' : 'sign_up'} />
      <AuthDivider />
      {mode === 'signIn' ? <SignInForm /> : <SignUpForm />}
    </AuthLayout>
  )
}

export function SignInPage() {
  return <AuthPage mode="signIn" />
}

export function SignUpPage() {
  return <AuthPage mode="signUp" />
}
