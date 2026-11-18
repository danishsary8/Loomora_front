import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { StandalonePage } from '@/components/page'
import { LoadingState } from '@/components/states'
import { authApi, useSession } from '@/lib/api'

/** Where the page that started a Google flow shows the failure. */
function pageForError(error: string): string {
  return error === 'account_already_exists' ? '/sign-up' : '/sign-in'
}

/** Google brings the browser back here with `?code=` or `?error=`. Trades the code for a token. */
export function GoogleCallbackPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const signIn = useSession((s) => s.signIn)
  // The code works once, so a repeated effect run (React strict mode) must not send it twice.
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    const code = params.get('code')
    const error = params.get('error')
    if (!code) {
      const reason = error ?? 'google_failed'
      navigate(`${pageForError(reason)}?error=${encodeURIComponent(reason)}`, { replace: true })
      return
    }
    authApi.googleExchange(code).then(
      (answer) => {
        signIn(answer)
        navigate(answer.user.survey_done ? '/today' : '/sign-up/survey', { replace: true })
      },
      () => navigate('/sign-in?error=google_failed', { replace: true }),
    )
  }, [params, navigate, signIn])

  return (
    <StandalonePage>
      <p className="sr-only">{t('auth.googleWorking')}</p>
      <LoadingState />
    </StandalonePage>
  )
}
