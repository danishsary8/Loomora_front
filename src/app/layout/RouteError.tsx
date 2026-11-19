import { useTranslation } from 'react-i18next'
import { Link, useRouteError } from 'react-router-dom'
import { ErrorState } from '@/components/states'
import { buttonClasses } from '@/components/ui'
import { errorMessageKey } from '@/lib/api'

/** Router error boundary: friendly text only, never the raw error message. */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  return (
    <main id="main" className="mx-auto max-w-lg px-4 pt-12">
      <ErrorState
        message={t(errorMessageKey(error))}
        onRetry={() => window.location.reload()}
        actions={
          <Link to="/today" className={buttonClasses({ as: 'link', fullWidth: true })}>
            {t('routeError.goToToday')}
          </Link>
        }
      />
    </main>
  )
}
