import { act, render, screen } from '@testing-library/react'
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
})
