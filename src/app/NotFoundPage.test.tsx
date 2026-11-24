import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderRoute } from '@/test/renderRoute'

describe('NotFoundPage', () => {
  it('names the page with an h1, explains it and keeps Go to Today as the one primary action', async () => {
    renderRoute('/does-not-exist')
    const main = screen.getByRole('main')
    expect(
      await within(main).findByRole('heading', { level: 1, name: 'Page not found' }),
    ).toBeVisible()
    expect(within(main).getByText('Error 404')).toBeVisible()
    expect(within(main).getByText('This page does not exist.')).toBeVisible()
    expect(within(main).getByRole('link', { name: 'Go to Today' })).toHaveAttribute(
      'href',
      '/today',
    )
    expect(within(main).getByRole('link', { name: 'Back to Loomora' })).toHaveAttribute('href', '/')
    expect(main.querySelectorAll('.bg-primary')).toHaveLength(1)
  })

  it('gives every recovery link a 44 px touch target', async () => {
    renderRoute('/does-not-exist')
    const main = screen.getByRole('main')
    await within(main).findByRole('heading', { level: 1, name: 'Page not found' })
    for (const link of within(main).getAllByRole('link')) {
      expect(link.className).toMatch(/min-h-touch|min-h-\[52px\]/)
    }
  })

  it('reaches Today and the landing page from the keyboard', async () => {
    const user = userEvent.setup()
    const { router } = renderRoute('/missing/deep/link')
    await screen.findByRole('heading', { level: 1, name: 'Page not found' })

    await user.tab()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Go to Today' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Back to Loomora' })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe('/')
  })
})
