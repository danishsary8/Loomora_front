import { render, screen } from '@testing-library/react'
import { Hills } from '@/components/ui/Hills'
import { ClickSpark } from './ClickSpark'
import { CountUp } from './CountUp'

describe('React Bits adaptations', () => {
  it('CountUp shows the final value where it cannot observe visibility', () => {
    render(<CountUp to={83} format={(value) => `${Math.round(value)}%`} />)
    expect(screen.getByText('83%')).toBeInTheDocument()
  })

  it('CountUp treats non-finite targets as 0', () => {
    render(<CountUp to={Number.NaN} />)
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('ClickSpark is a decorative canvas that ignores pointer events', () => {
    const { container } = render(<ClickSpark burst={0} color="red" className="left-3 top-1/2" />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas).toHaveClass('pointer-events-none')
  })

  it('Hills is decorative', () => {
    const { container } = render(<Hills variant="forest" />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
