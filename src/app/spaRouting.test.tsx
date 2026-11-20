import { screen, waitFor } from '@testing-library/react'
import { useSession } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { renderRoute } from '@/test/renderRoute'

describe('SPA route reliability and direct-entry settlement', () => {
  function mockTodayEndpoints() {
    server.use(
      http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/schedule/day`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/streak`, () =>
        HttpResponse.json({ data: { current_streak: 0, longest_streak: 0, today_counted: false } }),
      ),
    )
  }

  it.each([
    ['/today', 'Today'],
    ['/week', 'Week'],
    ['/profile', 'Profile'],
    ['/sign-in', 'Sign in'],
    ['/this-route-does-not-exist', 'Page not found'],
  ])('renders %s directly with heading %s', async (path, heading) => {
    const { router } = renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(path)
  })

  it('settles direct /auth/google/callback without code to /sign-in once (no redirect loop)', async () => {
    const { router } = renderRoute('/auth/google/callback')
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Google sign-in did not work')
    expect(router.state.location.pathname).toBe('/sign-in')
    expect(router.state.location.search).toBe('?error=google_failed')
  })

  it('settles direct /auth/google/callback?code=... once to /today for completed accounts', async () => {
    let exchangeCount = 0
    mockTodayEndpoints()
    server.use(
      http.post(`${API}/auth/google/exchange`, () => {
        exchangeCount += 1
        return HttpResponse.json(
          makeTokenResponse(makeUser({ survey_done: true, has_password: false })),
        )
      }),
    )

    const { router } = renderRoute('/auth/google/callback?code=direct-entry-code')
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    await waitFor(() => expect(exchangeCount).toBe(1))
    expect(router.state.location.pathname).toBe('/today')
    expect(useSession.getState().token).toBe('1|test-token')
  })

  it('redirects signed-in visitors from /sign-in directly to /today without looping', async () => {
    mockTodayEndpoints()
    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: true })))
    const { router } = renderRoute('/sign-in')
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/today')
  })

  it('redirects signed-out visitors from /sign-up/survey directly to /sign-in without looping', async () => {
    const { router } = renderRoute('/sign-up/survey')
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/sign-in')
  })
})
