import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const SCREENS = [
  '/',
  '/today',
  '/week',
  '/focus',
  '/insights',
  '/profile',
  '/sign-in',
  '/sign-up',
  '/privacy',
  '/terms',
  '/styleguide',
  '/does-not-exist',
]

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

for (const path of SCREENS) {
  test(`${path} has no axe violations`, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()
    expect(
      violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target).join(' | ')})`),
    ).toEqual([])
  })
}
