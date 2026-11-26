import { act, render, screen } from '@testing-library/react'
import { StreakBadge } from './StreakBadge'

describe('StreakBadge', () => {
  it('shows the count with an accessible label', () => {
    render(<StreakBadge count={3} todayCounted={false} />)
    const badge = screen.getByLabelText('Streak: 3 days. Not counted yet today.')
    expect(badge).toHaveTextContent('3')
    expect(badge).toHaveAttribute('data-today-counted', 'false')
  })

  it('uses the singular for one day and the counted state label', () => {
    render(<StreakBadge count={1} todayCounted />)
    expect(screen.getByLabelText('Streak: 1 day. Today counted.')).toHaveAttribute(
      'data-today-counted',
      'true',
    )
  })

  it('does not celebrate when it is already counted on load', () => {
    render(<StreakBadge count={2} todayCounted />)
    expect(screen.getByTestId('streak-badge')).toHaveAttribute('data-celebrating', 'false')
  })

  it('celebrates when today becomes counted, then calms down', () => {
    vi.useFakeTimers()
    try {
      const { rerender } = render(<StreakBadge count={2} todayCounted={false} />)
      rerender(<StreakBadge count={3} todayCounted />)
      expect(screen.getByTestId('streak-badge')).toHaveAttribute('data-celebrating', 'true')
      act(() => {
        vi.advanceTimersByTime(1300)
      })
      expect(screen.getByTestId('streak-badge')).toHaveAttribute('data-celebrating', 'false')
    } finally {
      vi.useRealTimers()
    }
  })

  it('shows the day count as a streak label on paper, then a warm accent once counted', () => {
    const { rerender } = render(<StreakBadge count={4} todayCounted={false} />)
    const badge = screen.getByTestId('streak-badge')
    expect(badge).toHaveClass('bg-paper', 'text-ink')
    expect(badge).toHaveTextContent('4-day streak')

    rerender(<StreakBadge count={5} todayCounted />)
    expect(badge).toHaveClass('bg-accent/40', 'text-ink')
    expect(badge).toHaveTextContent('5-day streak')
  })
})
