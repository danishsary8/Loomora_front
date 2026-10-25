import { expect, test } from '@playwright/test'

// F-013 done-when: Chrome sees the app as installable, and it opens offline after one visit.
test.describe('PWA', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'uses Chrome DevTools Protocol')

  test('Chrome reports no installability errors', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest/)
    const cdp = await context.newCDPSession(page)
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    expect(installabilityErrors).toEqual([])
  })

  test('opens offline after one visit and shows the offline banner', async ({ page, context }) => {
    await page.goto('/today')
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    // Wait until the service worker controls the page and has cached the shell.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    await expect(page.getByText(/You are offline/)).toBeVisible()

    await context.setOffline(false)
    await expect(page.getByText(/You are offline/)).toBeHidden()
  })
})
