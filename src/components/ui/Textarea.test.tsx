import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from './Textarea'

describe('Textarea', () => {
  it('has a visible label linked to the field', async () => {
    render(<Textarea label="Message" />)
    const field = screen.getByLabelText('Message')
    await userEvent.type(field, 'Hello')
    expect(field).toHaveValue('Hello')
    expect(field.tagName).toBe('TEXTAREA')
  })

  it('links hint and error through aria-describedby', () => {
    render(
      <Textarea label="Message" hint="Up to 1000 characters." error="Please write a message." />,
    )
    const field = screen.getByLabelText('Message')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    expect(field).toHaveAccessibleDescription('Please write a message. Up to 1000 characters.')
    expect(field).toHaveClass('border-danger')
  })
})
