import { expect, test, type Page } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })

test.skip(
  ({ browserName, viewport }) => browserName !== 'chromium' || viewport?.width !== 375,
  'Heading sweep runs once on phone-375',
)

const WIDTHS = [320, 375, 390, 768, 1024, 1440] as const
/** Root text scale: 1 is the browser default, 2 is 200% text. */
const TEXT_SCALES = [1, 2] as const

/** Every screen whose title is the shared `PageHeading`. */
const SCREENS = [
  { path: '/today', heading: 'Today' },
  { path: '/week', heading: 'Week' },
  { path: '/focus', heading: 'Focus' },
  { path: '/insights', heading: 'Insights' },
  { path: '/profile', heading: 'Profile' },
  { path: '/sign-in', heading: 'Sign in' },
  { path: '/sign-up', heading: 'Create an account' },
  { path: '/forgot-password', heading: 'Forgot password' },
  { path: '/reset-password?token=abc&email=sokha%40example.test', heading: 'New password' },
  { path: '/verify-email?id=abc', heading: 'Confirm email' },
  { path: '/auth/google/deletion/callback', heading: 'Delete your account' },
  { path: '/privacy', heading: 'Privacy' },
  { path: '/terms', heading: 'Terms' },
  { path: '/missing-page', heading: 'Page not found' },
] as const

/**
 * Sets the viewport and root text scale, then waits until the layout reflects both. Chromium can
 * report the previous layout for a few frames after a live resize and text-size change.
 */
async function settle(page: Page, width: number, scale: number) {
  await page.setViewportSize({ width, height: 800 })
  await page.evaluate((rootScale) => {
    document.documentElement.style.fontSize = rootScale === 1 ? '' : `${rootScale * 100}%`
    return document.fonts.ready.then(() => undefined)
  }, scale)
  await page.waitForFunction(
    ({ expectedWidth, rootSize }) =>
      window.innerWidth === expectedWidth &&
      document.querySelector('h1') !== null &&
      getComputedStyle(document.documentElement).fontSize === `${rootSize}px`,
    { expectedWidth: width, rootSize: 16 * scale },
  )
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  )
}

/** How far the `h1`, the editorial headline (app screens), and the page reach past their boxes. */
async function overflow(page: Page) {
  return page.evaluate(() => {
    const reach = (element: Element | null) =>
      element ? element.scrollWidth - element.clientWidth : 0
    return {
      heading: Math.max(
        reach(document.querySelector('h1')),
        reach(document.querySelector('[data-page-headline]')),
      ),
      page: document.documentElement.scrollWidth - window.innerWidth,
    }
  })
}

test.beforeEach(async ({ page }) => {
  await page.route(/\/api\//, (route) =>
    route.fulfill({ status: 503, json: { message: 'Not in this test' } }),
  )
})

test('page headings fit at 320–1440 px and 200% text after fonts load', async ({ page }) => {
  for (const { path, heading } of SCREENS) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
    for (const scale of TEXT_SCALES) {
      for (const width of WIDTHS) {
        await settle(page, width, scale)
        expect
          .soft(await overflow(page), `${path} at ${width} px, ${scale * 100}% text`)
          .toEqual({ heading: 0, page: 0 })
      }
    }
  }
})

test('keyboard focus stays on screen on forgot password at 320 px and 200% text', async ({
  page,
}) => {
  await page.goto('/forgot-password')
  await expect(page.getByRole('heading', { level: 1, name: 'Forgot password' })).toBeVisible()
  await settle(page, 320, 2)
  expect(await overflow(page)).toEqual({ heading: 0, page: 0 })
  const order = [
    page.getByRole('link', { name: 'Loomora', exact: true }),
    page.getByLabel('Email'),
    page.getByRole('button', { name: 'Send reset link' }),
    page.getByRole('link', { name: 'Back to sign in' }),
  ]
  await page.getByRole('heading', { level: 1 }).click()
  for (const target of order) {
    await page.keyboard.press('Tab')
    await expect(target).toBeFocused()
    const { left, right, outline } = await target.evaluate((element) => ({
      ...element.getBoundingClientRect().toJSON(),
      outline: getComputedStyle(element).outlineStyle,
    }))
    expect(left).toBeGreaterThanOrEqual(0)
    expect(right).toBeLessThanOrEqual(320)
    expect(outline).toBe('solid')
  }
})
