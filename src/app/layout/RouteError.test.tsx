import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { RouteError } from './RouteError'

function Broken(): never {
  throw new Error('secret stack detail')
}

function renderBrokenRoute() {
  const router = createMemoryRouter(
    [{ path: '/', element: <Broken />, errorElement: <RouteError /> }],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

describe('RouteError', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows friendly text with Try again and Go to Today, never the raw message', () => {
    renderBrokenRoute()

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
    expect(screen.queryByText(/secret stack detail/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Go to Today' })).toHaveAttribute('href', '/today')
  })

  it('uses the standalone page with an h1, Try again as the one primary action and legal links', () => {
    renderBrokenRoute()

    const main = screen.getByRole('main')
    expect(main).toHaveAttribute('id', 'main')
    expect(
      within(main).getByRole('heading', { level: 1, name: 'This page could not load' }),
    ).toBeVisible()
    expect(within(main).getByRole('button', { name: 'Try again' })).toHaveClass('bg-primary')
    expect(main.querySelectorAll('.bg-primary')).toHaveLength(1)

    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy',
    )
    expect(within(footer).getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })
})
