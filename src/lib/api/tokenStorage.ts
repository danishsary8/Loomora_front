import type { User } from './types'

export const SESSION_STORAGE_KEY = 'loomora.session'

export interface StoredSession {
  token: string
  expiresAt: string
  user: User
}

export function isStoredSession(value: unknown): value is StoredSession {
  // Keep reading older saved users. Features resolve missing account fields through GET /me.
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.token === 'string' &&
    typeof v.expiresAt === 'string' &&
    typeof v.user === 'object' &&
    v.user !== null
  )
}

export function isSessionExpired(session: StoredSession, now: Date = new Date()): boolean {
  const expiresAtMs = new Date(session.expiresAt).getTime()
  return !Number.isFinite(expiresAtMs) || expiresAtMs <= now.getTime()
}

/** Parse a raw serialized session string without mutating localStorage. */
export function parseStoredSession(
  raw: string | null,
  now: Date = new Date(),
): StoredSession | null {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isStoredSession(parsed) || isSessionExpired(parsed, now)) return null
    return parsed
  } catch {
    return null
  }
}

/** Read the current session from localStorage without mutating storage. */
export function readStoredSessionStatus(now: Date = new Date()): {
  readable: boolean
  session: StoredSession | null
} {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    return { readable: true, session: parseStoredSession(raw, now) }
  } catch {
    return { readable: false, session: null }
  }
}

/** The saved session, or null when there is none, it is unreadable, or the token has expired. */
export function readSession(now: Date = new Date()): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    const parsed = parseStoredSession(raw, now)
    if (!parsed) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeSession(session: StoredSession): boolean {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
    return true
  } catch {
    // Storage full or blocked: the session still works until the page closes.
    return false
  }
}

export function clearSession(): boolean {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
    return true
  } catch {
    // Nothing stored that we could remove.
    return false
  }
}
