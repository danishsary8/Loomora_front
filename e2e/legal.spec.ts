import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('legal links navigate from landing, sign-in, and sign-up and pass 375 px accessibility checks', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone-375', 'Mobile viewport scenario')
  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      problems.push(`${message.type()}: ${message.text()}`)
    }
  })

  for (const entry of ['/', '/sign-in', '/sign-up']) {
    await page.goto(entry)
    const footer = page.getByRole('contentinfo')
    await expect(footer.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy')
    await expect(footer.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  }

  // Navigate via keyboard from landing footer to Privacy, then to Terms.
  await page.goto('/')
  const privacyLink = page.getByRole('contentinfo').getByRole('link', { name: 'Privacy' })
  await privacyLink.focus()
  await expect(privacyLink).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1, name: 'Privacy' })).toBeVisible()
  const privacyMain = await page.getByRole('main').innerText()
  expect(privacyMain).toMatch(/IndexedDB/i)
  expect(privacyMain).toMatch(/PostgreSQL/i)
  expect(privacyMain).toMatch(/Google-only/i)
  expect(privacyMain).toMatch(/current streak/i)
  expect(privacyMain).not.toMatch(/Accounts are not available yet/i)
  expect(privacyMain).not.toMatch(/does not send it to us/i)
  expect(privacyMain).not.toMatch(/sell your data/i)
  expect(privacyMain).not.toMatch(/analytics scripts/i)
  expect(privacyMain).not.toMatch(/streak history/i)

  const privacyHeadings = await page
    .locator('main h1, main h2, main h3')
    .evaluateAll((els) => els.map((el) => el.tagName))
  expect(privacyHeadings[0]).toBe('H1')
  expect(privacyHeadings.slice(1).every((tag) => tag === 'H2')).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  const privacyAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(privacyAxe.violations).toEqual([])

  const termsLink = page.getByRole('contentinfo').getByRole('link', { name: 'Terms' })
  await termsLink.focus()
  await expect(termsLink).toBeFocused()
  await page.keyboard.press('Enter')

  await expect(page.getByRole('heading', { level: 1, name: 'Terms' })).toBeVisible()
  const termsMain = await page.getByRole('main').innerText()
  expect(termsMain).toMatch(/Guest mode/i)
  expect(termsMain).toMatch(/Account mode/i)
  expect(termsMain).toMatch(/Google-only/i)
  expect(termsMain).not.toMatch(/Your plan is saved on your device only/i)

  const termsHeadings = await page
    .locator('main h1, main h2, main h3')
    .evaluateAll((els) => els.map((el) => el.tagName))
  expect(termsHeadings[0]).toBe('H1')
  expect(termsHeadings.slice(1).every((tag) => tag === 'H2')).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375)

  const termsAxe = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(termsAxe.violations).toEqual([])
  expect(problems).toEqual([])
})

test.describe('S13 Elemental legal and recovery pages', () => {
  const WIDTHS = [320, 375, 390, 768, 1024, 1440] as const
  const PAGES = [
    { path: '/privacy', heading: 'Privacy' },
    { path: '/terms', heading: 'Terms' },
    { path: '/missing-page', heading: 'Page not found' },
  ] as const

  test.skip(
    ({ browserName, viewport }) => browserName !== 'chromium' || viewport?.width !== 375,
    'Viewport sweep runs once on phone-375',
  )

  async function horizontalOverflow(page: Page): Promise<number> {
    return page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
  }

  async function tabUntilFocused(page: Page, target: Locator) {
    for (
      let i = 0;
      i < 25 && !(await target.evaluate((el) => el === document.activeElement));
      i++
    ) {
      await page.keyboard.press('Tab')
    }
    await expect(target).toBeFocused()
  }

  test('contents links jump to their section from the keyboard, and Back to Loomora goes home', async ({
    page,
  }) => {
    await page.goto('/privacy')
    const contents = page.getByRole('navigation', { name: 'On this page' })
    const lastLink = contents.getByRole('link').last()
    const lastTitle = (await lastLink.textContent()) ?? ''
    await tabUntilFocused(page, lastLink)
    expect(await lastLink.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid')
    await page.keyboard.press('Enter')

    await expect(page).toHaveURL(/\/privacy#privacy-s7$/)
    const section = page.getByRole('region', { name: lastTitle })
    await expect(section.getByRole('heading', { level: 2, name: lastTitle })).toBeInViewport()
    await expect(section).toBeFocused()

    await page.getByRole('link', { name: 'Back to Loomora' }).click()
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Loomora' })).toBeVisible()
  })

  test('legal text keeps a readable measure and the contents column stays beside it on desktop', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/terms')
    const firstSection = page.getByRole('region').first()
    // Real measure of the longest paragraph: its characters divided by its rendered line count.
    const charsPerLine = await page.locator('main section p').evaluateAll((paragraphs) => {
      const longest = paragraphs.reduce((a, b) =>
        (b.textContent ?? '').length > (a.textContent ?? '').length ? b : a,
      )
      const lineHeight = parseFloat(getComputedStyle(longest).lineHeight)
      const lines = Math.round(longest.getBoundingClientRect().height / lineHeight)
      return (longest.textContent ?? '').length / lines
    })
    expect(charsPerLine).toBeGreaterThanOrEqual(55)
    expect(charsPerLine).toBeLessThanOrEqual(75)

    const contents = await page.getByRole('navigation', { name: 'On this page' }).boundingBox()
    const article = await firstSection.boundingBox()
    expect((contents?.x ?? 0) + (contents?.width ?? 0)).toBeLessThan(article?.x ?? 0)
  })

  test('S13 pages pass axe and keep every link at least 44 px tall', async ({ page }) => {
    for (const { path, heading } of PAGES) {
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
      const results = await new AxeBuilder({ page }).analyze()
      expect(results.violations, path).toEqual([])
      const links = page.getByRole('main').getByRole('link')
      for (const link of await links.all()) {
        expect((await link.boundingBox())?.height ?? 0, path).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('S13 pages have no horizontal overflow at 320–1440 px, at 100% and 200% text', async ({
    page,
  }) => {
    for (const { path, heading } of PAGES) {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 })
        await page.goto(path)
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible()
        expect(await horizontalOverflow(page), `${path} ${width} px`).toBeLessThanOrEqual(0)
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%'
        })
        expect(await horizontalOverflow(page), `${path} ${width} px 200%`).toBeLessThanOrEqual(0)
      }
    }
  })

  test('not found offers Go to Today and Back to Loomora from the keyboard', async ({ page }) => {
    await page.goto('/missing/deep/link')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await expect(page.getByText('Error 404')).toBeVisible()

    await tabUntilFocused(page, page.getByRole('link', { name: 'Go to Today' }))
    await page.keyboard.press('Tab')
    await expect(page.getByRole('link', { name: 'Back to Loomora' })).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/$/)

    await page.goto('/missing-page')
    await page.getByRole('link', { name: 'Go to Today' }).click()
    await expect(page).toHaveURL(/\/today$/)
    await expect(page.getByRole('button', { name: 'Add a to-do' })).toBeVisible()
  })

  test.describe('router error', () => {
    test.use({ serviceWorkers: 'block' })

    test('a failed screen load shows the recovery page, and Try again reloads it', async ({
      page,
    }) => {
      const chunk = /\/assets\/ProfilePage-[^/]+\.js$/
      await page.route(chunk, (route) => route.abort('internetdisconnected'))
      await page.goto('/profile')

      await expect(
        page.getByRole('heading', { level: 1, name: 'This page could not load' }),
      ).toBeVisible()
      await expect(page.getByRole('alert')).toHaveText('Something went wrong. Please try again.')
      await expect(page.getByRole('link', { name: 'Go to Today' })).toHaveAttribute(
        'href',
        '/today',
      )
      const footer = page.getByRole('contentinfo')
      await expect(footer.getByRole('link', { name: 'Privacy' })).toBeVisible()
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])

      for (const width of [320, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        await page.evaluate(() => {
          document.documentElement.style.fontSize = '200%'
        })
        expect(await horizontalOverflow(page), `${width} px 200%`).toBeLessThanOrEqual(0)
      }

      await page.unroute(chunk)
      const tryAgain = page.getByRole('button', { name: 'Try again' })
      await tabUntilFocused(page, tryAgain)
      await page.keyboard.press('Enter')
      await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()
    })
  })
})
