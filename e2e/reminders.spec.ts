import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'Asia/Phnom_Penh', reducedMotion: 'reduce' })

test('a mobile guest can set, snooze and persistently dismiss a reminder', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone-375', 'Mobile viewport scenario')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.clock.install({ time: new Date('2026-11-19T17:00:00Z') })
  await page.goto('/today')
  await page.getByRole('button', { name: 'Add a to-do' }).press('Enter')
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByLabel('Title')).toBeFocused()
  await sheet.getByLabel('Title').fill('Call the bank')
  await sheet.getByLabel('Remind me').fill('2026-11-20T00:01')
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  await sheet.getByRole('button', { name: 'Add', exact: true }).press('Enter')
  await expect(sheet).toBeHidden()
  await expect(page.getByRole('checkbox', { name: /Call the bank/ })).toBeVisible()
  const banner = page.getByRole('region', { name: 'Reminder' })
  await expect(banner).toBeHidden()
  await page.clock.fastForward(90_000)
  await expect(banner).toContainText('Call the bank')

  const done = banner.getByRole('button', { name: 'Done' })
  await done.focus()
  await page.keyboard.press('Tab')
  const snooze = banner.getByRole('button', { name: 'Snooze' })
  await expect(snooze).toBeFocused()
  await page.keyboard.press('Enter')
  const minutes = banner.getByRole('button', { name: '5 minutes', exact: true })
  await expect(minutes).toBeFocused()
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  await page.keyboard.press('Enter')
  await expect(banner).toBeHidden()
  await page.clock.fastForward(330_000)
  await expect(banner).toContainText('Call the bank')
  await banner.getByRole('button', { name: 'Dismiss' }).press('Enter')
  await expect(banner).toBeHidden()

  await page.reload()
  await expect(page.getByRole('checkbox', { name: /Call the bank/ })).toBeVisible()
  await page.clock.fastForward(31_000)
  await expect(banner).toBeHidden()
  expect(errors).toEqual([])
})
