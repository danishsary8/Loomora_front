import { useTranslation } from 'react-i18next'
import { Link, useRouteError } from 'react-router-dom'
import { RecoveryPage } from '@/components/page'
import { Button, buttonClasses } from '@/components/ui'
import { errorMessageKey } from '@/lib/api'

/** Router error boundary: friendly text only, never the raw error message. */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  return (
    <RecoveryPage
      alert
      title={t('routeError.title')}
      message={t(errorMessageKey(error))}
      actions={
        <>
          <Button size="lg" fullWidth onClick={() => window.location.reload()}>
            {t('common.retry')}
          </Button>
          <Link
            to="/today"
            className={buttonClasses({ as: 'link', variant: 'secondary', fullWidth: true })}
          >
            {t('routeError.goToToday')}
          </Link>
        </>
      }
    />
  )
}
