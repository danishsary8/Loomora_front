import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { RouteError } from './RouteError'

function Broken(): never {
  throw new Error('secret stack detail')
}

describe('RouteError', () => {
  it('shows friendly text with Try again and Go to Today, never the raw message', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const router = createMemoryRouter(
      [{ path: '/', element: <Broken />, errorElement: <RouteError /> }],
      { initialEntries: ['/'] },
    )
    render(<RouterProvider router={router} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.queryByText(/secret stack detail/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Go to Today' })).toHaveAttribute('href', '/today')
    vi.restoreAllMocks()
  })
})
