import { useTranslation } from 'react-i18next'
import { Link, useRouteError } from 'react-router-dom'
import { ErrorState } from '@/components/states'
import { buttonClasses } from '@/components/ui'
import { mapApiError } from '@/lib/api'

/** Router error boundary: shown when a screen throws or fails to load. */
export function RouteError() {
  const { t } = useTranslation()
  const error = useRouteError()
  const mapped = mapApiError(error, t)

  return (
    <main id="main" className="mx-auto max-w-lg px-4 pt-12">
      <ErrorState
        title={mapped.title}
        message={mapped.message}
        onRetry={() => window.location.reload()}
        action={
          <Link to="/today" className={buttonClasses({ as: 'link', variant: 'secondary' })}>
            {t('common.goToToday')}
          </Link>
        }
      />
    </main>
  )
}
