import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingState, Skeleton } from './LoadingState'

describe('shared states', () => {
  it('LoadingState is a busy status with a text label across variants', () => {
    const { rerender } = render(<LoadingState />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('Loading…')

    for (const variant of ['cards', 'summary', 'inline'] as const) {
      rerender(<LoadingState variant={variant} />)
      const next = screen.getByRole('status')
      expect(next).toHaveAttribute('aria-busy', 'true')
      expect(next).toHaveTextContent('Loading…')
    }
  })

  it('Skeleton is hidden from assistive tech and pauses under reduced motion', () => {
    const { container } = render(<Skeleton className="h-4 w-20" />)
    const node = container.firstElementChild
    expect(node).toHaveAttribute('aria-hidden', 'true')
    expect(node).toHaveClass('motion-reduce:animate-none')
  })

  it('EmptyState shows default icon, title, message and actions', () => {
    const { container } = render(
      <EmptyState title="Nothing yet" message="Add one" actions={<button>Add</button>} />,
    )
    expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeInTheDocument()
    expect(screen.getByText('Add one')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('EmptyState renders a custom icon when provided', () => {
    render(<EmptyState title="Quiet day" icon={<span data-testid="custom-icon" />} />)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('ErrorState is an alert with a working retry button', async () => {
    const onRetry = vi.fn()
    render(<ErrorState onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('ErrorState hides retry when there is nothing to retry', () => {
    render(<ErrorState message="Offline" />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
