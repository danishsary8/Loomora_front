import { useTranslation } from 'react-i18next'
import { buttonClasses } from '@/components/ui'
import { authApi, type GoogleIntent } from '@/lib/api'
import { deviceTimeZone } from './timezone'

/** Starts Google sign-in with a full page visit, as the API requires (a link, not fetch). */
export function GoogleButton({ intent }: { intent: GoogleIntent }) {
  const { t } = useTranslation()
  return (
    <a
      href={authApi.googleRedirectUrl(intent, deviceTimeZone())}
      className={buttonClasses({ variant: 'secondary', size: 'lg', fullWidth: true, as: 'link' })}
    >
      {t(intent === 'sign_in' ? 'auth.googleSignIn' : 'auth.googleSignUp')}
    </a>
  )
}
