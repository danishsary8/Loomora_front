import { useSession } from '@/lib/api/session'
import { newId } from '@/lib/id'
import type { GuestDatabase } from '@/lib/storage/db'
import type { GuestFocusSessionRepository } from '@/lib/storage/GuestFocusSessionRepository'
import { openGuestDatabase } from '@/lib/storage/openGuestDatabase'
import type { ServerFocusSessionRepository } from '@/lib/storage/ServerFocusSessionRepository'
import { FocusRuntime, observeFocusRuntime } from './focusRuntime'

const clockSource = newId()
const clock = () => ({
  source: clockSource,
  mono: Math.floor(performance.timeOrigin + performance.now()),
  wall: Date.now(),
})

async function loginFingerprint(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function connectFocusRuntime(
  database: GuestDatabase | undefined,
  repository: GuestFocusSessionRepository | ServerFocusSessionRepository,
  generation: number,
) {
  const session = useSession.getState()
  const owner = session.user?.id
  const token = session.token
  const expires = session.expiresAt ? Date.parse(session.expiresAt) : 0
  const isCurrent = () => {
    const current = useSession.getState()
    return (
      current.generation === generation &&
      current.token === token &&
      current.user?.id === owner &&
      (token === null || expires > Date.now())
    )
  }
  if (!isCurrent() || (token && !owner) || (token ? 'account' : 'guest') !== repository.mode) return

  // A bearer is never stored in a timer row. The fingerprint survives reloads and differs
  // after sign-in so an unobserved auth change cannot add time to an old account timer.
  const login = token ? await loginFingerprint(token) : null
  if (!isCurrent()) return

  const runtime = new FocusRuntime({
    db: () => (database ? Promise.resolve(database) : openGuestDatabase()),
    scope: owner ? `account:${owner}` : 'guest',
    login,
    isCurrent,
    repository,
    clock,
    lock: async (name, operation) =>
      navigator.locks ? await navigator.locks.request(name, operation) : operation(),
  })

  const stop = observeFocusRuntime(runtime)
  let suspended = false
  let expiryTimer: ReturnType<typeof setTimeout> | undefined
  const suspendIfChanged = () => {
    if (suspended || isCurrent()) return
    suspended = true
    clearTimeout(expiryTimer)
    stop()
    // A sleeping tab can learn of expiry late. Keep only its verified checkpoint.
    void runtime.suspend(token !== null && expires <= Date.now()).catch(() => undefined)
  }
  function watchExpiry() {
    clearTimeout(expiryTimer)
    suspendIfChanged()
    if (token && !suspended) {
      expiryTimer = setTimeout(watchExpiry, Math.min(expires - Date.now(), 2_147_483_647))
    }
  }
  const unsubscribe = useSession.subscribe(suspendIfChanged)
  window.addEventListener('pageshow', watchExpiry)
  window.addEventListener('focus', watchExpiry)
  document.addEventListener('visibilitychange', watchExpiry)
  watchExpiry()
  return {
    runtime,
    disconnect() {
      suspendIfChanged()
      unsubscribe()
      clearTimeout(expiryTimer)
      window.removeEventListener('pageshow', watchExpiry)
      window.removeEventListener('focus', watchExpiry)
      document.removeEventListener('visibilitychange', watchExpiry)
      stop()
    },
  }
}
