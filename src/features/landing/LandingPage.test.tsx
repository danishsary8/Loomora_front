import { screen, within } from '@testing-library/react'
import { renderRoute } from '@/test/renderRoute'

describe('Landing page (S1)', () => {
  it('shows the promise, Try it now and Sign in', async () => {
    renderRoute('/')
    expect(await screen.findByRole('heading', { level: 1, name: 'Loomora' })).toBeInTheDocument()
    expect(
      screen.getByText('Plan your day, focus on it, and see how it really went.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Try it now' })).toHaveAttribute('href', '/today')
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
  })

  it('lists three feature highlights', async () => {
    renderRoute('/')
    const list = within(await screen.findByRole('region', { name: 'What you get' })).getByRole(
      'list',
    )
    const titles = within(list)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titles).toEqual(['Plan your day', 'Know what is next', 'Keep your streak'])
  })

  it('has Privacy and Terms in the footer', async () => {
    renderRoute('/')
    await screen.findByRole('heading', { level: 1, name: 'Loomora' })
    expect(screen.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })
})
