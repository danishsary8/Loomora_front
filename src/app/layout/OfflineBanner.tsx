import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

/** Shown on every screen while offline. The plan lives on the device, so it keeps working. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="border-b-thick border-ink bg-category-work px-4 py-2 text-center text-sm font-bold">
          {t('offline.banner')}
        </p>
      )}
    </div>
  )
}
