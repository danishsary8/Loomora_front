import { useTranslation } from 'react-i18next'
import { useBackendOutage, useSession } from '@/lib/api'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

/** Shown on every screen while offline. The plan lives on the device for guests, so it keeps working. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const isAccount = useSession((s) => s.token !== null)
  const isOutage = useBackendOutage((s) => s.isOutage)

  // In account mode with an active outage banner, avoid duplicate banners.
  if (isAccount && isOutage) return null

  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="border-b-thick border-ink bg-category-work px-4 py-2 text-center text-sm font-bold">
          {isAccount ? t('offline.accountBanner') : t('offline.banner')}
        </p>
      )}
    </div>
  )
}
