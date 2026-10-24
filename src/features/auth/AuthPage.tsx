import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { EmptyState } from '@/components/states'

// S10 Sign in / Sign up. The forms arrive with the account tasks (P4).
export function AuthPage({ mode }: { mode: 'signIn' | 'signUp' }) {
  const { t } = useTranslation()
  const other = mode === 'signIn' ? '/sign-up' : '/sign-in'
  return (
    <StandalonePage>
      <PageHeading>{t(`pages.${mode}.title`)}</PageHeading>
      <EmptyState title={t('states.emptyTitle')} message={t('states.emptyMessage')} />
      <Link to={other} className="inline-flex min-h-touch items-center font-semibold underline">
        {t(`pages.${mode}.switch`)}
      </Link>
    </StandalonePage>
  )
}

export function SignInPage() {
  return <AuthPage mode="signIn" />
}

export function SignUpPage() {
  return <AuthPage mode="signUp" />
}
