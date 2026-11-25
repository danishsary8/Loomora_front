import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/renderRoute'

describe('Landing page (S1)', () => {
  it('shows the promise, Try it now and Sign in', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Loomora' })).toBeInTheDocument()
    expect(
      screen.getByText('Plan your day, focus on it, and see how it really went.'),
    ).toBeVisible()
    expect(screen.getByText('No signup needed.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Try it now' })).toHaveAttribute('href', '/today')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  })

  it('uses Inter headings and the decorative Elemental brand mark instead of the legacy script font', async () => {
    renderRoute('/')
    const heading = await screen.findByRole('heading', { level: 1, name: 'Loomora' })
    expect(heading).toHaveClass('font-heading')
    expect(document.querySelector('.font-script')).toBeNull()
    const mark = heading.parentElement?.querySelector('svg')
    expect(mark).toHaveAttribute('aria-hidden', 'true')
  })

  it('makes Try it now the only primary action, with 44 px targets', async () => {
    renderRoute('/')
    const tryIt = await screen.findByRole('link', { name: 'Try it now' })
    const signIn = screen.getByRole('link', { name: 'Sign in' })
    expect(tryIt).toHaveClass('bg-primary')
    expect(signIn).not.toHaveClass('bg-primary')
    expect(tryIt).toHaveClass('min-h-[52px]')
    expect(signIn).toHaveClass('min-h-touch')
  })

  it('reaches Try it now then Sign in by keyboard', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await screen.findByRole('heading', { level: 1, name: 'Loomora' })
    const tryIt = screen.getByRole('link', { name: 'Try it now' })
    const signIn = screen.getByRole('link', { name: 'Sign in' })
    while (document.activeElement !== tryIt) await user.tab()
    await user.tab()
    expect(signIn).toHaveFocus()
  })

  it('opens empty Today as a guest from Try it now', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(await screen.findByRole('link', { name: 'Try it now' }))
    expect(await screen.findByRole('button', { name: 'Add a to-do' })).toBeInTheDocument()
  })

  it('opens Sign in from the landing page', async () => {
    const user = userEvent.setup()
    renderRoute('/')
    await user.click(await screen.findByRole('link', { name: 'Sign in' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
  })

  it('lists three feature highlights in their category tones with decorative icons', async () => {
    renderRoute('/')
    const list = within(await screen.findByRole('region', { name: 'What you get' })).getByRole(
      'list',
    )
    const items = within(list).getAllByRole('listitem')
    expect(
      items.map((item) => within(item).getByRole('heading', { level: 3 }).textContent),
    ).toEqual(['Plan your day', 'Know what is next', 'Keep your streak'])
    expect(items.map((item) => item.firstElementChild?.className)).toEqual([
      expect.stringContaining('bg-category-study'),
      expect.stringContaining('bg-category-work'),
      expect.stringContaining('bg-category-life'),
    ])
    for (const item of items) {
      expect(item.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    }
  })

  it('has Privacy and Terms in the footer', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1, name: 'Loomora' })
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })
})
