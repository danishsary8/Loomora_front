import { Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, ScrollRestoration } from 'react-router-dom'
import { LoadingState } from '@/components/states'
import { SavePlanImport } from '@/features/auth/SavePlanImport'
import { OfflineBanner } from './OfflineBanner'

export function RootLayout() {
  const { t } = useTranslation()
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-md border-thick border-ink bg-paper px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        {t('common.skipToContent')}
      </a>
      <OfflineBanner />
      <SavePlanImport />
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
