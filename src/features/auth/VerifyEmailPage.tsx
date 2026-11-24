import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { LoadingState } from '@/components/states'
import { authApi, useSession } from '@/lib/api'
import { AuthLayout, AuthLink } from './AuthLayout'
import { FormError, FormSuccess } from './FormError'
import { ResendVerification } from './ResendVerification'

type Status = 'checking' | 'verified' | 'failed'

/** The email link opens here with `?id=&expires=&signature=`; the three values go to the API. */
export function VerifyEmailPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const signedIn = useSession((s) => s.token !== null)
  const setUser = useSession((s) => s.setUser)
  const unverified = useSession((s) => s.token !== null && s.user?.email_verified_at === null)
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
        const current = useSession.getState()
        if (current.token !== null && current.user?.id === user.id) setUser(user)
        setStatus('verified')
      },
      () => setStatus('failed'),
    )
  }, [id, expires, signature, hasLink, setUser])

  return (
    <AuthLayout
      title={t('auth.verify.title')}
      links={
        <AuthLink to={signedIn ? '/today' : '/sign-in'}>
          {t(signedIn ? 'auth.verify.toToday' : 'auth.backToSignIn')}
        </AuthLink>
      }
    >
      {status === 'checking' && <LoadingState />}
      {status === 'verified' && <FormSuccess>{t('auth.verify.done')}</FormSuccess>}
      {status === 'failed' && <FormError message={t('auth.verify.failed')} />}
      {status === 'failed' && unverified && <ResendVerification />}
    </AuthLayout>
  )
}
