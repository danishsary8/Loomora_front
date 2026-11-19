import { create } from 'zustand'
import { clearSession, readSession, writeSession } from './tokenStorage'
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

const saved = readSession()

/** Auth state: the bearer token (with its expiry) and the signed-in user. */
export const useSession = create<SessionState>((set, get) => ({
  generation: 0,
  token: saved?.token ?? null,
  expiresAt: saved?.expiresAt ?? null,
  user: saved?.user ?? null,
  signIn: ({ token, expires_at, user }) => {
    writeSession({ token, expiresAt: expires_at, user })
    set(({ generation }) => ({ token, expiresAt: expires_at, user, generation: generation + 1 }))
  },
  setUser: (user) => {
    const { token, expiresAt } = get()
    if (token && expiresAt) writeSession({ token, expiresAt, user })
    set({ user })
  },
  signOut: () => {
    clearSession()
    set(({ generation }) => ({
      token: null,
      expiresAt: null,
      user: null,
      generation: generation + 1,
    }))
  },
}))
