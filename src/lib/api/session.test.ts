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
})
