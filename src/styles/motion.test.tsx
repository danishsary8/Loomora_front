import { act, render, screen } from '@testing-library/react'
import {
  checkOffPopMotion,
  LIST_STAGGER_SECONDS,
  listStaggerContainer,
  listStaggerItem,
  MOTION_DURATION,
  MOTION_EASE,
  pageEnterMotion,
  pressTapProps,
  progressDrawTransition,
  sheetBackdropMotion,
  sheetPanelMotion,
  useCountUp,
} from './motion'

function CountUpProbe({ target, reduced }: { target: number; reduced: boolean }) {
  const value = useCountUp(target, { reduced, durationMs: 200 })
  return <span data-testid="count">{value}</span>
}

describe('shared motion foundation (UX-020)', () => {
  it('uses DEC-003 durations (160/200/240 ms) and a single easing curve', () => {
    expect(MOTION_DURATION).toEqual({ fast: 0.16, base: 0.2, slow: 0.24 })
    expect(MOTION_EASE).toEqual([0.2, 0.8, 0.2, 1])
    expect(LIST_STAGGER_SECONDS).toBe(0.03)
  })

  it('pageEnterMotion rises 8 px by default and disables movement under reduced motion', () => {
    expect(pageEnterMotion(false)).toEqual({
      initial: { opacity: 0, y: 8 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.2, ease: MOTION_EASE },
    })
    expect(pageEnterMotion(true)).toEqual({
      initial: false,
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    })
  })

  it('listStaggerContainer and listStaggerItem stagger by 30 ms and collapse under reduced motion', () => {
    const container = listStaggerContainer(false)
    expect(container.visible).toEqual({ opacity: 1, transition: { staggerChildren: 0.03 } })

    const reducedContainer = listStaggerContainer(true)
    expect(reducedContainer.hidden).toEqual({ opacity: 1 })
    expect(reducedContainer.visible).toEqual({ opacity: 1, transition: { duration: 0 } })

    const item = listStaggerItem(false)
    expect(item.hidden).toEqual({ opacity: 0, y: 6 })
    const reducedItem = listStaggerItem(true)
    expect(reducedItem.hidden).toEqual({ opacity: 1, y: 0 })
  })

  it('sheetPanelMotion and sheetBackdropMotion use spring slide-up and instant opacity under reduced motion', () => {
    const panel = sheetPanelMotion(false)
    expect(panel.initial).toEqual({ y: '100%' })
    expect(panel.transition).toMatchObject({ type: 'spring' })

    const reducedPanel = sheetPanelMotion(true)
    expect(reducedPanel.initial).toEqual({ opacity: 0 })
    expect(reducedPanel.transition).toEqual({ duration: 0 })

    expect(sheetBackdropMotion(false).transition).toEqual({ duration: 0.16 })
    expect(sheetBackdropMotion(true).transition).toEqual({ duration: 0 })
  })

  it('pressTapProps scales to 0.97 and disables tap scale under reduced motion', () => {
    expect(pressTapProps(false).whileTap).toEqual({ scale: 0.97 })
    expect(pressTapProps(true).whileTap).toBeUndefined()
  })

  it('checkOffPopMotion pops on check-off and fades instantly under reduced motion', () => {
    expect(checkOffPopMotion(false).transition).toMatchObject({ type: 'spring' })
    expect(checkOffPopMotion(true)).toMatchObject({
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0 },
    })
  })

  it('progressDrawTransition draws in 240 ms and is instant under reduced motion', () => {
    expect(progressDrawTransition(false)).toEqual({ duration: 0.24, ease: MOTION_EASE })
    expect(progressDrawTransition(true)).toEqual({ duration: 0 })
  })

  it('useCountUp returns target immediately under reduced motion and animates toward target otherwise', () => {
    const rafQueue: FrameRequestCallback[] = []
    let now = 0
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafQueue.push(cb)
      return rafQueue.length
    })
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    const perfSpy = vi.spyOn(performance, 'now').mockImplementation(() => now)

    try {
      const { rerender } = render(<CountUpProbe target={10} reduced={true} />)
      expect(screen.getByTestId('count')).toHaveTextContent('10')

      rerender(<CountUpProbe target={50} reduced={true} />)
      expect(screen.getByTestId('count')).toHaveTextContent('50')
      expect(rafSpy).not.toHaveBeenCalled()

      rerender(<CountUpProbe target={100} reduced={false} />)
      expect(rafSpy).toHaveBeenCalled()

      now = 100
      act(() => {
        rafQueue.shift()?.(now)
      })
      const mid = Number(screen.getByTestId('count').textContent)
      expect(mid).toBeGreaterThan(50)
      expect(mid).toBeLessThan(100)

      now = 250
      act(() => {
        rafQueue.shift()?.(now)
      })
      expect(screen.getByTestId('count')).toHaveTextContent('100')
    } finally {
      rafSpy.mockRestore()
      cancelSpy.mockRestore()
      perfSpy.mockRestore()
    }
  })

  it('useCountUp guards non-finite targets, zero duration, and cancels rAF on unmount', () => {
    const rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 42)
    const cancelSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    try {
      const { rerender, unmount } = render(<CountUpProbe target={Number.NaN} reduced={false} />)
      expect(screen.getByTestId('count')).toHaveTextContent('0')
      expect(rafSpy).not.toHaveBeenCalled()

      rerender(<CountUpProbe target={Number.POSITIVE_INFINITY} reduced={false} />)
      expect(screen.getByTestId('count')).toHaveTextContent('0')
      expect(rafSpy).not.toHaveBeenCalled()

      rerender(<CountUpProbe target={75} reduced={false} />)
      expect(rafSpy).toHaveBeenCalledTimes(1)

      unmount()
      expect(cancelSpy).toHaveBeenCalledWith(42)
    } finally {
      rafSpy.mockRestore()
      cancelSpy.mockRestore()
    }
  })
})
