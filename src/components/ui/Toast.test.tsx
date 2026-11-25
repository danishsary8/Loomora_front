import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActionToast, Toast } from './Toast'

describe('Toast and ActionToast (Elemental Edition)', () => {
  it('keeps the live region mounted when message is null', () => {
    render(<Toast message={null} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toBeEmptyDOMElement()
  })

  it('renders ActionToast with Elemental hairline border, soft elevation, and working action', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    render(<ActionToast message="Deleted Read chapter 4" actionLabel="Undo" onAction={onUndo} />)

    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('Deleted Read chapter 4')
    const box = status.firstElementChild
    expect(box).toHaveClass('border-hairline', 'shadow-soft-md')
    expect(box).not.toHaveClass('border-thick', 'shadow-hard-md')

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('renders danger tone and stacked offset without legacy hard shadows', () => {
    render(<ActionToast message="Could not delete item." tone="danger" stacked />)
    const status = screen.getByRole('status')
    expect(status.className).toContain('11rem')
    const box = status.firstElementChild
    expect(box).toHaveClass('text-danger', 'border-danger/35', 'shadow-soft-md')
    expect(box).not.toHaveClass('border-thick', 'shadow-hard-md')
  })
})
