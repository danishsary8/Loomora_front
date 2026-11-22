import { lazy, Suspense, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { LoadingState } from '@/components/states'
import { usePwaUpdate } from '@/app/pwaUpdate'
import { useServiceStatus, useSession } from '@/lib/api'
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
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => setIdleReady(true), { timeout: 1000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = globalThis.setTimeout(() => setIdleReady(true), 0)
    return () => globalThis.clearTimeout(id)
  }, [remindersReady])

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md border-thick border-ink bg-paper px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
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
