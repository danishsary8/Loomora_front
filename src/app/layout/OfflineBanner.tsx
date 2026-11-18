import { useTranslation } from 'react-i18next'
import { useSession } from '@/lib/api'
import { useOnlineStatus } from '@/lib/useOnlineStatus'

/** Shown on every screen while offline. Guests keep working; accounts have no offline sync yet. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const signedIn = useSession((s) => s.token !== null)
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="border-b-thick border-ink bg-category-work px-4 py-2 text-center text-sm font-bold">
          {t(signedIn ? 'offline.bannerAccount' : 'offline.banner')}
        </p>
      )}
    </div>
  )
}
