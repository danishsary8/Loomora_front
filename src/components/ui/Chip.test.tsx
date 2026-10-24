import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chip } from './Chip'

describe('Chip', () => {
  it('shows the translated category name as a static label', () => {
    render(<Chip category="study" />)
    expect(screen.getByText('Study')).toHaveClass('bg-category-study')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('is a toggle button with aria-pressed in picker mode', async () => {
    const onClick = vi.fn()
    const { rerender } = render(<Chip category="work" onClick={onClick} />)
    const chip = screen.getByRole('button', { name: 'Work' })
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(chip)
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(<Chip category="work" onClick={onClick} selected />)
    expect(screen.getByRole('button', { name: 'Work' })).toHaveAttribute('aria-pressed', 'true')
  })
})
