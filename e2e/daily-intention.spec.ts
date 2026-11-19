import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Asia/Phnom_Penh', reducedMotion: 'reduce' })

test('guest intention saves, reloads, clears and changes local date on Today', async ({
  page,
  context,
}, info) => {
  test.skip(info.project.name !== 'phone-375', 'Mobile viewport scenario')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.clock.install({ time: new Date('2026-11-19T16:55:00Z') })
  await page.goto('/today')
  const intention = page.getByRole('textbox', { name: 'Daily intention' })
  const saved = page.getByText('Saved', { exact: true })
  await expect(intention).toBeEnabled()
  await context.setOffline(true)
  await intention.focus()
  await page.keyboard.type('Finish my study notes')
  await page.clock.runFor(601)
  await expect(saved).toBeVisible()
  await context.setOffline(false)
  await page.reload()
  await expect(intention).toHaveValue('Finish my study notes')
  await intention.fill('Review my study notes')
  await page.keyboard.press('Tab')
  await expect(saved).toBeVisible()
  await page.reload()
  await expect(intention).toHaveValue('Review my study notes')

  await intention.fill('x'.repeat(201))
  await expect(intention).toHaveValue('x'.repeat(200))
  await intention.fill('')
  await intention.blur()
  await expect(saved).toBeVisible()
  await page.reload()
  await expect(intention).toBeEnabled()
  await expect(intention).toHaveValue('')

  await intention.fill('Before midnight')
  await intention.blur()
  await expect(saved).toBeVisible()
  await page.clock.fastForward(5 * 60_000)
  await expect(intention).toBeEnabled()
  await expect(intention).toHaveValue('')
  await page.clock.setSystemTime(new Date('2026-11-19T16:56:00Z'))
  await page.reload()
  await expect(intention).toHaveValue('Before midnight')

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  expect(errors).toEqual([])
})
