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
  const pause = page.getByRole('button', { name: 'Pause' })
  await expect(pause).toHaveAttribute('aria-disabled', 'false')
  await page.clock.fastForward(48_000)
  await pause.click()
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.clock.fastForward(30_000)
  await page.getByRole('button', { name: 'End early' }).click()

  const row = history.getByRole('listitem')
  await expect(row).toContainText('Stopwatch')
  await expect(row).toContainText('Ended early')
  await expect(row.locator('time')).toHaveText('23:59')
  await expect(history.locator('dd')).toHaveText(/^(?:4[89]|5\d)(?:\.\d+)? sec$/)
  await expect(date).toHaveValue('2026-11-23')

  await context.setOffline(true)
  await date.fill('2026-11-24')
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await date.fill('2026-11-23')
  await expect(row).toBeVisible()
  const search = history.getByRole('searchbox', { name: 'Search sessions' })
  const modes = history.getByRole('group', { name: 'Timer mode' })
  const all = modes.getByRole('radio', { name: 'All' })
  const countdown = modes.getByRole('radio', { name: 'Countdown' })
  const stopwatch = modes.getByRole('radio', { name: 'Stopwatch' })
  await search.fill('ENDED EARLY')
  await stopwatch.click()
  await expect(row).toContainText('Stopwatch')
  await date.fill('2026-11-24')
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await date.fill('2026-11-23')
  await expect(row).toBeVisible()
  await countdown.click()
  await expect(history.getByRole('status')).toHaveText('No sessions match your filters.')
  await expect(history.locator('dd')).toHaveText(/^(?:4[89]|5\d)(?:\.\d+)? sec$/)
  await history.getByRole('button', { name: 'Clear filters' }).press('Enter')
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')
  await expect(all).toBeChecked()
  await expect(date).toHaveValue('2026-11-23')
  await expect(row).toBeVisible()
  await expect(history).not.toContainText('Focus history is unavailable offline.')
})

test('fits Focus history at six widths with normal and doubled text', async ({ page }) => {
  await page.goto('/focus')
  const history = page.getByRole('region', { name: 'Focus history' })
  const date = history.getByLabel('Session date')
  const start = page.getByRole('button', { name: 'Start', exact: true })

  await start.click()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.getByRole('button', { name: 'End early', exact: true }).click()
  await expect(history.getByRole('listitem')).toContainText('Countdown')

  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await start.click()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  const modes = history.getByRole('group', { name: 'Timer mode' })
  const all = modes.getByRole('radio', { name: 'All' })
  const countdown = modes.getByRole('radio', { name: 'Countdown' })
  const stopwatch = modes.getByRole('radio', { name: 'Stopwatch' })
  const search = history.getByRole('searchbox', { name: 'Search sessions' })
  const clear = history.getByRole('button', { name: 'Clear filters' })
  await expect(history.getByRole('listitem')).toHaveCount(2)
  await all.press('ArrowRight')
  await expect(countdown).toBeChecked()
  await expect(history.getByRole('listitem')).toContainText('Countdown')
  await countdown.press('ArrowRight')
  await expect(stopwatch).toBeChecked()
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

      await start.focus()
      const mobileNav = page.getByRole('navigation').filter({ visible: true })
      for (const option of [all, countdown, stopwatch]) {
        const box = await option.boundingBox()
        if (!box) throw new Error('The filter option must be visible')
        expect(Math.min(box.height, box.width), context).toBeGreaterThanOrEqual(44)
      }
      for (const control of [date, search, stopwatch, clear]) {
        await page.keyboard.press('Tab')
        if (control === search) {
          // Chromium tabs through each part of a native date field before exiting it.
          for (let part = 0; part < 4; part++) {
            if (!(await date.evaluate((field) => field === document.activeElement))) break
            await page.keyboard.press('Tab')
          }
        }
        await expect(control, context).toBeFocused()
        const box = await control.boundingBox()
        if (!box) throw new Error('The History control must be visible')
        expect(Math.min(box.height, box.width), context).toBeGreaterThanOrEqual(44)
        if (width < 768) {
          await expect
            .poll(
              async () => {
                const field = await control.boundingBox()
                const nav = await mobileNav.boundingBox()
                if (!field || !nav)
                  throw new Error('The History control and mobile navigation must be visible')
                return Math.min(field.y, nav.y - field.y - field.height)
              },
              { message: context },
            )
            .toBeGreaterThanOrEqual(0)
        }
      }
    }
  }
})
