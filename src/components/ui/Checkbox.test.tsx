import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('toggles when its label is tapped', async () => {
    render(<Checkbox label="Read chapter 3" />)
    const box = screen.getByRole('checkbox', { name: 'Read chapter 3' })
    expect(box).not.toBeChecked()
    await userEvent.click(screen.getByText('Read chapter 3'))
    expect(box).toBeChecked()
    await userEvent.click(screen.getByText('Read chapter 3'))
    expect(box).not.toBeChecked()
  })

  it('keeps an accessible name when the label is hidden', () => {
    render(<Checkbox label="Gym" hideLabel />)
    expect(screen.getByRole('checkbox', { name: 'Gym' })).toBeInTheDocument()
    expect(screen.getByText('Gym')).toHaveClass('sr-only')
  })

  it('cannot be toggled when disabled', async () => {
    render(<Checkbox label="Locked" disabled />)
    await userEvent.click(screen.getByText('Locked'))
    expect(screen.getByRole('checkbox', { name: 'Locked' })).not.toBeChecked()
  })
})
