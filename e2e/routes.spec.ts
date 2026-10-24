import { expect, test, type Page } from '@playwright/test'

// Every screen from docs/05 with the h1 it must show, and whether it sits in the app shell.
const SCREENS: { path: string; heading: string; shell: boolean }[] = [
  { path: '/', heading: 'Loomora', shell: false },
  { path: '/today', heading: 'Today', shell: true },
  { path: '/week', heading: 'Week', shell: true },
  { path: '/focus', heading: 'Focus', shell: true },
  { path: '/insights', heading: 'Insights', shell: true },
  { path: '/profile', heading: 'Profile', shell: true },
  { path: '/sign-in', heading: 'Sign in', shell: false },
  { path: '/sign-up', heading: 'Create an account', shell: false },
  { path: '/privacy', heading: 'Privacy', shell: false },
  { path: '/terms', heading: 'Terms', shell: false },
  { path: '/styleguide', heading: 'Style guide', shell: false },
  { path: '/does-not-exist', heading: 'Page not found', shell: false },
]

function collectConsoleProblems(page: Page): string[] {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning')
      problems.push(`${msg.type()}: ${msg.text()}`)
  })
  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  return problems
}

for (const { path, heading, shell } of SCREENS) {
  test(`${path} renders`, async ({ page }, testInfo) => {
    const problems = collectConsoleProblems(page)
    await page.goto(path)

    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()

    // No horizontal scrolling at this width.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)

    const isPhone = testInfo.project.name === 'phone-375'
    const bottomNav = page.getByTestId('bottom-nav')
    const sidebar = page.getByTestId('sidebar')
    if (!shell) {
      await expect(bottomNav).toHaveCount(0)
      await expect(sidebar).toHaveCount(0)
    } else if (isPhone) {
      await expect(bottomNav).toBeVisible()
      await expect(sidebar).toBeHidden()
    } else {
      await expect(sidebar).toBeVisible()
      await expect(bottomNav).toBeHidden()
    }

    expect(problems).toEqual([])
  })
}

test('nav moves between the four app screens', async ({ page }, testInfo) => {
  await page.goto('/today')
  const nav = page.getByTestId(testInfo.project.name === 'phone-375' ? 'bottom-nav' : 'sidebar')
  for (const name of ['Week', 'Focus', 'Insights', 'Today']) {
    await nav.getByRole('link', { name }).click()
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
    await expect(nav.getByRole('link', { name })).toHaveAttribute('aria-current', 'page')
  }
})

test('bottom nav does not cover the end of the page on phones', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-375', 'phone only')
  await page.goto('/today')
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  const nav = await page.getByTestId('bottom-nav').boundingBox()
  const lastCard = await page.locator('main > div > *').last().boundingBox()
  if (!nav || !lastCard) throw new Error('bottom nav or last card not rendered')
  expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(nav.y)
})
