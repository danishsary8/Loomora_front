import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

const WIDTHS = [320, 375, 390, 768, 1024, 1440] as const

async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
}

test.skip(
  ({ browserName, viewport }) => browserName !== 'chromium' || viewport?.width !== 375,
  'Viewport sweep runs once on phone-375',
)

test('Try it now opens empty Today as a guest and Sign in opens sign-in', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Try it now' }).click()
  await expect(page).toHaveURL(/\/today$/)
  await expect(page.getByRole('button', { name: 'Add a to-do' })).toBeVisible()

  await page.goto('/')
  await page.getByRole('link', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/sign-in$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
})

test('keyboard reaches Try it now and Sign in with a visible focus ring', async ({ page }) => {
  await page.goto('/')
  const tryIt = page.getByRole('link', { name: 'Try it now' })
  for (let i = 0; i < 5 && !(await tryIt.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab')
  }
  await expect(tryIt).toBeFocused()
  expect(await tryIt.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeFocused()
})

test('landing passes axe and keeps every target at least 44 px', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Loomora' })).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations).toEqual([])
  const targets = page
    .getByRole('main')
    .getByRole('link')
    .or(page.getByRole('contentinfo').getByRole('link'))
  for (const link of await targets.all()) {
    const box = await link.boundingBox()
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44)
  }
})

test('landing has no horizontal overflow at 320–1440 px, at 100% and 200% text', async ({
  page,
}) => {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Loomora' })).toBeVisible()
    expect(await horizontalOverflow(page), `${width} px`).toBeLessThanOrEqual(0)
    await page.evaluate(() => {
      document.documentElement.style.fontSize = '200%'
    })
    expect(await horizontalOverflow(page), `${width} px at 200%`).toBeLessThanOrEqual(0)
  }
})

test('other standalone pages keep 0 px overflow at 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 })
  for (const path of ['/sign-in', '/sign-up', '/privacy', '/terms', '/missing-page']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    expect(await horizontalOverflow(page), path).toBeLessThanOrEqual(0)
  }
})
