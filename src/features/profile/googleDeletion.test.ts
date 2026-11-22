/// <reference types="node" />

import { createHash, webcrypto } from 'node:crypto'
import { useSession } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { takeGoogleDeletionCallback } from './googleDeletionCallback'
import { verifyGoogleDeletion } from './googleDeletion'

vi.mock('./googleDeletionCallback', () => ({ takeGoogleDeletionCallback: vi.fn() }))

const storageKey = 'loomora.google-deletion'
const id = '0a067241-1242-4689-99aa-65c3b937fceb'
const state = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const verifier = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbA'
const callback = `code=synthetic-code&state=${state}`
const verifyPath = `${API}/me/deletion/google/verify`

function pending(overrides: Record<string, unknown> = {}) {
  const { token, user } = useSession.getState()
  sessionStorage.setItem(
    storageKey,
    JSON.stringify({
      id,
      state,
      verifier,
      userId: user?.id,
      sessionDigest: createHash('sha256')
        .update(token ?? '')
        .digest('base64url'),
      expiresAt: Date.now() + 60_000,
      ...overrides,
    }),
  )
}

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  vi.mocked(takeGoogleDeletionCallback).mockReset()
  useSession.getState().signIn(makeTokenResponse(makeUser({ has_password: false })))
})

afterEach(() => {
  sessionStorage.removeItem(storageKey)
  vi.unstubAllGlobals()
})

it.each([
  ['', 'invalid'],
  [`state=${state}`, 'invalid'],
  [`${callback}&state=${state}`, 'invalid'],
  [`code=code&state=wrong-state`, 'invalid'],
  [`code=%0A&state=${state}`, 'invalid'],
  [`error=access_denied&state=${state}`, 'cancelled'],
] as const)(
  'consumes the tab context and refuses unusable callbacks (%s)',
  async (query, reason) => {
    pending()
    vi.mocked(takeGoogleDeletionCallback).mockReturnValueOnce(new URLSearchParams(query))
    const verify = vi.fn(() => HttpResponse.error())
    server.use(http.post(verifyPath, verify))

    await expect(verifyGoogleDeletion()).resolves.toEqual({ status: 'error', reason })
    expect(sessionStorage.getItem(storageKey)).toBeNull()
    expect(verify).not.toHaveBeenCalled()
  },
)

it.each([
  ['copied URL', null, 'invalid'],
  ['stale challenge', { expiresAt: 1 }, 'expired'],
  ['stale verifier', { verifier: 'garbled' }, 'invalid'],
  ['different bearer on the same account', { sessionDigest: state }, 'sessionChanged'],
  ['different user', { userId: 'other' }, 'sessionChanged'],
] as const)('rejects %s before calling the backend', async (_label, context, reason) => {
  if (context) pending(context)
  vi.mocked(takeGoogleDeletionCallback).mockReturnValueOnce(new URLSearchParams(callback))
  const verify = vi.fn(() => HttpResponse.error())
  server.use(http.post(verifyPath, verify))

  await expect(verifyGoogleDeletion()).resolves.toEqual({ status: 'error', reason })
  expect(sessionStorage.getItem(storageKey)).toBeNull()
  expect(verify).not.toHaveBeenCalled()
})

it.each([
  [401, 'sessionChanged'],
  [403, 'requestRejected'],
  [415, 'requestRejected'],
  [422, 'invalid'],
  [429, 'rateLimited'],
  [503, 'unavailable'],
  [0, 'failed'],
] as const)('discards a failed verification on status %d', async (status, reason) => {
  pending()
  vi.mocked(takeGoogleDeletionCallback).mockReturnValueOnce(new URLSearchParams(callback))
  server.use(
    http.post(verifyPath, () =>
      status === 0 ? HttpResponse.error() : HttpResponse.json({}, { status }),
    ),
  )

  await expect(verifyGoogleDeletion()).resolves.toEqual({ status: 'error', reason })
  expect(sessionStorage.getItem(storageKey)).toBeNull()
  expect(useSession.getState().token).toBe('1|test-token')
})

it('consumes the callback once and keeps verified proof out of storage', async () => {
  pending()
  vi.mocked(takeGoogleDeletionCallback).mockReturnValueOnce(new URLSearchParams(callback))
  const verify = vi.fn(async ({ request }: { request: Request }) => {
    expect(request.headers.get('Authorization')).toBe('Bearer 1|test-token')
    expect(await request.json()).toEqual({
      challenge_id: id,
      code: 'synthetic-code',
      state,
      browser_verifier: verifier,
    })
    return HttpResponse.json({
      data: { id, expires_at: new Date(Date.now() + 30_000).toISOString() },
    })
  })
  server.use(http.post(verifyPath, verify))

  const result = verifyGoogleDeletion()
  await expect(verifyGoogleDeletion()).resolves.toEqual({ status: 'error', reason: 'invalid' })
  await expect(result).resolves.toMatchObject({ status: 'verified', proof: { id, verifier } })
  expect(verify).toHaveBeenCalledTimes(1)
  expect(sessionStorage.getItem(storageKey)).toBeNull()
  expect(localStorage.getItem('loomora.session')).not.toContain(verifier)
})

it('clears a pending challenge while offline without sending proof', async () => {
  pending()
  vi.mocked(takeGoogleDeletionCallback).mockReturnValueOnce(new URLSearchParams(callback))
  const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  const verify = vi.fn(() => HttpResponse.error())
  server.use(http.post(verifyPath, verify))

  try {
    await expect(verifyGoogleDeletion()).resolves.toEqual({ status: 'error', reason: 'offline' })
    expect(sessionStorage.getItem(storageKey)).toBeNull()
    expect(verify).not.toHaveBeenCalled()
  } finally {
    online.mockRestore()
  }
})

it('stops an aborted callback before sending its proof', async () => {
  pending()
  vi.mocked(takeGoogleDeletionCallback).mockReturnValueOnce(new URLSearchParams(callback))
  const verify = vi.fn(() => HttpResponse.error())
  server.use(http.post(verifyPath, verify))
  const controller = new AbortController()
  const result = verifyGoogleDeletion(controller.signal)
  controller.abort()

  await expect(result).resolves.toEqual({ status: 'error', reason: 'cancelled' })
  expect(sessionStorage.getItem(storageKey)).toBeNull()
  expect(verify).not.toHaveBeenCalled()
})

it.each([
  ['/auth/google/deletion/callback', 'synthetic-code'],
  ['/Auth/Google/Deletion/Callback/', undefined],
])('scrubs %s at startup and accepts only the canonical callback', async (path, code) => {
  const previous = window.location.href
  window.history.replaceState(null, '', `${path}?${callback}#extra`)

  try {
    vi.resetModules()
    const bootstrap = await vi.importActual<typeof import('./googleDeletionCallback')>(
      './googleDeletionCallback',
    )
    expect(window.location.pathname).toBe(path)
    expect(window.location.search).toBe('')
    expect(window.location.hash).toBe('')
    expect(bootstrap.takeGoogleDeletionCallback()?.get('code')).toBe(code)
    expect(bootstrap.takeGoogleDeletionCallback()).toBeNull()
  } finally {
    window.history.replaceState(null, '', previous)
  }
})
