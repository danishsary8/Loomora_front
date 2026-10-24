import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { routes } from './routes'

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}

describe('routes', () => {
  it('renders the app root at /', () => {
    renderAt('/')
    expect(screen.getByTestId('app-root')).toBeInTheDocument()
  })

  it('renders the style guide at /styleguide', () => {
    renderAt('/styleguide')
    expect(screen.getByRole('heading', { level: 1, name: 'Style guide' })).toBeInTheDocument()
  })
})
