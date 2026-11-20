import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })

for (const hasPassword of [true, false]) {
  test(`account deletion sheet for ${hasPassword ? 'password' : 'Google-only'} accounts`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'phone-375', 'Mobile viewport scenario')
    const errors: string[] = []
    const deletions: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    await page.addInitScript((has_password) => {
      localStorage.setItem(
        'loomora.session',
        JSON.stringify({
          token: '1|e2e',
          expiresAt: '2099-01-01T00:00:00Z',
          user: {
            id: 'e2e-account',
            name: 'Sokha',
            email: 'sokha@example.test',
            has_password,
            email_verified_at: '2026-10-24T03:00:00Z',
            timezone: 'Asia/Phnom_Penh',
            time_format: '24h',
            week_starts_on: 1,
            survey_done: true,
            goal: null,
            heard_from: null,
            current_streak: 0,
            longest_streak: 0,
            created_at: '2026-10-24T03:00:00Z',
          },
        }),
      )
    }, hasPassword)
    await page.route(/\/api\//, async (route) => {
      const request = route.request()
      const headers = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      }
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      if (request.method() === 'DELETE') {
        deletions.push(request.url())
        return route.fulfill({ status: 422, headers, json: { errors: { password: ['Rejected'] } } })
      }
      const path = new URL(request.url()).pathname
      const data = path.endsWith('/streak')
        ? { current_streak: 0, longest_streak: 0, today_counted: false }
        : []
      return route.fulfill({ headers, json: { data } })
    })

    await page.goto('/profile')
    const trigger = page.getByRole('button', { name: 'Delete my account' })
    await trigger.press('Enter')
    const sheet = page.getByRole('dialog', { name: 'Delete your account' })
    const close = sheet.getByRole('button', { name: 'Close' })
    const cancel = sheet.getByRole('button', { name: 'Cancel' })
    const password = sheet.getByLabel('Your password')
    const submit = sheet.getByRole('button', { name: 'Delete everything' })
    await expect(close).toBeFocused()
    await page.keyboard.press('Tab')
    if (hasPassword) {
      await expect(password).toBeFocused()
      await expect(sheet.getByText(/This deletes your account/)).toBeVisible()
      await page.keyboard.press('Tab')
      await expect(submit).toBeFocused()
      await page.keyboard.press('Tab')
    } else {
      await expect(sheet.getByText(/Confirming your identity with Google/)).toBeVisible()
      await expect(password).toHaveCount(0)
      await expect(submit).toHaveCount(0)
    }
    await expect(cancel).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(close).toBeFocused()

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
    if (hasPassword) await page.keyboard.press('Escape')
    else await cancel.press('Enter')
    await expect(sheet).toBeHidden()
    await expect(trigger).toBeFocused()
    expect(errors).toEqual([])
    expect(deletions).toEqual([])
  })
}
