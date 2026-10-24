import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('is a type="button" by default and handles clicks', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)
    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    await userEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies the press-down and 44 px touch classes', () => {
    render(<Button variant="danger">Delete</Button>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button.className).toContain('min-h-touch')
    expect(button.className).toContain('enabled:active:translate-y-press-md')
    expect(button.className).toContain('bg-danger')
  })
})
