import { ApiError, authApi, useSession } from '@/lib/api'
import { readStoredSessionStatus } from '@/lib/api/tokenStorage'
import { googleDeletionCallbackPath, takeGoogleDeletionCallback } from './googleDeletionCallback'

const storageKey = 'loomora.google-deletion'
const browserSecret = /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/
const challengeId = /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i

interface PendingChallenge {
  id: string
  verifier: string
  state: string
  expiresAt: number
  userId: string
  sessionDigest: string
}

interface GoogleSession {
  generation: number
  userId: string
  token: string
}

interface ConfirmedProof {
  id: string
  verifier: string
  expiresAt: number
  session: GoogleSession
}

export type GoogleDeletionFailure =
  | 'cancelled'
  | 'expired'
  | 'invalid'
  | 'offline'
  | 'rateLimited'
  | 'sessionChanged'
  | 'unavailable'
  | 'requestRejected'
  | 'failed'

export type VerificationResult =
  { status: 'verified'; proof: ConfirmedProof } | { status: 'error'; reason: GoogleDeletionFailure }

function currentGoogleSession(): GoogleSession | null {
  const { generation, user, token } = useSession.getState()
  const { session } = readStoredSessionStatus()
  if (
    !token ||
    user?.has_password !== false ||
    session?.token !== token ||
    session.user.id !== user.id
  ) {
    return null
  }
  return { generation, userId: user.id, token }
}

export function matchesGoogleSession(original: GoogleSession) {
  const current = currentGoogleSession()
  return (
    current?.generation === original.generation &&
    current.userId === original.userId &&
    current.token === original.token
  )
}

/** Only called after DELETE returns 204. The original bearer may have expired during the request. */
export function clearDeletedGoogleSession(original: GoogleSession) {
  const current = useSession.getState()
  const { session } = readStoredSessionStatus(null)
  if (
    current.generation === original.generation &&
    current.token === original.token &&
    current.user?.id === original.userId &&
    session?.token === original.token &&
    session.user.id === original.userId
  ) {
    current.signOut()
    return true
  }
  return false
}

export function clearGoogleDeletionChallenge() {
  try {
    sessionStorage.removeItem(storageKey)
  } catch {
    // No usable tab storage.
  }
}

function takeChallenge(): PendingChallenge | null {
  try {
    const raw = sessionStorage.getItem(storageKey)
    sessionStorage.removeItem(storageKey)
    if (!raw) return null
    const challenge = JSON.parse(raw) as Partial<PendingChallenge> | null
    if (
      typeof challenge?.id !== 'string' ||
      !challengeId.test(challenge.id) ||
      typeof challenge.verifier !== 'string' ||
      !browserSecret.test(challenge.verifier) ||
      typeof challenge.state !== 'string' ||
      !browserSecret.test(challenge.state) ||
      typeof challenge.expiresAt !== 'number' ||
      !Number.isFinite(challenge.expiresAt) ||
      typeof challenge.userId !== 'string' ||
      typeof challenge.sessionDigest !== 'string' ||
      !browserSecret.test(challenge.sessionDigest)
    )
      return null
    return challenge as PendingChallenge
  } catch {
    return null
  }
}

function base64Url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return base64Url(new Uint8Array(hash))
}

export function googleDeletionError(error: unknown): GoogleDeletionFailure {
  if (!navigator.onLine) return 'offline'
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'sessionChanged'
      case 403:
      case 415:
        return 'requestRejected'
      case 422:
        return 'invalid'
      case 429:
        return 'rateLimited'
      case 503:
        return 'unavailable'
    }
  }
  return 'failed'
}

export async function startGoogleDeletion(
  signal: AbortSignal,
): Promise<GoogleDeletionFailure | 'redirecting'> {
  clearGoogleDeletionChallenge()
  if (!navigator.onLine) return 'offline'
  const original = currentGoogleSession()
  if (!original) return 'sessionChanged'

  try {
    const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)))
    const [browserChallenge, sessionDigest] = await Promise.all([
      digest(verifier),
      digest(original.token),
    ])
    if (!matchesGoogleSession(original)) return 'sessionChanged'
    signal.throwIfAborted()
    const challenge = await authApi.startGoogleDeletion(browserChallenge, signal)
    if (!matchesGoogleSession(original)) return 'sessionChanged'
    const expiresAt = Date.parse(challenge.expires_at)
    if (expiresAt <= Date.now()) return 'expired'
    const url = new URL(challenge.authorization_url)
    const [state, duplicateState] = url.searchParams.getAll('state')
    if (
      !Number.isFinite(expiresAt) ||
      !challengeId.test(challenge.id) ||
      url.origin !== 'https://accounts.google.com' ||
      url.pathname !== '/o/oauth2/v2/auth' ||
      url.username ||
      url.password ||
      url.hash ||
      !state ||
      duplicateState !== undefined ||
      !browserSecret.test(state) ||
      url.searchParams.getAll('redirect_uri').length !== 1 ||
      url.searchParams.get('redirect_uri') !== window.location.origin + googleDeletionCallbackPath
    )
      return 'invalid'

    const pending: PendingChallenge = {
      id: challenge.id,
      verifier,
      state,
      expiresAt,
      userId: original.userId,
      sessionDigest,
    }
    sessionStorage.setItem(storageKey, JSON.stringify(pending))
    // Disown any opener before leaving so a legitimate initiating tab can return independently.
    if (window.opener) window.opener = null
    window.location.assign(url.href)
    return 'redirecting'
  } catch (error) {
    clearGoogleDeletionChallenge()
    return signal.aborted ? 'cancelled' : googleDeletionError(error)
  }
}

function verificationError(reason: GoogleDeletionFailure): VerificationResult {
  return { status: 'error', reason }
}

export async function verifyGoogleDeletion(signal?: AbortSignal): Promise<VerificationResult> {
  const params = takeGoogleDeletionCallback()
  const pending = takeChallenge()
  if (!pending || !params || window.opener) return verificationError('invalid')
  if (pending.expiresAt <= Date.now()) return verificationError('expired')
  const states = params.getAll('state')
  if (states.length !== 1 || states[0] !== pending.state) return verificationError('invalid')

  if (params.has('error')) {
    return verificationError(
      params.getAll('error').length === 1 &&
        params.get('error') === 'access_denied' &&
        !params.has('code')
        ? 'cancelled'
        : 'invalid',
    )
  }
  const codes = params.getAll('code')
  const code = codes[0]
  if (codes.length !== 1 || !code || code.length > 2048 || !/^[\x21-\x7e]+$/.test(code)) {
    return verificationError('invalid')
  }
  if (!navigator.onLine) return verificationError('offline')
  const original = currentGoogleSession()
  if (!original || original.userId !== pending.userId) return verificationError('sessionChanged')
  try {
    if (
      (await digest(original.token)) !== pending.sessionDigest ||
      !matchesGoogleSession(original)
    ) {
      return verificationError('sessionChanged')
    }
    if (pending.expiresAt <= Date.now()) return verificationError('expired')
    signal?.throwIfAborted()
    const verified = await authApi.verifyGoogleDeletion(
      {
        challenge_id: pending.id,
        browser_verifier: pending.verifier,
        state: pending.state,
        code,
      },
      signal,
    )
    if (!matchesGoogleSession(original)) return verificationError('sessionChanged')
    const expiresAt = Math.min(pending.expiresAt, Date.parse(verified.expires_at))
    if (!Number.isFinite(expiresAt) || verified.id !== pending.id)
      return verificationError('invalid')
    if (expiresAt <= Date.now()) return verificationError('expired')
    return {
      status: 'verified',
      proof: { id: pending.id, verifier: pending.verifier, expiresAt, session: original },
    }
  } catch (error) {
    return verificationError(signal?.aborted ? 'cancelled' : googleDeletionError(error))
  }
}
