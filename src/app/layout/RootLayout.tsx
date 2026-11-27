import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/states'
import { usePwaUpdate } from '@/app/pwaUpdate'
import { useServiceStatus, useSession } from '@/lib/api'
import { runWhenIdle } from '@/lib/lazyWithPreload'
import { OfflineBanner } from './OfflineBanner'

const PwaUpdateBanner = lazy(() =>
  import('./PwaUpdateBanner').then((m) => ({ default: m.PwaUpdateBanner })),
)
const ServiceDownBanner = lazy(() =>
  import('./ServiceDownBanner').then((m) => ({ default: m.ServiceDownBanner })),
)
const SavePlanImport = lazy(() =>
  import('@/features/auth/SavePlanImport').then((m) => ({ default: m.SavePlanImport })),
)
const ReminderWatcher = lazy(() =>
  import('@/features/reminders/ReminderWatcher').then((m) => ({ default: m.ReminderWatcher })),
)

export function RootLayout() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const updateStatus = usePwaUpdate((s) => s.status)
  const signedIn = useSession((s) => s.token !== null)
  const serviceDown = useServiceStatus((s) => s.down)
  const [idleReady, setIdleReady] = useState(false)
  const remindersReady = pathname !== '/' || idleReady

  useEffect(() => {
    if (remindersReady) return
    // Defer reminder polling on the landing page until idle so first paint & LCP stay fast.
    return runWhenIdle(() => setIdleReady(true), 1000)
  }, [remindersReady])

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md border-control border-primary bg-paper px-4 py-2.5 text-sm font-semibold text-ink shadow-soft-md focus:not-sr-only focus:fixed focus:left-4 focus:top-[calc(1rem+env(safe-area-inset-top))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {t('common.skipToContent')}
      </a>
      {updateStatus !== 'idle' && (
        <Suspense fallback={null}>
          <PwaUpdateBanner />
        </Suspense>
      )}
      <OfflineBanner />
      {signedIn && serviceDown && (
        <Suspense fallback={null}>
          <ServiceDownBanner />
        </Suspense>
      )}
      {signedIn && (
        <Suspense fallback={null}>
          <SavePlanImport />
        </Suspense>
      )}
      {remindersReady && (
        <Suspense fallback={null}>
          <ReminderWatcher />
        </Suspense>
      )}
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-4 pt-8">
            <LoadingState />
          </div>
        }
      >
        <Outlet />
      </Suspense>
      <ScrollRestoration />
    </>
  )
}
