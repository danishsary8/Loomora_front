import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { ApiError, authApi, errorMessageKey } from '@/lib/api'
import { FormError } from './FormError'

type Outcome = { kind: 'sent' } | { kind: 'failed'; message: string }

/** Asks the API for a new confirmation email (needs a signed-in user). */
export function ResendVerification() {
  const { t } = useTranslation()
  const [pending, setPending] = useState(false)
  const [outcome, setOutcome] = useState<Outcome | undefined>()

  function failure(error: unknown): string {
    if (error instanceof ApiError && error.isRateLimited && error.retryAfter) {
      return t('auth.resend.wait', { count: Math.ceil(error.retryAfter / 60) })
    }
    return t(errorMessageKey(error))
  }

  async function resend() {
    setPending(true)
    setOutcome(undefined)
    try {
      await authApi.resendVerification()
      setOutcome({ kind: 'sent' })
    } catch (error) {
      setOutcome({ kind: 'failed', message: failure(error) })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" fullWidth disabled={pending} onClick={() => void resend()}>
        {t(pending ? 'auth.resend.sending' : 'auth.resend.action')}
      </Button>
      {outcome?.kind === 'sent' && (
        <p role="status" className="font-semibold">
          {t('auth.resend.sent')}
        </p>
      )}
      <FormError message={outcome?.kind === 'failed' ? outcome.message : undefined} />
    </div>
  )
}
