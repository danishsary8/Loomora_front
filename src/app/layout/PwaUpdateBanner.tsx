import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { usePwaUpdate } from '@/app/pwaUpdate'

/** Non-blocking banner shown when a new PWA service worker version is waiting. */
export function PwaUpdateBanner() {
  const { t } = useTranslation()
  const status = usePwaUpdate((s) => s.status)
  const requestUpdate = usePwaUpdate((s) => s.requestUpdate)
  const dismiss = usePwaUpdate((s) => s.dismiss)
  const confirmUpdate = usePwaUpdate((s) => s.confirmUpdate)
  const cancelConfirmation = usePwaUpdate((s) => s.cancelConfirmation)
  const keepEditingRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (status === 'confirming') {
      keepEditingRef.current?.focus()
    }
  }, [status])

  if (status === 'idle') return null

  const announcement =
    status === 'available'
      ? t('pwaUpdate.available')
      : status === 'confirming'
        ? t('pwaUpdate.confirmDiscard')
        : status === 'updating'
          ? t('pwaUpdate.updating')
          : t('pwaUpdate.error')

  return (
    <section
      aria-label={t('pwaUpdate.regionLabel')}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && status === 'confirming') {
          event.preventDefault()
          cancelConfirmation()
        }
      }}
      className={cn(
        'relative z-[60] border-b px-4 py-2.5 shadow-soft-sm',
        status === 'error'
          ? 'border-danger/25 bg-paper text-danger'
          : 'border-primary/20 bg-primary-soft text-ink',
      )}
    >
      <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm font-semibold">
          {announcement}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {status === 'available' && (
            <>
              <Button onClick={requestUpdate}>{t('pwaUpdate.updateNow')}</Button>
              <Button variant="secondary" onClick={dismiss}>
                {t('pwaUpdate.later')}
              </Button>
            </>
          )}
          {status === 'confirming' && (
            <>
              <Button variant="danger" onClick={confirmUpdate}>
                {t('pwaUpdate.confirmUpdate')}
              </Button>
              <Button ref={keepEditingRef} variant="secondary" onClick={cancelConfirmation}>
                {t('pwaUpdate.keepEditing')}
              </Button>
            </>
          )}
          {status === 'updating' && (
            <Button disabled aria-busy="true">
              {t('pwaUpdate.updating')}
            </Button>
          )}
          {status === 'error' && (
            <>
              <Button onClick={confirmUpdate}>{t('pwaUpdate.retry')}</Button>
              <Button variant="secondary" onClick={dismiss}>
                {t('pwaUpdate.later')}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
