import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBackendOutage, useSession } from '@/lib/api'

/**
 * Account mode top banner shown when an API request fails with a network error or 5xx.
 * Polls GET /health every 30 seconds until recovered, and allows manual retry.
 * The message explicitly avoids promising offline sync since outbox sync does not exist yet.
 */
export function BackendOutageBanner() {
  const { t } = useTranslation()
  const isAccount = useSession((s) => s.token !== null)
  const isOutage = useBackendOutage((s) => s.isOutage)
  const isChecking = useBackendOutage((s) => s.isChecking)
  const checkHealth = useBackendOutage((s) => s.checkHealth)
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!isAccount || !isOutage) return

    const interval = window.setInterval(async () => {
      const recovered = await checkHealth()
      if (recovered) {
        void queryClient.invalidateQueries()
      }
    }, 30000)

    return () => window.clearInterval(interval)
  }, [isAccount, isOutage, checkHealth, queryClient])

  if (!isAccount || !isOutage) return null

  const handleRetry = async () => {
    const recovered = await checkHealth()
    if (recovered) {
      void queryClient.invalidateQueries()
    }
  }

  return (
    <aside
      role="alert"
      aria-live="assertive"
      className="border-b-thick border-ink bg-category-work px-4 py-2 font-bold"
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
        <p className="flex-1 text-sm">{t('backendOutage.banner')}</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isChecking}
          className="rounded-md border-thick border-ink bg-paper px-3 py-1 text-xs font-bold shadow-hard-xs active:translate-y-px disabled:opacity-50"
        >
          {isChecking ? t('common.loading') : t('backendOutage.retry')}
        </button>
      </div>
    </aside>
  )
}
