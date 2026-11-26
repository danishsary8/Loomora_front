import { render, screen, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { AppLayout } from './AppLayout'

function renderShell(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        children: [
          { path: '/today', element: <h1>Today</h1> },
          { path: '/week', element: <h1>Week</h1> },
          { path: '/focus', element: <h1>Focus</h1> },
          { path: '/insights', element: <h1>Insights</h1> },
          { path: '/profile', element: <h1>Profile</h1> },
        ],
      },
    ],
    { initialEntries: [initialPath] },
  )
  return render(<RouterProvider router={router} />)
}

describe('Elemental App Shell (UX-005)', () => {
  it('marks the active route with aria-current and the solid Elemental primary pill in BottomNav and Sidebar', () => {
    renderShell('/today')

    const bottomNav = screen.getByTestId('bottom-nav')
    const bottomToday = within(bottomNav).getByRole('link', { name: 'Today' })
    const bottomWeek = within(bottomNav).getByRole('link', { name: 'Week' })
    expect(bottomToday).toHaveAttribute('aria-current', 'page')
    expect(bottomToday).toHaveClass('bg-primary', 'text-white')
    expect(bottomWeek).not.toHaveAttribute('aria-current')
    expect(bottomWeek).toHaveClass('text-muted')

    const sidebar = screen.getByTestId('sidebar')
    const sideToday = within(sidebar).getByRole('link', { name: 'Today' })
    expect(sideToday).toHaveAttribute('aria-current', 'page')
    expect(sideToday).toHaveClass('bg-primary', 'text-white')
  })

  it('highlights the TopBar Profile avatar with Elemental active classes on /profile', () => {
    renderShell('/profile')
    const profileLink = screen.getByRole('link', { name: 'Profile' })
    expect(profileLink).toHaveAttribute('aria-current', 'page')
    expect(profileLink).toHaveClass('border-primary', 'bg-primary-soft', 'text-primary', 'size-11')
  })
})
