import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '@/lib/api'

/** Screens that need an account: signed-out visitors go to Sign in. */
export function RequireAuth() {
  const signedIn = useSession((s) => s.token !== null)
  return signedIn ? <Outlet /> : <Navigate to="/sign-in" replace />
}

/**
 * Sign in and Sign up are for signed-out visitors. Once the session exists (also right after
 * the form succeeds) they move on: to the survey for a new account, otherwise to Today.
 */
export function RedirectIfSignedIn() {
  const user = useSession((s) => s.user)
  if (!user) return <Outlet />
  return <Navigate to={user.survey_done ? '/today' : '/sign-up/survey'} replace />
}
