import { makeTokenResponse, makeUser } from '@/test/apiMocks'
import { useSession } from './session'
import { readSession } from './tokenStorage'

describe('session', () => {
  it('keeps the token with its expiry and the user, and forgets them on sign out', () => {
    const answer = makeTokenResponse()
    useSession.getState().signIn(answer)
    expect(useSession.getState()).toMatchObject({ token: '1|test-token', user: answer.user })
    expect(readSession()).toMatchObject({ token: '1|test-token', expiresAt: answer.expires_at })

    useSession.getState().signOut()
    expect(useSession.getState().token).toBeNull()
    expect(readSession()).toBeNull()
  })

  it('stores a changed user next to the same token', () => {
    useSession.getState().signIn(makeTokenResponse())
    useSession.getState().setUser(makeUser({ name: 'Sokha' }))
    expect(readSession()?.user.name).toBe('Sokha')
    expect(readSession()?.token).toBe('1|test-token')
  })

  it('drops a saved session whose token has expired', () => {
    useSession.getState().signIn(makeTokenResponse())
    const afterExpiry = new Date('2100-01-01T00:00:00Z')
    expect(readSession(afterExpiry)).toBeNull()
    expect(readSession()).toBeNull()
  })

  it('ignores unreadable saved data', () => {
    localStorage.setItem('loomora.session', '{not json')
    expect(readSession()).toBeNull()
  })

  it('clears the in-memory session when another tab removes loomora.session without writing back', () => {
    const answer = makeTokenResponse()
    useSession.getState().signIn(answer)
    const beforeGeneration = useSession.getState().generation

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem')
    try {
      localStorage.removeItem('loomora.session')
      removeItemSpy.mockClear()
      setItemSpy.mockClear()

      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'loomora.session',
          oldValue: JSON.stringify({
            token: answer.token,
            expiresAt: answer.expires_at,
            user: answer.user,
          }),
          newValue: null,
          storageArea: localStorage,
        }),
      )

      expect(useSession.getState().token).toBeNull()
      expect(useSession.getState().user).toBeNull()
      expect(useSession.getState().generation).toBe(beforeGeneration + 1)
      expect(setItemSpy).not.toHaveBeenCalled()
      expect(removeItemSpy).not.toHaveBeenCalled()
    } finally {
      setItemSpy.mockRestore()
      removeItemSpy.mockRestore()
    }
  })

  it('ignores duplicate sign-out storage events and unrelated storage keys', () => {
    useSession.getState().signOut()
    const generation = useSession.getState().generation

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'loomora.session',
        oldValue: null,
        newValue: null,
        storageArea: localStorage,
      }),
    )
    expect(useSession.getState().generation).toBe(generation)

    useSession.getState().signIn(makeTokenResponse())
    const signedInGeneration = useSession.getState().generation
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'unrelated.key',
        newValue: null,
        storageArea: localStorage,
      }),
    )
    expect(useSession.getState().token).toBe('1|test-token')
    expect(useSession.getState().generation).toBe(signedInGeneration)
  })

  it('switches directly to a different account from a storage event and bumps generation', () => {
    useSession.getState().signIn(makeTokenResponse(makeUser({ id: 'user-a', name: 'A' })))
    const generation = useSession.getState().generation

    const userB = makeUser({ id: 'user-b', name: 'B', email: 'b@example.com' })
    const serialized = JSON.stringify({
      token: '2|token-b',
      expiresAt: '2099-01-01T00:00:00Z',
      user: userB,
    })
    localStorage.setItem('loomora.session', serialized)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'loomora.session',
        newValue: serialized,
        storageArea: localStorage,
      }),
    )

    expect(useSession.getState().token).toBe('2|token-b')
    expect(useSession.getState().user).toEqual(userB)
    expect(useSession.getState().generation).toBe(generation + 1)
  })

  it('ignores setUser when signed out or when the user id belongs to another account', () => {
    useSession.getState().signOut()
    useSession.getState().setUser(makeUser({ id: 'user-a', name: 'Stale' }))
    expect(useSession.getState().user).toBeNull()

    useSession.getState().signIn(makeTokenResponse(makeUser({ id: 'user-b', name: 'Current' })))
    useSession.getState().setUser(makeUser({ id: 'user-a', name: 'Stale' }))
    expect(useSession.getState().user?.id).toBe('user-b')
    expect(useSession.getState().user?.name).toBe('Current')
  })

  it('falls back to BroadcastChannel when localStorage writes are blocked and applies peer messages without re-posting', async () => {
    const peer = new BroadcastChannel('loomora.session')
    const received: unknown[] = []
    peer.addEventListener('message', (event) => received.push(event.data))

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    try {
      const answer = makeTokenResponse(makeUser({ id: 'user-a', name: 'Peer' }))
      useSession.getState().signIn(answer)
      await vi.waitFor(() => expect(received.length).toBeGreaterThanOrEqual(1))

      received.length = 0
      peer.postMessage({ sender: 'other-tab', session: null })
      await vi.waitFor(() => expect(useSession.getState().token).toBeNull())
      expect(received).toEqual([])
    } finally {
      setItemSpy.mockRestore()
      peer.close()
    }
  })

  it('clears the session when another tab calls localStorage.clear() (key === null)', () => {
    useSession.getState().signIn(makeTokenResponse())
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }))
    expect(useSession.getState().token).toBeNull()
    expect(useSession.getState().user).toBeNull()
  })

  it('reconciles missed session changes when the tab becomes visible', () => {
    useSession.getState().signIn(makeTokenResponse())
    localStorage.removeItem('loomora.session')
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    try {
      document.dispatchEvent(new Event('visibilitychange'))
      expect(useSession.getState().token).toBeNull()
      expect(useSession.getState().user).toBeNull()
    } finally {
      visibility.mockRestore()
    }
  })

  it('ignores a delayed Account A BroadcastChannel or StorageEvent message after switching to Account B', async () => {
    const peer = new BroadcastChannel('loomora.session')
    try {
      const userA = makeUser({ id: 'user-a', name: 'A', email: 'a@example.com' })
      const userB = makeUser({ id: 'user-b', name: 'B', email: 'b@example.com' })
      const sessionA = {
        token: '1|token-a',
        expiresAt: '2099-01-01T00:00:00Z',
        user: userA,
      }
      const sessionB = {
        token: '2|token-b',
        expiresAt: '2099-01-01T00:00:00Z',
        user: userB,
      }

      const staleOrder = { time: Date.now() - 10_000, seq: 1, sender: 'tab-a' }
      useSession.getState().signIn({
        token: sessionB.token,
        expires_at: sessionB.expiresAt,
        user: userB,
      })
      const generationAfterB = useSession.getState().generation

      // Delayed BroadcastChannel message from Account A (both persisted and unpersisted).
      peer.postMessage({ sender: 'tab-a', persisted: true, order: staleOrder, session: sessionA })
      peer.postMessage({ sender: 'tab-a', persisted: false, order: staleOrder, session: sessionA })
      // Delayed StorageEvent carrying Account A while localStorage holds Account B.
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'loomora.session',
          newValue: JSON.stringify(sessionA),
          storageArea: localStorage,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 30))

      expect(useSession.getState().token).toBe(sessionB.token)
      expect(useSession.getState().user).toEqual(userB)
      expect(useSession.getState().generation).toBe(generationAfterB)
    } finally {
      peer.close()
    }
  })

  it('ignores a delayed signed-in message arriving after sign-out', async () => {
    const peer = new BroadcastChannel('loomora.session')
    try {
      const userA = makeUser({ id: 'user-a', name: 'A' })
      const sessionA = {
        token: '1|token-a',
        expiresAt: '2099-01-01T00:00:00Z',
        user: userA,
      }

      const staleOrder = { time: Date.now() - 10_000, seq: 1, sender: 'tab-a' }
      useSession.getState().signIn({
        token: sessionA.token,
        expires_at: sessionA.expiresAt,
        user: userA,
      })
      useSession.getState().signOut()
      const generationAfterSignOut = useSession.getState().generation

      peer.postMessage({ sender: 'tab-a', persisted: true, order: staleOrder, session: sessionA })
      peer.postMessage({ sender: 'tab-a', persisted: false, order: staleOrder, session: sessionA })
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'loomora.session',
          newValue: JSON.stringify(sessionA),
          storageArea: localStorage,
        }),
      )
      await new Promise((resolve) => setTimeout(resolve, 30))

      expect(useSession.getState().token).toBeNull()
      expect(useSession.getState().user).toBeNull()
      expect(useSession.getState().generation).toBe(generationAfterSignOut)
    } finally {
      peer.close()
    }
  })

  it('converges on the latest state when updates from different tabs are repeated or reordered', async () => {
    const peer = new BroadcastChannel('loomora.session')
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError')
    })
    try {
      const baseTime = Date.now()
      const sessionA = {
        token: '1|token-a',
        expiresAt: '2099-01-01T00:00:00Z',
        user: makeUser({ id: 'user-a', name: 'A' }),
      }
      const sessionB = {
        token: '2|token-b',
        expiresAt: '2099-01-01T00:00:00Z',
        user: makeUser({ id: 'user-b', name: 'B' }),
      }
      const orderA = { time: baseTime, seq: 99, sender: 'tab-a' }
      const orderB = { time: baseTime, seq: 100, sender: 'tab-b' }

      const startGeneration = useSession.getState().generation
      // Newer Tab B update arrives first, then older Tab A update arrives out of order, then Tab B repeats.
      peer.postMessage({ sender: 'tab-b', persisted: false, order: orderB, session: sessionB })
      await vi.waitFor(() => expect(useSession.getState().token).toBe(sessionB.token))
      const generationAfterB = useSession.getState().generation
      expect(generationAfterB).toBe(startGeneration + 1)

      peer.postMessage({ sender: 'tab-a', persisted: false, order: orderA, session: sessionA })
      peer.postMessage({ sender: 'tab-b', persisted: false, order: orderB, session: sessionB })
      await new Promise((resolve) => setTimeout(resolve, 30))

      expect(useSession.getState().token).toBe(sessionB.token)
      expect(useSession.getState().user?.id).toBe('user-b')
      expect(useSession.getState().generation).toBe(generationAfterB)
    } finally {
      getItemSpy.mockRestore()
      setItemSpy.mockRestore()
      peer.close()
    }
  })

  it('keeps fallback session across focus/visibility checks when storage is blocked or empty', async () => {
    const peer = new BroadcastChannel('loomora.session')
    const received: unknown[] = []
    peer.addEventListener('message', (event) => received.push(event.data))

    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    try {
      const answer = makeTokenResponse(makeUser({ id: 'user-a', name: 'Fallback' }))
      useSession.getState().signIn(answer)
      await vi.waitFor(() => expect(received.length).toBeGreaterThanOrEqual(1))

      // Storage reads return null because setItem failed; focus/visibility must not drop the fallback session.
      window.dispatchEvent(new Event('focus'))
      document.dispatchEvent(new Event('visibilitychange'))
      expect(useSession.getState().token).toBe(answer.token)
      expect(useSession.getState().user?.name).toBe('Fallback')

      // Even if getItem throws too, BroadcastChannel sign-out still propagates cleanly.
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('SecurityError')
      })
      try {
        window.dispatchEvent(new Event('focus'))
        expect(useSession.getState().token).toBe(answer.token)

        peer.postMessage({
          sender: 'tab-b',
          persisted: false,
          order: { time: Date.now() + 100, seq: 1, sender: 'tab-b' },
          session: null,
        })
        await vi.waitFor(() => expect(useSession.getState().token).toBeNull())
      } finally {
        getItemSpy.mockRestore()
      }
    } finally {
      visibility.mockRestore()
      removeItemSpy.mockRestore()
      setItemSpy.mockRestore()
      peer.close()
    }
  })
})
