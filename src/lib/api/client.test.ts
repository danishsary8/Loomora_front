import { http, HttpResponse, server, API } from '@/test/apiMocks'
import { createApiClient } from './client'
import { ApiError } from './errors'

function setup(token: string | null = 'abc') {
  const onUnauthorized = vi.fn()
  const client = createApiClient({ baseUrl: API, getToken: () => token, onUnauthorized })
  return { client, onUnauthorized }
}

describe('API client', () => {
  it('sends the bearer token and a JSON body, and returns the JSON answer', async () => {
    let seen: { auth: string | null; body: unknown } | undefined
    server.use(
      http.post(`${API}/todos`, async ({ request }) => {
        seen = { auth: request.headers.get('Authorization'), body: await request.json() }
        return HttpResponse.json({ ok: true }, { status: 201 })
      }),
    )
    const answer = await setup().client.request('POST', '/todos', { body: { title: 'Read' } })
    expect(answer).toEqual({ ok: true })
    expect(seen).toEqual({ auth: 'Bearer abc', body: { title: 'Read' } })
  })

  it('leaves the token off when auth is false and adds query values', async () => {
    let seen: { auth: string | null; date: string | null } | undefined
    server.use(
      http.get(`${API}/streak`, ({ request }) => {
        seen = {
          auth: request.headers.get('Authorization'),
          date: new URL(request.url).searchParams.get('date'),
        }
        return HttpResponse.json({})
      }),
    )
    await setup().client.request('GET', '/streak', { auth: false, query: { date: '2026-10-25' } })
    expect(seen).toEqual({ auth: null, date: '2026-10-25' })
  })

  it('returns undefined for an empty 204 answer', async () => {
    server.use(http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })))
    await expect(setup().client.request('POST', '/auth/logout')).resolves.toBeUndefined()
  })

  it('throws an ApiError with the field errors of a 422', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        HttpResponse.json(
          { message: 'Taken.', errors: { email: ['The email has already been taken.'] } },
          { status: 422 },
        ),
      ),
    )
    const error = await setup()
      .client.request('POST', '/auth/register', { body: {}, auth: false })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(422)
    expect((error as ApiError).fieldErrors).toEqual({ email: 'The email has already been taken.' })
  })

  it('reports a 401 for a request that carried a token', async () => {
    server.use(
      http.get(`${API}/me`, () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )
    const { client, onUnauthorized } = setup()
    await expect(client.request('GET', '/me')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not report a 401 when no token was sent', async () => {
    server.use(
      http.get(`${API}/me`, () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
    )
    const { client, onUnauthorized } = setup(null)
    await expect(client.request('GET', '/me')).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reads Retry-After on a 429', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(
          { message: 'Too Many Attempts.' },
          { status: 429, headers: { 'Retry-After': '42' } },
        ),
      ),
    )
    const error = await setup()
      .client.request('POST', '/auth/login', { body: {}, auth: false })
      .catch((e: unknown) => e as ApiError)
    expect(error).toMatchObject({ isRateLimited: true, retryAfter: 42 })
  })

  it('turns a network failure into an ApiError with status 0', async () => {
    server.use(http.get(`${API}/me`, () => HttpResponse.error()))
    const error = await setup()
      .client.request('GET', '/me')
      .catch((e: unknown) => e as ApiError)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ isNetwork: true })
  })
})
