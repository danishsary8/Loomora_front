import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ApiError } from '@/lib/api'
import { RouteError } from './RouteError'

let mockError: unknown = new Error('Sensitive internal server stack trace')

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useRouteError: () => mockError,
  }
})

describe('RouteError', () => {
  const originalReload = window.location.reload

  beforeAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    })
  })

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: originalReload },
    })
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockError = new Error('Sensitive internal server stack trace')
  })

  it('renders a friendly error title and message without raw error text', () => {
    render(
      <MemoryRouter>
        <RouteError />
      </MemoryRouter>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Something went wrong. Please try again.')).toBeInTheDocument()
    expect(screen.queryByText(/Sensitive internal server stack trace/)).not.toBeInTheDocument()
  })

  it('shows mapped network error message when a network failure throws', () => {
    mockError = new ApiError(0, { message: 'Network failed' })

    render(
      <MemoryRouter>
        <RouteError />
      </MemoryRouter>,
    )

    expect(screen.getByText('Connection problem')).toBeInTheDocument()
    expect(
      screen.getByText('Cannot connect to the server. Please check your internet connection.'),
    ).toBeInTheDocument()
  })

  it('has a working Try again button that reloads the window', async () => {
    render(
      <MemoryRouter>
        <RouteError />
      </MemoryRouter>,
    )

    const retryBtn = screen.getByRole('button', { name: 'Try again' })
    await userEvent.click(retryBtn)
    expect(window.location.reload).toHaveBeenCalledTimes(1)
  })

  it('has a Go to Today link pointing to /today', () => {
    render(
      <MemoryRouter>
        <RouteError />
      </MemoryRouter>,
    )

    const todayLink = screen.getByRole('link', { name: 'Go to Today' })
    expect(todayLink).toHaveAttribute('href', '/today')
  })
})
