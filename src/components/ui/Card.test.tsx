import { render, screen } from '@testing-library/react'
import { Card } from './Card'

describe('Card', () => {
  it('renders children on paper by default', () => {
    render(<Card>Hello</Card>)
    expect(screen.getByText('Hello')).toHaveClass('bg-paper', 'border-thick', 'shadow-hard-md')
  })

  it('uses a flat category color when given a tone', () => {
    render(<Card tone="health">Run</Card>)
    expect(screen.getByText('Run')).toHaveClass('bg-category-health')
  })
})
