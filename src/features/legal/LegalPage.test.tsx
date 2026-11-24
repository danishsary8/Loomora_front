import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/renderRoute'
import en from '@/i18n/en.json'

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
    expect(mainText).toMatch(/requires Google verification and a separate final confirmation/i)
    expect(mainText).toMatch(/depends on whether Google verification is enabled/i)
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
    expect(mainText).toMatch(/Google verification when the feature is enabled/i)
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

// Every string leaf below a translation subtree, e.g. all Privacy section titles, bodies and items.
function stringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  return Object.values(value as Record<string, unknown>).flatMap(stringLeaves)
}

describe.each([
  ['/privacy', 'Privacy', 'privacy', 7],
  ['/terms', 'Terms', 'terms', 6],
] as const)('%s Elemental layout', (path, title, page, sectionCount) => {
  it('still renders every legal sentence word-for-word', async () => {
    renderRoute(path)
    await screen.findByRole('heading', { level: 1, name: title })
    const mainText = screen.getByRole('main').textContent ?? ''
    for (const sentence of [en.legal.updated, ...stringLeaves(en.legal[page])]) {
      expect(mainText).toContain(sentence)
    }
  })

  it('lists every section in an "On this page" contents list that links to it', async () => {
    renderRoute(path)
    await screen.findByRole('heading', { level: 1, name: title })
    const contents = screen.getByRole('navigation', { name: 'On this page' })
    const links = within(contents).getAllByRole('link')
    const sectionHeadings = screen
      .getAllByRole('heading', { level: 2 })
      .filter((heading) => !contents.contains(heading))
    expect(links).toHaveLength(sectionCount)
    expect(sectionHeadings).toHaveLength(sectionCount)

    const titles = sectionHeadings.map((heading) => heading.textContent ?? '')
    expect(links.map((link) => link.textContent)).toEqual(titles)
    for (const heading of sectionHeadings) {
      const link = within(contents).getByRole('link', { name: heading.textContent ?? '' })
      const target = document.getElementById(link.getAttribute('href')?.split('#')[1] ?? '')
      expect(target).toHaveAccessibleName(heading.textContent ?? '')
      expect(target).toContainElement(heading)
    }
  })

  it('moves keyboard focus to the section a contents link points to', async () => {
    const { router } = renderRoute(path)
    await screen.findByRole('heading', { level: 1, name: title })
    const contents = screen.getByRole('navigation', { name: 'On this page' })
    const lastLink = within(contents).getAllByRole('link').at(-1)
    if (!lastLink) throw new Error('No contents links')

    lastLink.focus()
    await userEvent.keyboard('{Enter}')
    const section = screen.getByRole('region', { name: lastLink.textContent ?? '' })
    expect(section).toHaveFocus()
    expect(router.state.location).toMatchObject({ pathname: path, hash: `#${section.id}` })
  })

  it('offers a way back to Loomora, which a standalone PWA has no browser button for', async () => {
    const { router } = renderRoute(path)
    await screen.findByRole('heading', { level: 1, name: title })
    const back = screen.getByRole('link', { name: 'Back to Loomora' })
    expect(back).toHaveAttribute('href', '/')
    await userEvent.click(back)
    expect(router.state.location.pathname).toBe('/')
  })
})
