import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/renderRoute'

describe.each([
  ['/privacy', 'Privacy'],
  ['/terms', 'Terms'],
])('%s', (path, title) => {
  it('renders a heading, update date, multiple sections, and no untranslated keys', async () => {
    renderRoute(path)
    const heading = await screen.findByRole('heading', { level: 1, name: title })
    expect(heading).toBeInTheDocument()
    expect(screen.getByText(/^Last updated:/)).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThanOrEqual(5)
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument()

    const mainText = screen.getByRole('main').textContent ?? ''
    expect(mainText).not.toMatch(/\blegal\.|\bpages\./)
  })

  it('does not contain outdated local-only or unavailable-account claims', async () => {
    renderRoute(path)
    await screen.findByRole('heading', { level: 1, name: title })
    const mainText = screen.getByRole('main').textContent ?? ''
    expect(mainText).not.toMatch(/Accounts are not available yet/i)
    expect(mainText).not.toMatch(/does not send it to us/i)
    expect(mainText).not.toMatch(/Your plan is saved on your device only/i)
    expect(mainText).not.toMatch(/we never had it/i)
    expect(mainText).not.toMatch(/sell your data/i)
    expect(mainText).not.toMatch(/no (?:third-party )?(?:ad networks|ad trackers|analytics)/i)
    expect(mainText).not.toMatch(/analytics scripts/i)
    expect(mainText).not.toMatch(/streak history/i)
  })
})

describe('Privacy disclosures', () => {
  it('differentiates guest local storage from account remote storage and import', async () => {
    renderRoute('/privacy')
    await screen.findByRole('heading', { level: 1, name: 'Privacy' })
    const mainText = screen.getByRole('main').textContent ?? ''

    // Guest mode: IndexedDB/browser storage and loss risk
    expect(mainText).toMatch(/IndexedDB/i)
    expect(mainText).toMatch(/clear.*browser|browser data/i)
    expect(mainText).toMatch(/lose.*device|device is lost/i)

    // Account mode: API, PostgreSQL, email/Google auth, localStorage token, import, streak fields
    expect(mainText).toMatch(/PostgreSQL/i)
    expect(mainText).toMatch(/API/i)
    expect(mainText).toMatch(/localStorage/i)
    expect(mainText).toMatch(/import/i)
    expect(mainText).toMatch(/current streak/i)
    expect(mainText).toMatch(/longest streak/i)
    expect(mainText).toMatch(/last counted streak date/i)
  })

  it('discloses feedback, email delivery, Google sign-in, hosting providers, and offline caching', async () => {
    renderRoute('/privacy')
    await screen.findByRole('heading', { level: 1, name: 'Privacy' })
    const mainText = screen.getByRole('main').textContent ?? ''

    expect(mainText).toMatch(/Send feedback/i)
    expect(mainText).toMatch(/Vercel/i)
    expect(mainText).toMatch(/Render/i)
    expect(mainText).toMatch(/Neon/i)
    expect(mainText).toMatch(/Brevo/i)
    expect(mainText).toMatch(/Google/i)
    expect(mainText).toMatch(/service worker/i)
    expect(mainText).toMatch(/offline/i)
  })

  it('explains password account deletion and the current Google-only deletion limitation honestly', async () => {
    renderRoute('/privacy')
    await screen.findByRole('heading', { level: 1, name: 'Privacy' })
    const mainText = screen.getByRole('main').textContent ?? ''

    expect(mainText).toMatch(/Delete my account/i)
    expect(mainText).toMatch(/password/i)
    expect(mainText).toMatch(/Google-only/i)
    expect(mainText).toMatch(/not supported yet|cannot.*delete/i)
    expect(mainText).not.toMatch(/delete your Google-only account in Profile/i)
    expect(mainText).not.toMatch(/confirming with Google is supported/i)
  })
})

describe('Terms disclosures', () => {
  it('differentiates guest storage risk from account storage and notes Google-only deletion limitation', async () => {
    renderRoute('/terms')
    await screen.findByRole('heading', { level: 1, name: 'Terms' })
    const mainText = screen.getByRole('main').textContent ?? ''

    expect(mainText).toMatch(/Guest mode/i)
    expect(mainText).toMatch(/Account mode/i)
    expect(mainText).toMatch(/clear.*browser|browser data/i)
    expect(mainText).toMatch(/remote server/i)
    expect(mainText).toMatch(/Google-only/i)
    expect(mainText).toMatch(/not supported yet|cannot.*delete/i)
    expect(mainText).toMatch(/student/i)
  })
})

describe('Legal entry-point links', () => {
  it.each([
    '/',
    '/sign-in',
    '/sign-up',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/privacy',
    '/terms',
    '/does-not-exist',
  ])('footer on %s links to Privacy and Terms', async (path) => {
    renderRoute(path)
    const footer = await screen.findByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Privacy' })).toHaveAttribute(
      'href',
      '/privacy',
    )
    expect(within(footer).getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })

  it('navigates from Landing to Privacy and Terms', async () => {
    const { router } = renderRoute('/')
    const footer = await screen.findByRole('contentinfo')
    await userEvent.click(within(footer).getByRole('link', { name: 'Privacy' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Privacy' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/privacy')

    await userEvent.click(
      within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Terms' }),
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'Terms' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/terms')
  })

  it('confirms Profile remains in the app shell without standalone legal footer links', async () => {
    renderRoute('/profile')
    await screen.findByRole('heading', { level: 1, name: 'Profile' })
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument()
  })
})
