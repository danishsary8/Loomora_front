import type { User } from './types'

const KEY = 'loomora.session'

export interface StoredSession {
  token: string
  expiresAt: string
  user: User
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.token === 'string' && typeof v.expiresAt === 'string' && typeof v.user === 'object'
  )
}

/** The saved session, or null when there is none, it is unreadable, or the token has expired. */
export function readSession(now: Date = new Date()): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!isStoredSession(parsed)) return null
    if (new Date(parsed.expiresAt).getTime() <= now.getTime()) {
      localStorage.removeItem(KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function writeSession(session: StoredSession): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Storage full or blocked: the session still works until the page closes.
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing stored that we could remove.
  }
}
