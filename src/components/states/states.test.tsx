import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { LoadingState } from './LoadingState'

describe('shared states', () => {
  it('LoadingState is a busy status with a text label', () => {
    render(<LoadingState />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status).toHaveTextContent('Loading…')
  })

  it('EmptyState shows title, message and actions', () => {
    render(<EmptyState title="Nothing yet" message="Add one" actions={<button>Add</button>} />)
    expect(screen.getByRole('heading', { name: 'Nothing yet' })).toBeInTheDocument()
    expect(screen.getByText('Add one')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
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
