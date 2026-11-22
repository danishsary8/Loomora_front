import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { Button, Card } from '@/components/ui'
import { FormError } from '@/features/auth/FormError'
import { authApi, useSession } from '@/lib/api'
import {
  clearDeletedGoogleSession,
  googleDeletionError,
  matchesGoogleSession,
  verifyGoogleDeletion,
  type VerificationResult,
} from './googleDeletion'

type Stage = VerificationResult | { status: 'verifying' | 'deleting' | 'deleted' }

export function GoogleDeletionCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const heading = useRef<HTMLDivElement>(null)
  const back = useRef<HTMLButtonElement>(null)
  const verification = useRef<{
    controller: AbortController
    result: Promise<VerificationResult>
  } | null>(null)
  const lifecycle = useRef({ effectPass: 0 })
  const abandoned = useRef(false)
  const deleting = useRef(false)
  const [stage, setStage] = useState<Stage>({ status: 'verifying' })
  const proof = stage.status === 'verified' ? stage.proof : null

  useEffect(() => {
    if (
      (stage.status === 'error' || stage.status === 'deleted') &&
      document.activeElement === document.body
    ) {
      back.current?.focus()
    }
  }, [stage.status])

  useEffect(() => {
    heading.current?.focus()

    // Both StrictMode effect passes observe the same verification request.
    if (!verification.current) {
      const controller = new AbortController()
      verification.current = { controller, result: verifyGoogleDeletion(controller.signal) }
    }
    const mount = lifecycle.current
    const pass = ++mount.effectPass
    const { controller, result } = verification.current
    let mounted = true
    void result.then((outcome) => {
      if (!mounted) return
      verification.current = null
      if (!abandoned.current) setStage(outcome)
    })
    function leavePage() {
      abandoned.current = true
      controller.abort()
      setStage((current) =>
        current.status === 'deleted' || current.status === 'deleting'
          ? current
          : { status: 'error', reason: 'cancelled' },
      )
    }
    window.addEventListener('pagehide', leavePage)
    return () => {
      mounted = false
      window.removeEventListener('pagehide', leavePage)
      // A StrictMode setup immediately follows its development-only cleanup.
      queueMicrotask(() => {
        if (mount.effectPass === pass) controller.abort()
      })
    }
  }, [])

  useEffect(() => {
    if (!proof) return
    const timer = window.setTimeout(
      () => setStage({ status: 'error', reason: 'expired' }),
      Math.max(0, proof.expiresAt - Date.now()),
    )
    const unsubscribe = useSession.subscribe(() => {
      if (!matchesGoogleSession(proof.session)) {
        setStage((current) =>
          current.status === 'verified' ? { status: 'error', reason: 'sessionChanged' } : current,
        )
      }
    })
    return () => {
      window.clearTimeout(timer)
      unsubscribe()
    }
  }, [proof])

  async function confirm() {
    if (!proof || deleting.current || abandoned.current) return
    if (!matchesGoogleSession(proof.session)) {
      setStage({ status: 'error', reason: 'sessionChanged' })
      return
    }
    if (proof.expiresAt <= Date.now()) {
      setStage({ status: 'error', reason: 'expired' })
      return
    }
    if (!navigator.onLine) {
      setStage({ status: 'error', reason: 'offline' })
      return
    }

    deleting.current = true
    setStage({ status: 'deleting' })
    try {
      await authApi.deleteMeWithGoogle({ challenge_id: proof.id, browser_verifier: proof.verifier })
      setStage(
        clearDeletedGoogleSession(proof.session)
          ? { status: 'deleted' }
          : { status: 'error', reason: 'sessionChanged' },
      )
    } catch (error) {
      setStage({ status: 'error', reason: googleDeletionError(error) })
    } finally {
      deleting.current = false
    }
  }

  const deleted = stage.status === 'deleted'
  return (
    <StandalonePage>
      <div ref={heading} tabIndex={-1}>
        <PageHeading>{t('profile.deleteTitle')}</PageHeading>
      </div>
      <Card className="flex flex-col gap-4">
        {stage.status === 'verifying' && (
          <p role="status">{t('profile.googleDeletion.verifying')}</p>
        )}
        {stage.status === 'deleting' && <p role="status">{t('profile.deleting')}</p>}
        {deleted && <p role="status">{t('profile.googleDeletion.deleted')}</p>}
        {stage.status === 'error' && (
          <FormError message={t(`profile.googleDeletion.${stage.reason}`)} />
        )}
        {proof && (
          <>
            <p role="status">{t('profile.googleDeletion.verified')}</p>
            <p className="font-semibold">{t('profile.deleteWarning')}</p>
            <Button variant="danger" size="lg" fullWidth onClick={() => void confirm()}>
              {t('profile.deleteConfirm')}
            </Button>
          </>
        )}
        <Button
          ref={back}
          variant="secondary"
          size="lg"
          fullWidth
          disabled={stage.status === 'deleting'}
          onClick={() => {
            abandoned.current = true
            verification.current?.controller.abort()
            navigate(deleted ? '/' : '/profile', { replace: true })
          }}
        >
          {t(
            deleted
              ? 'profile.googleDeletion.done'
              : stage.status === 'error'
                ? 'profile.googleDeletion.back'
                : 'common.cancel',
          )}
        </Button>
      </Card>
    </StandalonePage>
  )
}
