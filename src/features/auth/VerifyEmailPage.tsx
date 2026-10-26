import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeading, StandalonePage } from '@/components/page'
import { LoadingState } from '@/components/states'
import { Card } from '@/components/ui'
import { authApi, useSession } from '@/lib/api'

type Status = 'checking' | 'verified' | 'failed'

/** The email link opens here with `?id=&expires=&signature=`; the three values go to the API. */
export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const signedIn = useSession((s) => s.token !== null)
  const setUser = useSession((s) => s.setUser)
  const id = params.get('id')
  const expires = Number(params.get('expires'))
  const signature = params.get('signature')
  const hasLink = Boolean(id && expires && signature)
  const [status, setStatus] = useState<Status>(hasLink ? 'checking' : 'failed')
  const started = useRef(false)

  useEffect(() => {
    if (!id || !signature || !hasLink || started.current) return
    started.current = true
    authApi.verifyEmail({ id, expires, signature }).then(
      ({ user }) => {
        if (useSession.getState().user?.id === user.id) setUser(user)
        setStatus('verified')
      },
      () => setStatus('failed'),
    )
  }, [id, expires, signature, hasLink, setUser])

  return (
    <StandalonePage>
      <PageHeading>{t('auth.verify.title')}</PageHeading>
      {status === 'checking' && <LoadingState />}
      {status === 'verified' && (
        <Card tone="health" role="status">
          {t('auth.verify.done')}
        </Card>
      )}
      {status === 'failed' && (
        <Card tone="life" role="alert">
          {t('auth.verify.failed')}
        </Card>
      )}
      <Link
        to={signedIn ? '/today' : '/sign-in'}
        className="inline-flex min-h-touch items-center font-semibold underline"
      >
        {t(signedIn ? 'auth.verify.toToday' : 'auth.backToSignIn')}
      </Link>
    </StandalonePage>
  )
}
