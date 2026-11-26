import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { healthApi, useServiceStatus, useSession } from '@/lib/api'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { Button } from '@/components/ui'

const POLL_MS = 30_000

/**
 * Account mode only: shown after a request failed with a network error or a 5xx while online.
 * While offline, OfflineBanner owns the connectivity notice and polling pauses until reconnect.
 * Retry and a 30 s poll ask `GET /health`; once it answers, the banner goes and the screens reload.
 * Guests never call the API, so they never see it.
 */
export function ServiceDownBanner() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const signedIn = useSession((s) => s.token !== null)
  const down = useServiceStatus((s) => s.down)
  const online = useOnlineStatus()
  const visible = signedIn && down && online
  const wasOffline = useRef(!online)

  const check = useCallback(async () => {
    try {
      await healthApi.check()
    } catch {
      return
    }
    useServiceStatus.getState().markUp()
    await queryClient.invalidateQueries()
  }, [queryClient])

  useEffect(() => {
    if (!online) {
      wasOffline.current = true
      return
    }
    if (wasOffline.current && visible) {
      wasOffline.current = false
      void check()
    } else {
      wasOffline.current = false
    }
  }, [online, visible, check])

  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => void check(), POLL_MS)
    return () => window.clearInterval(id)
  }, [visible, check])

  return (
    <div role="status" aria-live="polite">
      {visible && (
        <div className="flex flex-wrap items-center justify-center gap-3 border-b border-warning/20 bg-warning-surface px-4 py-2 text-sm font-semibold text-warning">
          <p>{t('serviceDown.banner')}</p>
          <Button variant="secondary" onClick={() => void check()}>
            {t('serviceDown.retry')}
          </Button>
        </div>
      )}
    </div>
  )
}
