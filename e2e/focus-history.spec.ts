import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'Asia/Phnom_Penh' })

test('shows a saved guest session on its starting local date, including offline', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date('2026-11-23T16:59:10Z') })
  await page.goto('/focus')
  const history = page.getByRole('region', { name: 'Focus history' })
  const date = history.getByLabel('Session date')
  const start = page.getByRole('button', { name: 'Start', exact: true })

  await expect(date).toHaveValue('2026-11-23')
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await start.focus()
  await page.keyboard.press('Tab')
  await expect(date).toBeFocused()
  await start.click()
  await page.clock.fastForward(48_000)
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.clock.fastForward(30_000)
  await page.getByRole('button', { name: 'End early' }).click()

  const row = history.getByRole('listitem')
  await expect(row).toContainText('Stopwatch')
  await expect(row).toContainText('Ended early')
  await expect(row.locator('time')).toHaveText('23:59')
  await expect(history.locator('dd')).toContainText(/^(?:4[89]|5\d)(?:\.\d+)? sec$/)
  await expect(date).toHaveValue('2026-11-23')

  await context.setOffline(true)
  await date.fill('2026-11-24')
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await date.fill('2026-11-23')
  await expect(row).toBeVisible()
  await expect(history).not.toContainText('Focus history is unavailable offline.')
})

test('fits Focus history at six widths with normal and doubled text', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-23T08:00:00Z') })
  await page.goto('/focus')
  const history = page.getByRole('region', { name: 'Focus history' })
  const date = history.getByLabel('Session date')

  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.clock.fastForward(65_000)
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(history.getByRole('listitem')).toContainText('Completed')

  const { violations } = await new AxeBuilder({ page }).include('#main').analyze()
  expect(violations).toEqual([])

  for (const scale of [100, 200]) {
    await page.evaluate((scale) => {
      document.documentElement.style.fontSize = scale + '%'
    }, scale)

    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 812 })
      const context = `${width}px at ${scale}% text size`
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        context,
      ).toBeLessThanOrEqual(0)

      await page.evaluate(() => window.scrollTo(0, 0))
      await date.focus()
      const box = await date.boundingBox()
      if (!box) throw new Error('The session date input must be visible')
      expect(Math.min(box.height, box.width), context).toBeGreaterThanOrEqual(44)
      if (width < 768) {
        const nav = await page.getByRole('navigation').filter({ visible: true }).boundingBox()
        if (!nav) throw new Error('Mobile navigation must be visible')
        expect(box.y + box.height, context).toBeLessThanOrEqual(nav.y)
      }
      await date.blur()
    }
  }
})
