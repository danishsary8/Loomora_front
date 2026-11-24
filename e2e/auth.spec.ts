import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type Route } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })

test.skip(
  ({ browserName, viewport }) => browserName !== 'chromium' || viewport?.width !== 375,
  'Auth sweep runs once on phone-375',
)

const WIDTHS = [320, 375, 390, 768, 1024, 1440] as const
const SCREENS = [
  { path: '/sign-in', heading: 'Sign in' },
  { path: '/sign-up', heading: 'Create an account' },
  { path: '/forgot-password', heading: 'Forgot password' },
  { path: '/reset-password?token=abc&email=sokha%40example.test', heading: 'New password' },
  { path: '/verify-email?id=abc', heading: 'Confirm email' },
] as const

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

type Answer = { status: number; json: unknown }

/** Answers each auth endpoint from `answers` and records every request the screens send. */
async function mockAuthApi(page: Page, answers: Record<string, Answer> = {}) {
  const requests: string[] = []
  await page.route(/\/api\//, async (route: Route) => {
    const request = route.request()
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    requests.push(`${request.method()} ${path}`)
    const answer = answers[path] ?? { status: 503, json: { message: 'Not in this test' } }
    return route.fulfill({ status: answer.status, headers: CORS, json: answer.json })
  })
  return requests
}

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

test('sign-in checks fields, then shows the server answer without signing in', async ({ page }) => {
  const requests = await mockAuthApi(page, {
    '/auth/login': {
      status: 422,
      json: {
        message: 'Invalid.',
        errors: { email: ['These credentials do not match our records.'] },
      },
    },
  })
  await page.goto('/sign-in')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  await expect(page.getByText('Enter your password.')).toBeVisible()
  expect(requests).toEqual([])

  await page.getByLabel('Email').fill('sokha@example.test')
  await page.getByLabel('Password').fill('wrong-password')
  await page.getByLabel('Password').press('Enter')
  await expect(page.getByText('Wrong email or password.')).toBeVisible()
  await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true')
  await expect(page).toHaveURL(/\/sign-in$/)
  expect(requests).toEqual(['POST /auth/login'])
})

test('a network failure shows one danger notice on sign-up', async ({ page }) => {
  await page.route(/\/api\//, (route) => route.abort())
  await page.goto('/sign-up')
  await page.getByLabel('Email').fill('sokha@example.test')
  await page.getByLabel('Password').fill('long-enough-password')
  await page.getByRole('button', { name: 'Create account' }).click()
  const alert = page.getByRole('main').getByRole('alert')
  await expect(alert).toContainText('Could not reach Loomora')
  await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()
})

test('a Google error from the callback shows on the matching page', async ({ page }) => {
  await mockAuthApi(page)
  await page.goto('/sign-up?error=account_already_exists')
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'That Google address already has an account',
  )
  const google = page.getByRole('link', { name: 'Sign up with Google' })
  expect(new URL((await google.getAttribute('href')) ?? '').searchParams.get('intent')).toBe(
    'sign_up',
  )
})

test('links move between sign in, sign up and the password reset screens', async ({ page }) => {
  await mockAuthApi(page, { '/auth/password/forgot': { status: 200, json: { message: 'ok' } } })
  await page.goto('/sign-in')
  await page.getByRole('link', { name: 'New here? Create an account' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Create an account' })).toBeVisible()
  await page.getByRole('link', { name: 'Already have an account? Sign in' }).click()
  await page.getByRole('link', { name: 'Forgot your password?' }).click()
  await expect(page).toHaveURL(/\/forgot-password$/)

  await page.getByLabel('Email').fill('sokha@example.test')
  await page.getByRole('button', { name: 'Send reset link' }).click()
  await expect(page.getByText(/If an account exists for that email/)).toBeVisible()
  await page.getByRole('link', { name: 'Back to sign in' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
})

test('keyboard moves through sign-in in reading order with a visible focus ring', async ({
  page,
}) => {
  await mockAuthApi(page)
  await page.goto('/sign-in')
  const google = page.getByRole('link', { name: 'Sign in with Google' })
  const order = [
    page.getByLabel('Email'),
    page.getByLabel('Password'),
    page.getByRole('link', { name: 'Forgot your password?' }),
    page.getByRole('button', { name: 'Sign in' }),
    page.getByRole('link', { name: 'New here? Create an account' }),
  ]
  await google.focus()
  for (const target of order) {
    await page.keyboard.press('Tab')
    await expect(target).toBeFocused()
    expect(await target.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
  }
})

test('a guest goes from Save your plan to sign-up and back to the guest plan', async ({ page }) => {
  const requests = await mockAuthApi(page)
  await page.goto('/profile')
  await page
    .getByRole('region', { name: 'Your data' })
    .getByRole('button', { name: 'Save your plan' })
    .click()
  await page
    .getByRole('dialog', { name: 'Save your plan' })
    .getByRole('button', {
      name: 'Create an account',
    })
    .click()
  await expect(page).toHaveURL(/\/sign-up$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Create an account' })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()
  expect(requests.filter((r) => !r.startsWith('GET'))).toEqual([])
})

test('auth screens pass axe and keep targets at least 44 px', async ({ page }) => {
  await mockAuthApi(page)
  for (const { path, heading } of SCREENS) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    const results = await new AxeBuilder({ page }).analyze()
    expect(results.violations, path).toEqual([])
    const targets = page.getByRole('main').locator('a, button, input')
    for (const target of await targets.all()) {
      const box = await target.boundingBox()
      expect(box?.height ?? 0, `${path} target height`).toBeGreaterThanOrEqual(44)
    }
  }
})

test('auth screens have no horizontal overflow at 320–1440 px and 200% text', async ({ page }) => {
  await mockAuthApi(page)
  for (const { path, heading } of SCREENS) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      expect(await horizontalOverflow(page), `${path} at ${width} px`).toBeLessThanOrEqual(0)
    }
    await page.setViewportSize({ width: 320, height: 800 })
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    expect(await horizontalOverflow(page), `${path} at 200%`).toBeLessThanOrEqual(0)
    await page.evaluate(() => {
      document.documentElement.style.fontSize = ''
    })
  }
})
