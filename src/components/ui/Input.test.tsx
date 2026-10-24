import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input', () => {
  it('has a visible label linked to the field', async () => {
    render(<Input label="Title" />)
    const field = screen.getByLabelText('Title')
    await userEvent.type(field, 'Gym')
    expect(field).toHaveValue('Gym')
  })

  it('links hint and error through aria-describedby', () => {
    render(<Input label="Title" hint="Up to 200 characters." error="Please enter a title." />)
    const field = screen.getByLabelText('Title')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('Please enter a title. Up to 200 characters.')
    expect(field).toHaveClass('border-danger')
    expect(field).not.toHaveClass('border-ink')
  })

  it('is not marked invalid without an error', () => {
    render(<Input label="Title" />)
    expect(screen.getByLabelText('Title')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Title')).toHaveClass('border-ink')
  })
})
