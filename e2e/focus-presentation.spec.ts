import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'UTC' })

test('opens native fullscreen and restores focus on explicit and browser exit', async ({
  page,
}) => {
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  const expand = page.getByRole('button', { name: 'Expand timer' })
  const dialog = page.getByRole('dialog', { name: 'Focus timer' })
  const exit = dialog.getByRole('button', { name: 'Exit expanded view' })

  const nativeAvailable = await page.evaluate(() => document.fullscreenEnabled)
  await expand.click()
  await expect(exit).toBeFocused()
  if (nativeAvailable) {
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(expand).toBeFocused()
    await expand.press('Enter')
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true)
  }
  await exit.click()
  await expect(dialog).toHaveCount(0)
  await expect(expand).toBeFocused()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false)
})

test('unsupported fullscreen keeps the countdown and phase controls through Escape and navigation', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined })
  })
  await page.clock.install({ time: new Date('2026-11-24T23:57:00Z') })
  await page.goto('/today')
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  const addTodo = page.getByRole('dialog', { name: 'Add a to-do' })
  await addTodo.getByLabel('Title').fill('Midnight reading')
  await addTodo.getByRole('button', { name: 'Add', exact: true }).click()
  await page.getByText('Midnight reading', { exact: true }).click()
  await expect(page.getByText('Done!', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Focus', exact: true }).click()
  await page.getByLabel('Link to your plan (optional)').selectOption({ label: 'Midnight reading' })
  await page.getByRole('radio', { name: 'Custom' }).click()
  await page.getByRole('spinbutton', { name: 'Duration in minutes' }).fill('1')
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  const expand = page.getByRole('button', { name: 'Expand timer' })
  await expand.press('Enter')

  const dialog = page.getByRole('dialog', { name: 'Focus timer' })
  const exit = dialog.getByRole('button', { name: 'Exit expanded view' })
  await expect(exit).toBeFocused()
  await expect(dialog.getByRole('timer', { name: 'Time remaining' })).toBeVisible()
  await dialog.getByRole('button', { name: 'Mute timer sound', pressed: false }).click()
  await page.clock.fastForward(61_000)
  await expect(dialog.getByRole('button', { name: 'Start short break' })).toBeVisible()
  await expect(dialog.getByRole('timer')).toHaveText('05:00')
  await dialog.getByRole('button', { name: 'Start short break' }).click()
  const pause = dialog.getByRole('button', { name: 'Pause' })
  await expect(pause).toHaveAttribute('aria-disabled', 'false')
  await page.clock.fastForward(10_000)
  await pause.click()
  await expect(dialog.getByRole('button', { name: 'Resume' })).toBeVisible()
  const pausedTime = await dialog.getByRole('timer').innerText()
  expect(pausedTime).toMatch(/^04:(?:4\d|50)$/)
  await page.clock.fastForward(3 * 60_000)

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(expand).toBeFocused()
  await expect(page.getByRole('timer')).toHaveText(pausedTime)
  await expect(page.getByText('Linked to Midnight reading')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mute timer sound', pressed: true })).toBeVisible()
  await page.getByRole('link', { name: 'Week', exact: true }).click()
  await expect(page).toHaveURL(/\/week$/)
  await page.getByRole('link', { name: 'Focus', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText(pausedTime)
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await expand.click()
  await expect(dialog).toBeVisible()
  await page.reload()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('timer')).toHaveText(pausedTime)
})

test('denied fullscreen preserves stopwatch controls and fits the responsive fallback', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
    })
  })
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Stopwatch', exact: true }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await page.getByRole('button', { name: 'Expand timer' }).click()
  const dialog = page.getByRole('dialog', { name: 'Focus timer' })
  const exit = dialog.getByRole('button', { name: 'Exit expanded view' })
  const lap = dialog.getByRole('button', { name: 'Lap', exact: true })
  const endEarly = dialog.getByRole('button', { name: 'End early' })

  await expect(exit).toBeFocused()
  await page
    .locator('a[href="/today"]:visible')
    .first()
    .evaluate((link: HTMLElement) => link.focus())
  await expect(exit).toBeFocused()
  await expect(dialog.getByRole('timer', { name: 'Elapsed time' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Finish', exact: true })).toBeVisible()
  await endEarly.focus()
  await page.keyboard.press('Tab')
  // Some browsers include the address bar in sequential navigation before returning to the dialog.
  if (!(await exit.evaluate((element) => element === document.activeElement))) {
    await page.keyboard.press('Tab')
  }
  await expect(exit).toBeFocused()
  await expect(lap).toHaveAttribute('aria-disabled', 'false')
  await lap.click()
  await expect(dialog.getByText('Lap 1')).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await dialog.getByRole('button', { name: 'Pause' }).click()
  await expect(dialog.getByRole('button', { name: 'Resume' })).toBeVisible()

  expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([])
  expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(
    true,
  )
  for (const scale of [100, 200]) {
    await page.evaluate((value) => {
      document.documentElement.style.fontSize = value + '%'
    }, scale)
    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 812 })
      const overflow = await dialog.evaluate((element) => ({
        page: document.documentElement.scrollWidth - innerWidth,
        dialog: element.scrollWidth - element.clientWidth,
        content: (element.firstElementChild?.scrollWidth ?? 0) - element.clientWidth,
      }))
      expect(overflow, `${width}px at ${scale}% text size`).toEqual({
        page: 0,
        dialog: 0,
        content: 0,
      })
      for (const control of await dialog.getByRole('button').all()) {
        await control.focus()
        const bounds = await control.boundingBox()
        if (!bounds) throw new Error('Expanded timer control must be visible')
        expect(Math.min(bounds.width, bounds.height)).toBeGreaterThanOrEqual(44)
        expect(bounds.y).toBeGreaterThanOrEqual(0)
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(812)
      }
    }
  }

  await dialog.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Focus history', exact: true })).toBeVisible()
})
