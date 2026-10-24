import { act, renderHook } from '@testing-library/react'
import { useNow } from './useNow'

afterEach(() => {
  vi.useRealTimers()
})

describe('useNow', () => {
  it('returns the current time and refreshes it every minute', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 26, 10, 59))
    const { result } = renderHook(() => useNow())
    expect(result.current.getMinutes()).toBe(59)

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.getHours()).toBe(11)
    expect(result.current.getMinutes()).toBe(0)
  })

  it('stops ticking when unmounted', () => {
    vi.useFakeTimers()
    const { unmount } = renderHook(() => useNow())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
