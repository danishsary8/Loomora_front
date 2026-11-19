import { expect, test } from '@playwright/test'

const ACCOUNT_SESSION = {
  token: '1|test-bearer-token',
  expiresAt: '2099-01-01T00:00:00Z',
  user: {
    id: 'u-1',
    name: 'Sokha',
    email: 'sokha@example.com',
    timezone: 'Asia/Phnom_Penh',
    survey_done: true,
  },
}

test.describe('Backend outage and not-found states (F-019)', () => {
  test('with /api/** aborted in account mode the banner appears, and after un-abort plus Retry it disappears', async ({
    page,
  }) => {
    // Seed account session in localStorage
    await page.addInitScript((session) => {
      localStorage.setItem('loomora.session', JSON.stringify(session))
    }, ACCOUNT_SESSION)

    // Abort all API requests to simulate network failure / backend down
    await page.route('**/api/**', (route) => route.abort())

    await page.goto('/today')

    // In account mode, the network failure triggers the top backend outage banner
    const banner = page.getByRole('alert')
    await expect(banner).toBeVisible()
    await expect(
      page.getByText(
        'Cannot reach the server. Changes cannot be saved until connection is restored.',
      ),
    ).toBeVisible()
    // Must NOT promise offline sync (no outbox yet)
    await expect(banner).not.toContainText('saves on this device')

    const retryBtn = page.getByRole('button', { name: 'Retry' })
    await expect(retryBtn).toBeVisible()

    // Un-abort API and mock recovery response (GET /health and API calls)
    await page.unroute('**/api/**')
    await page.route('**/api/**', async (route) => {
      const url = route.request().url()
      if (url.includes('/health')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ status: 'ok' }),
        })
        return
      }
      if (url.includes('/streak')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            current_streak: 0,
            longest_streak: 0,
            today_counted: false,
          }),
        })
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    // Clicking Retry immediately polls /health and clears the outage state
    await retryBtn.click()

    await expect(page.getByRole('alert')).toBeHidden()
    await expect(
      page.getByText(
        'Cannot reach the server. Changes cannot be saved until connection is restored.',
      ),
    ).toBeHidden()
  })

  test('an unknown URL shows the 404 page', async ({ page }) => {
    await page.goto('/this-page-does-not-exist')

    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await expect(page.getByText('This page does not exist.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to Today' })).toBeVisible()
  })
})
