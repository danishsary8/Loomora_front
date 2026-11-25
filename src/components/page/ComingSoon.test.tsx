import { render, screen } from '@testing-library/react'
import { ComingSoon } from './ComingSoon'

describe('ComingSoon', () => {
  it('renders Elemental paper card with primary-soft badge instead of category fill', () => {
    const { container } = render(
      <ComingSoon title="Insights" message="Analytics and weekly recap arrive in Release 4." />,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument()
    expect(screen.getByText('Coming soon')).toHaveClass('bg-primary-soft', 'text-primary')
    expect(screen.getByText('Analytics and weekly recap arrive in Release 4.')).toBeInTheDocument()
    expect(container.querySelector('.bg-category-work')).toBeNull()
  })
})
