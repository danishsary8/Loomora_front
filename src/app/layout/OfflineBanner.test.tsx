import { act, render, screen } from '@testing-library/react'
import { useSession } from '@/lib/api'
import { makeTokenResponse } from '@/test/apiMocks'
import { OfflineBanner } from './OfflineBanner'

function setOnline(value: boolean) {
  vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(value)
  window.dispatchEvent(new Event(value ? 'online' : 'offline'))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('OfflineBanner', () => {
  it('is hidden while online', () => {
    render(<OfflineBanner />)
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument()
  })

  it('appears when the connection drops and goes away when it returns', () => {
    render(<OfflineBanner />)
    act(() => setOnline(false))
    expect(
      screen.getByText('You are offline. Your plan still works and saves on this device.'),
    ).toBeVisible()
    act(() => setOnline(true))
    expect(screen.queryByText(/You are offline/)).not.toBeInTheDocument()
  })

  it('does not promise device saving to a signed-in user', () => {
    useSession.getState().signIn(makeTokenResponse())
    render(<OfflineBanner />)
    act(() => setOnline(false))
    expect(screen.getByText(/Changes will not be saved until you are back online/)).toBeVisible()
    expect(screen.queryByText(/saves on this device/)).not.toBeInTheDocument()
  })
})
