import { render, screen } from '@testing-library/react'
import { ProgressRing } from './ProgressRing'

describe('ProgressRing', () => {
  it('exposes progress to assistive tech', () => {
    render(<ProgressRing value={3} max={7} label="3 of 7 done" />)
    const ring = screen.getByRole('progressbar', { name: '3 of 7 done' })
    expect(ring).toHaveAttribute('aria-valuenow', '3')
    expect(ring).toHaveAttribute('aria-valuemax', '7')
    expect(ring).toHaveAttribute('aria-valuetext', '3 of 7 done')
  })

  it('clamps values and handles an empty day', () => {
    const { rerender } = render(<ProgressRing value={9} max={7} label="all done" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '7')
    rerender(<ProgressRing value={0} max={0} label="nothing yet" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
  })
})
