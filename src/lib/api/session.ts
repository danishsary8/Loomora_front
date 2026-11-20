import { create } from 'zustand'
import {
  clearSession,
  isSessionExpired,
  isStoredSession,
  parseStoredSession,
  readSession,
  SESSION_STORAGE_KEY,
  writeSession,
  type StoredSession,
} from './tokenStorage'
import type { TokenResponse, User } from './types'

interface SessionState {
  generation: number
  token: string | null
  expiresAt: string | null
  user: User | null
  /** Keep the token and user from a sign-in or sign-up answer. */
  signIn: (answer: TokenResponse) => void
  /** Replace the user after a change (survey, email verified). */
  setUser: (user: User) => void
  /** Forget the token and user on this device. */
  signOut: () => void
}

interface CrossTabSessionMessage {
  sender: string
  session: StoredSession | null
}

const TAB_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

function createSessionChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel !== 'function') return null
  try {
    return new BroadcastChannel(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

const channel = createSessionChannel()

function postCrossTabSession(session: StoredSession | null): void {
  if (!channel) return
  try {
    const message: CrossTabSessionMessage = { sender: TAB_ID, session }
    channel.postMessage(message)
  } catch {
    // Channel closed or message clone blocked.
  }
}

function sameJsonValue(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b || a === null || b === null) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => sameJsonValue(item, b[index]))
  }
  const aObj = a as Record<string, unknown>
  const bObj = b as Record<string, unknown>
  const keys = Object.keys(aObj)
  if (keys.length !== Object.keys(bObj).length) return false
  return keys.every((key) => Object.hasOwn(bObj, key) && sameJsonValue(aObj[key], bObj[key]))
}

function isCrossTabMessage(value: unknown): value is CrossTabSessionMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  if (typeof message.sender !== 'string') return false
  if (message.session === null) return true
  return isStoredSession(message.session) && !isSessionExpired(message.session)
}

const saved = readSession()

/** Auth state: the bearer token (with its expiry) and the signed-in user. */
export const useSession = create<SessionState>((set, get) => ({
  generation: 0,
  token: saved?.token ?? null,
  expiresAt: saved?.expiresAt ?? null,
  user: saved?.user ?? null,
  signIn: ({ token, expires_at, user }) => {
    const next: StoredSession = { token, expiresAt: expires_at, user }
    writeSession(next)
    set(({ generation }) => ({ token, expiresAt: expires_at, user, generation: generation + 1 }))
    postCrossTabSession(next)
  },
  setUser: (user) => {
    const { token, expiresAt, user: currentUser } = get()
    if (!token || !expiresAt) return
    if (currentUser && currentUser.id !== user.id) return
    const next: StoredSession = { token, expiresAt, user }
    writeSession(next)
    set({ user })
    postCrossTabSession(next)
  },
  signOut: () => {
    const { token, expiresAt, user } = get()
    clearSession()
    if (token === null && expiresAt === null && user === null) return
    set(({ generation }) => ({
      token: null,
      expiresAt: null,
      user: null,
      generation: generation + 1,
    }))
    postCrossTabSession(null)
  },
}))

/** Apply an external session snapshot without writing back to localStorage or re-broadcasting. */
function applyExternalSession(next: StoredSession | null): void {
  const current = useSession.getState()
  if (next === null) {
    if (current.token === null && current.expiresAt === null && current.user === null) return
    useSession.setState({
      token: null,
      expiresAt: null,
      user: null,
      generation: current.generation + 1,
    })
    return
  }

  const sameIdentity =
    current.token === next.token &&
    current.expiresAt === next.expiresAt &&
    current.user?.id === next.user.id
  if (sameIdentity) {
    if (sameJsonValue(current.user, next.user)) return
    useSession.setState({ user: next.user })
    return
  }

  useSession.setState({
    token: next.token,
    expiresAt: next.expiresAt,
    user: next.user,
    generation: current.generation + 1,
  })
}

function reconcileSessionFromStorage(): void {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    applyExternalSession(parseStoredSession(raw))
  } catch {
    // Storage unavailable in restricted contexts; keep current in-memory session.
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.storageArea && event.storageArea !== localStorage) return
    if (event.key === null) {
      applyExternalSession(null)
      return
    }
    if (event.key !== SESSION_STORAGE_KEY) return
    applyExternalSession(parseStoredSession(event.newValue))
  })

  window.addEventListener('focus', reconcileSessionFromStorage)
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') reconcileSessionFromStorage()
  })
}

if (channel) {
  channel.addEventListener('message', (event: MessageEvent<unknown>) => {
    if (!isCrossTabMessage(event.data) || event.data.sender === TAB_ID) return
    applyExternalSession(event.data.session)
  })
}
