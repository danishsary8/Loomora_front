import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useServiceStatus } from '@/lib/api'
import { useSession } from '@/lib/api/session'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { ServiceDownBanner } from './ServiceDownBanner'

function renderBanner() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ServiceDownBanner />
    </QueryClientProvider>,
  )
}

function signInAndFail() {
  useSession.getState().signIn(makeTokenResponse())
  act(() => useServiceStatus.getState().markDown())
}

const bannerText = /We cannot reach Loomora/

describe('ServiceDownBanner', () => {
  afterEach(() => vi.useRealTimers())

  it('stays hidden for guests even after a failure', () => {
    renderBanner()
    act(() => useServiceStatus.getState().markDown())
    expect(screen.queryByText(bannerText)).not.toBeInTheDocument()
  })

  it('shows for a signed-in user and does not promise offline sync', () => {
    renderBanner()
    signInAndFail()
    expect(screen.getByText(bannerText)).toBeVisible()
    expect(screen.queryByText(/sync/i)).not.toBeInTheDocument()
  })

  it('Retry keeps the banner while /health fails and hides it once it answers', async () => {
    let healthy = false
    server.use(
      http.get(`${API}/health`, () =>
        healthy ? HttpResponse.json({ status: 'ok' }) : new HttpResponse(null, { status: 503 }),
      ),
    )
    renderBanner()
    signInAndFail()

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(screen.getByText(bannerText)).toBeVisible()

    healthy = true
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await vi.waitFor(() => expect(screen.queryByText(bannerText)).not.toBeInTheDocument())
  })

  it('polls /health every 30 seconds until it recovers', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    let calls = 0
    server.use(
      http.get(`${API}/health`, () => {
        calls += 1
        return calls < 2
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json({ status: 'ok' })
      }),
    )
    renderBanner()
    signInAndFail()

    await act(() => vi.advanceTimersByTimeAsync(30_000))
    await vi.waitFor(() => expect(calls).toBe(1))
    expect(screen.getByText(bannerText)).toBeVisible()

    await act(() => vi.advanceTimersByTimeAsync(30_000))
    await vi.waitFor(() => expect(screen.queryByText(bannerText)).not.toBeInTheDocument())
  })
})
