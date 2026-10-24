import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/renderRoute'

// Every screen from docs/05 with the h1 it must show.
const SCREENS: [path: string, heading: string][] = [
  ['/', 'Loomora'],
  ['/today', 'Today'],
  ['/week', 'Week'],
  ['/focus', 'Focus'],
  ['/insights', 'Insights'],
  ['/profile', 'Profile'],
  ['/sign-in', 'Sign in'],
  ['/sign-up', 'Create an account'],
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
  ['/styleguide', 'Style guide'],
  ['/does-not-exist', 'Page not found'],
]

describe('routes', () => {
  it.each(SCREENS)('%s renders "%s"', async (path, heading) => {
    renderRoute(path)
    expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it.each(['/focus', '/insights'])('%s shows "Coming soon"', async (path) => {
    renderRoute(path)
    expect(await screen.findByText('Coming soon')).toBeInTheDocument()
  })

  it('landing goes to Today with "Try it now" (guest, no signup)', async () => {
    const { router } = renderRoute('/')
    await userEvent.click(await screen.findByRole('link', { name: 'Try it now' }))
    expect(router.state.location.pathname).toBe('/today')
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
  })

  it('landing links to sign in', async () => {
    renderRoute('/')
    expect(await screen.findByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  })

  it('404 offers a way back to Today', async () => {
    renderRoute('/nope')
    expect(await screen.findByRole('link', { name: 'Go to Today' })).toHaveAttribute(
      'href',
      '/today',
    )
  })
})

describe('app shell', () => {
  it('shows the 4 nav items in order, in both the bottom nav and the sidebar', async () => {
    renderRoute('/today')
    await screen.findByRole('heading', { level: 1, name: 'Today' })
    for (const testId of ['bottom-nav', 'sidebar']) {
      const links = within(screen.getByTestId(testId)).getAllByRole('link')
      expect(links.map((l) => l.textContent)).toEqual(['Today', 'Week', 'Focus', 'Insights'])
    }
  })

  it('marks the current screen with aria-current', async () => {
    renderRoute('/week')
    await screen.findByRole('heading', { level: 1, name: 'Week' })
    const nav = within(screen.getByTestId('bottom-nav'))
    expect(nav.getByRole('link', { name: 'Week' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Today' })).not.toHaveAttribute('aria-current')
  })

  it('navigates between screens from the bottom nav', async () => {
    const { router } = renderRoute('/today')
    await screen.findByRole('heading', { level: 1, name: 'Today' })
    await userEvent.click(
      within(screen.getByTestId('bottom-nav')).getByRole('link', { name: 'Focus' }),
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Focus' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/focus')
  })

  it('opens Profile from the avatar', async () => {
    renderRoute('/today')
    await userEvent.click(await screen.findByRole('link', { name: 'Profile' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
  })

  it('has a skip link to the main content', async () => {
    renderRoute('/today')
    expect(await screen.findByRole('link', { name: 'Skip to content' })).toHaveAttribute(
      'href',
      '#main',
    )
  })

  it('does not show the app nav on standalone pages', async () => {
    renderRoute('/sign-in')
    await screen.findByRole('heading', { level: 1, name: 'Sign in' })
    expect(screen.queryByTestId('bottom-nav')).not.toBeInTheDocument()
  })
})
