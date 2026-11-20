import { create } from 'zustand'
import {
  clearSession,
  isSessionExpired,
  isStoredSession,
  parseStoredSession,
  readSession,
  readStoredSessionStatus,
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

interface SessionOrder {
  time: number
  seq: number
  sender: string
}

interface CrossTabSessionMessage {
  sender: string
  persisted?: boolean
  order?: SessionOrder
  session: StoredSession | null
}

const TAB_ID =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

let latestOrder: SessionOrder = { time: 0, seq: 0, sender: TAB_ID }

function nextOrder(): SessionOrder {
  const now = Date.now()
  const time = Math.max(now, latestOrder.time)
  const seq = time > latestOrder.time ? 1 : latestOrder.seq + 1
  latestOrder = { time, seq, sender: TAB_ID }
  return latestOrder
}

function isNewerOrder(incoming: SessionOrder, current: SessionOrder): boolean {
  if (incoming.time !== current.time) return incoming.time > current.time
  if (incoming.seq !== current.seq) return incoming.seq > current.seq
  return incoming.sender > current.sender
}

function createSessionChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel !== 'function') return null
  try {
    return new BroadcastChannel(SESSION_STORAGE_KEY)
  } catch {
    return null
  }
}

const channel = createSessionChannel()

function postCrossTabSession(
  session: StoredSession | null,
  persisted: boolean,
  order: SessionOrder,
): void {
  if (!channel) return
  try {
    const message: CrossTabSessionMessage = { sender: TAB_ID, persisted, order, session }
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

function isSessionOrder(value: unknown): value is SessionOrder {
  if (typeof value !== 'object' || value === null) return false
  const order = value as Record<string, unknown>
  return (
    typeof order.time === 'number' &&
    Number.isFinite(order.time) &&
    typeof order.seq === 'number' &&
    Number.isFinite(order.seq) &&
    typeof order.sender === 'string'
  )
}

function isCrossTabMessage(value: unknown): value is CrossTabSessionMessage {
  if (typeof value !== 'object' || value === null) return false
  const message = value as Record<string, unknown>
  if (typeof message.sender !== 'string') return false
  if (message.persisted !== undefined && typeof message.persisted !== 'boolean') return false
  if (message.order !== undefined && !isSessionOrder(message.order)) return false
  if (message.session === null) return true
  return isStoredSession(message.session) && !isSessionExpired(message.session)
}

const saved = readSession()
let sessionPersisted = saved !== null

/** Auth state: the bearer token (with its expiry) and the signed-in user. */
export const useSession = create<SessionState>((set, get) => ({
  generation: 0,
  token: saved?.token ?? null,
  expiresAt: saved?.expiresAt ?? null,
  user: saved?.user ?? null,
  signIn: ({ token, expires_at, user }) => {
    const next: StoredSession = { token, expiresAt: expires_at, user }
    const persisted = writeSession(next)
    sessionPersisted = persisted
    const order = nextOrder()
    set(({ generation }) => ({ token, expiresAt: expires_at, user, generation: generation + 1 }))
    postCrossTabSession(next, persisted, order)
  },
  setUser: (user) => {
    const { token, expiresAt, user: currentUser } = get()
    if (!token || !expiresAt) return
    if (currentUser && currentUser.id !== user.id) return
    const next: StoredSession = { token, expiresAt, user }
    const persisted = writeSession(next)
    sessionPersisted = persisted
    const order = nextOrder()
    set({ user })
    postCrossTabSession(next, persisted, order)
  },
  signOut: () => {
    const { token, expiresAt, user } = get()
    const cleared = clearSession()
    sessionPersisted = false
    if (token === null && expiresAt === null && user === null) return
    const order = nextOrder()
    set(({ generation }) => ({
      token: null,
      expiresAt: null,
      user: null,
      generation: generation + 1,
    }))
    postCrossTabSession(null, cleared, order)
  },
}))

/** Apply an external session snapshot without writing back to localStorage or re-broadcasting. */
function applyExternalSession(
  next: StoredSession | null,
  persisted: boolean,
  advanceOrder = false,
): void {
  const current = useSession.getState()
  if (next === null) {
    sessionPersisted = false
    if (current.token === null && current.expiresAt === null && current.user === null) return
    if (advanceOrder) nextOrder()
    useSession.setState({
      token: null,
      expiresAt: null,
      user: null,
      generation: current.generation + 1,
    })
    return
  }

  sessionPersisted = persisted
  const sameIdentity =
    current.token === next.token &&
    current.expiresAt === next.expiresAt &&
    current.user?.id === next.user.id
  if (sameIdentity) {
    if (sameJsonValue(current.user, next.user)) return
    if (advanceOrder) nextOrder()
    useSession.setState({ user: next.user })
    return
  }

  if (advanceOrder) nextOrder()
  useSession.setState({
    token: next.token,
    expiresAt: next.expiresAt,
    user: next.user,
    generation: current.generation + 1,
  })
}

function reconcileSessionFromStorage(): void {
  const stored = readStoredSessionStatus()
  if (!stored.readable) return
  if (stored.session === null && !sessionPersisted) return
  applyExternalSession(stored.session, stored.session !== null, true)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.storageArea && event.storageArea !== localStorage) return
    if (event.key !== null && event.key !== SESSION_STORAGE_KEY) return
    const stored = readStoredSessionStatus()
    if (stored.readable) {
      applyExternalSession(stored.session, stored.session !== null, true)
      return
    }
    const fallback = event.key === null ? null : parseStoredSession(event.newValue)
    applyExternalSession(fallback, false, true)
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
    const { persisted, order, session } = event.data
    if (order && !isNewerOrder(order, latestOrder)) return

    if (persisted !== false) {
      const stored = readStoredSessionStatus()
      if (stored.readable) {
        if (order) latestOrder = order
        applyExternalSession(stored.session, stored.session !== null, order === undefined)
        return
      }
    }

    if (order) latestOrder = order
    applyExternalSession(session, false, order === undefined)
  })
}
