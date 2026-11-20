import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

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
