import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { FormError } from '@/features/auth/FormError'
import { useSession } from '@/lib/api'
import {
  clearGoogleDeletionChallenge,
  startGoogleDeletion,
  type GoogleDeletionFailure,
} from './googleDeletion'

export function GoogleDeletionStart() {
  const { t } = useTranslation()
  const request = useRef<AbortController | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<GoogleDeletionFailure>()

  useEffect(() => {
    function discard() {
      request.current?.abort()
      request.current = null
      clearGoogleDeletionChallenge()
    }

    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) {
        discard()
        setStarting(false)
        setError('cancelled')
      }
    }

    const generation = useSession.getState().generation
    const unsubscribe = useSession.subscribe((session) => {
      if (session.generation !== generation || session.user?.has_password !== false) discard()
    })
    window.addEventListener('pageshow', onPageShow)
    return () => {
      discard()
      unsubscribe()
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [])

  async function start() {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setStarting(true)
    setError(undefined)
    const result = await startGoogleDeletion(controller.signal)
    if (controller.signal.aborted || result === 'redirecting') return
    request.current = null
    setStarting(false)
    setError(result)
  }

  return (
    <>
      <p className="text-sm">{t('profile.googleDeletion.intro')}</p>
      <FormError message={error && t(`profile.googleDeletion.${error}`)} />
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        disabled={starting}
        onClick={() => void start()}
      >
        {t(starting ? 'profile.googleDeletion.redirecting' : 'profile.googleDeletion.verify')}
      </Button>
    </>
  )
}
