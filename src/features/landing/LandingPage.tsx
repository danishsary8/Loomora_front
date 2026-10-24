import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { StandalonePage } from '@/components/page'
import { buttonClasses } from '@/components/ui'

/** S1 Landing: promise, "Try it now" (guest mode), Sign in. */
export function LandingPage() {
  const { t } = useTranslation()
  return (
    <StandalonePage>
      <div className="flex flex-1 flex-col justify-center gap-6">
        <h1 className="font-script text-7xl font-bold leading-none">{t('common.appName')}</h1>
        <p className="text-xl font-semibold">{t('common.promise')}</p>
        <div className="flex flex-col gap-3">
          <Link to="/today" className={buttonClasses({ as: 'link', size: 'lg', fullWidth: true })}>
            {t('landing.tryItNow')}
          </Link>
          <p className="text-center text-sm text-muted">{t('landing.noSignup')}</p>
          <Link
            to="/sign-in"
            className={buttonClasses({ as: 'link', variant: 'secondary', fullWidth: true })}
          >
            {t('landing.signIn')}
          </Link>
        </div>
      </div>
    </StandalonePage>
  )
}
