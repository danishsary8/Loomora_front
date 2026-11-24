import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })

const WIDTHS = [320, 375, 390, 768, 1024, 1440]

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

/** Signs in a mocked account and records every write the screen sends. */
async function mockAccount(page: Page) {
  const writes: string[] = []
  await page.addInitScript(() => {
    localStorage.setItem(
      'loomora.session',
      JSON.stringify({
        token: '1|e2e',
        expiresAt: '2099-01-01T00:00:00Z',
        user: {
          id: 'e2e-profile',
          name: 'Sokha',
          email: 'sokha.with.a.rather.long.address@example.test',
          has_password: true,
          email_verified_at: null,
          timezone: 'Asia/Phnom_Penh',
          time_format: '24h',
          week_starts_on: 1,
          survey_done: true,
          goal: null,
          heard_from: null,
          current_streak: 4,
          longest_streak: 4,
          created_at: '2026-10-24T03:00:00Z',
        },
      }),
    )
  })
  await page.route(/\/api\//, async (route) => {
    const request = route.request()
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (request.method() !== 'GET') {
      writes.push(`${request.method()} ${new URL(request.url()).pathname}`)
      return route.fulfill({ status: 503, headers, json: { message: 'Not in this test' } })
    }
    const path = new URL(request.url()).pathname
    const data = path.endsWith('/streak')
      ? { current_streak: 4, longest_streak: 4, today_counted: true }
      : []
    return route.fulfill({ headers, json: { data } })
  })
  return writes
}

/** Page overflow and the smallest visible button in the main area, in CSS px. */
function measure(page: Page) {
  return page.evaluate(() => {
    const heights = Array.from(document.querySelectorAll('main button'))
      .map((button) => button.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0)
      .map((box) => box.height)
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      smallestButton: Math.min(...heights),
    }
  })
}

async function sweep(page: Page) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    const { overflow, smallestButton } = await measure(page)
    expect(overflow, `overflow at ${width} px`).toBe(0)
    expect(smallestButton, `smallest button at ${width} px`).toBeGreaterThanOrEqual(44)
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  expect((await measure(page)).overflow, 'overflow at 200% text').toBe(0)
  await page.evaluate(() => {
    document.documentElement.style.fontSize = ''
  })
}

test('guest Profile keeps the device notice, settings and feedback across widths', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone-375', 'Mobile viewport scenario')
  const errors = watchErrors(page)
  await page.goto('/profile')

  await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()
  await expect(page.getByText('You are using Loomora as a guest on this device.')).toBeVisible()
  const notice = page.getByRole('region', { name: 'Your data' })
  await expect(notice.getByText('Data lives on this device only.')).toBeVisible()
  await expect(notice.getByRole('button', { name: 'Save your plan' })).toBeVisible()
  await expect(page.getByText('0 days')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save settings' })).toBeDisabled()
  await expect(page.getByRole('region', { name: 'Account actions' })).toHaveCount(0)

  const feedback = page.getByRole('region', { name: 'Help' }).getByRole('button', {
    name: 'Send feedback',
  })
  await feedback.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Send feedback' })
  await expect(sheet.getByRole('button', { name: 'Send' })).toBeDisabled()
  await page.keyboard.press('Escape')
  await expect(sheet).toBeHidden()
  await expect(feedback).toBeFocused()

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(violations).toEqual([])
  await sweep(page)
  expect(errors).toEqual([])
})

test('account Profile keeps editing and guarded account actions without writing', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone-375', 'Mobile viewport scenario')
  const errors = watchErrors(page)
  const writes = await mockAccount(page)
  await page.goto('/profile')

  await expect(page.getByText('Your streak, settings and account.')).toBeVisible()
  await expect(page.getByText('4 days')).toBeVisible()
  await expect(page.getByText('Your email is not confirmed yet.')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Your data' })).toHaveCount(0)

  const name = page.getByLabel('Name')
  await expect(name).toHaveValue('Sokha')
  const save = page.getByRole('button', { name: 'Save changes' })
  await expect(save).toBeDisabled()
  await name.fill('Sokha Chan')
  await expect(save).toBeEnabled()
  await name.fill('Sokha')
  await expect(save).toBeDisabled()
  await expect(page.getByRole('group', { name: 'Display settings' })).toBeVisible()

  const actions = page.getByRole('region', { name: 'Account actions' })
  await expect(actions.getByRole('button', { name: 'Sign out' })).toBeVisible()
  const remove = actions.getByRole('button', { name: 'Delete my account' })
  await remove.press('Enter')
  const sheet = page.getByRole('dialog', { name: 'Delete your account' })
  await expect(sheet.getByText(/This deletes your account/)).toBeVisible()
  await sheet.getByRole('button', { name: 'Delete everything' }).click()
  await expect(sheet.getByText('Enter your password.')).toBeVisible()
  await sheet.getByRole('button', { name: 'Cancel' }).click()
  await expect(sheet).toBeHidden()
  await expect(remove).toBeFocused()

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  expect(violations).toEqual([])
  await sweep(page)
  expect(writes).toEqual([])
  expect(errors).toEqual([])
})
