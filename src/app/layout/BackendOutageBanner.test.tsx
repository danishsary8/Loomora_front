import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useBackendOutage, useSession } from '@/lib/api'
import { makeTokenResponse } from '@/test/apiMocks'
import { BackendOutageBanner } from './BackendOutageBanner'

function renderBanner(queryClient = new QueryClient()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <BackendOutageBanner />
    </QueryClientProvider>,
  )
}

describe('BackendOutageBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    useSession.getState().signOut()
    useBackendOutage.getState().reset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('is hidden in guest mode even if an outage is flagged', () => {
    useBackendOutage.getState().reportFailure()
    renderBanner()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByText(/Cannot reach the server/)).not.toBeInTheDocument()
  })

  it('is hidden in account mode when there is no outage', () => {
    useSession.getState().signIn(makeTokenResponse())
    renderBanner()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows in account mode on outage with Retry button and non-sync message', () => {
    useSession.getState().signIn(makeTokenResponse())
    useBackendOutage.getState().reportFailure()

    renderBanner()

    const banner = screen.getByRole('alert')
    expect(banner).toBeInTheDocument()
    expect(
      screen.getByText(
        'Cannot reach the server. Changes cannot be saved until connection is restored.',
      ),
    ).toBeInTheDocument()
    // Explicitly must not promise offline sync
    expect(banner).not.toHaveTextContent('saves on this device')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('polls GET /health every 30s until recovered', async () => {
    useSession.getState().signIn(makeTokenResponse())
    useBackendOutage.getState().reportFailure()

    const checkHealthSpy = vi
      .spyOn(useBackendOutage.getState(), 'checkHealth')
      .mockResolvedValue(false)

    renderBanner()

    expect(checkHealthSpy).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    expect(checkHealthSpy).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(30000)
    })
    expect(checkHealthSpy).toHaveBeenCalledTimes(2)
  })

  it('recovers and hides the banner when Retry succeeds', async () => {
    useSession.getState().signIn(makeTokenResponse())
    useBackendOutage.getState().reportFailure()

    vi.spyOn(useBackendOutage.getState(), 'checkHealth').mockImplementation(async () => {
      useBackendOutage.getState().reportSuccess()
      return true
    })

    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    renderBanner()

    const retryBtn = screen.getByRole('button', { name: 'Retry' })
    await user.click(retryBtn)

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
