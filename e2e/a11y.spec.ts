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
  '/forgot-password',
  '/reset-password',
  '/verify-email',
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

test('populated Today, Week, DaySheet, and 320px CopyDaySheet pass axe, overflow, and focus checks', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-375', 'Mobile accessibility and 320px sheet check')

  await page.setViewportSize({ width: 320, height: 640 })
  await page.goto('/today')

  // Opening and submitting the first to-do unmounts TodayEmpty: focus must land in #main, not body.
  const emptyAdd = page.getByRole('button', { name: 'Add a to-do' })
  await emptyAdd.click()
  const addDialog = page.getByRole('dialog', { name: 'Add a to-do' })
  await expect(addDialog).toBeVisible()
  await addDialog.getByLabel('Title').focus()
  await page.keyboard.press('Shift+Tab')
  expect(
    await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]'))),
  ).toBe(true)
  await addDialog.getByLabel('Title').fill('Check mobile accessibility')
  await addDialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(addDialog).toBeHidden()
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('main')

  // Escape restores focus to the connected trigger button.
  const fab = page.getByRole('button', { name: 'Add a to-do' })
  await fab.click()
  await expect(addDialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(addDialog).toBeHidden()
  await expect(fab).toBeFocused()

  // Populate Week, inspect populated Week + 320px CopyDaySheet overflow and axe.
  await page.goto('/week')
  await page.getByRole('button', { name: 'Add to my schedule' }).click()
  const schedDialog = page.getByRole('dialog', { name: 'Add to my schedule' })
  await schedDialog.getByLabel('Title').fill('Deep work')
  for (const day of [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]) {
    await schedDialog.getByRole('button', { name: day, exact: true }).click()
  }
  await schedDialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(schedDialog).toBeHidden()

  const weekViolations = (await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations
  expect(weekViolations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual(
    [],
  )

  await page
    .getByRole('button', { name: /Copy .* to/ })
    .first()
    .click()
  const copyDialog = page.getByRole('dialog')
  await expect(copyDialog).toBeVisible()
  const copyOverflow = await copyDialog.evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(copyOverflow).toBeLessThanOrEqual(0)
  await page.keyboard.press('Escape')
  await expect(copyDialog).toBeHidden()

  // Return to Today with Now/Next strip + TodoRow and check axe + DaySheet.
  await page.goto('/today')
  await expect(page.getByText('Check mobile accessibility')).toBeVisible()
  const todayViolations = (await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations
  expect(
    todayViolations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`),
  ).toEqual([])

  await page.getByRole('button', { name: /Open today/i }).click()
  const dayDialog = page.getByRole('dialog', { name: 'Today’s schedule' })
  await expect(dayDialog).toBeVisible()
  const dayViolations = (await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations
  expect(dayViolations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(' | ')}`)).toEqual(
    [],
  )
})

test('Today and AddTodoSheet have zero horizontal overflow at 375px and 200% text scaling', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/today')
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '32px'
  })

  const docOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

  expect(await docOverflow()).toBeLessThanOrEqual(0)

  await page.getByRole('button', { name: 'Add a to-do' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a to-do' })
  await expect(dialog).toBeVisible()
  expect(await docOverflow()).toBeLessThanOrEqual(0)
  expect(await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0)

  await dialog.getByRole('button', { name: 'More options' }).click()
  await expect(dialog.getByLabel('Notes')).toBeVisible()
  expect(await docOverflow()).toBeLessThanOrEqual(0)
  expect(await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0)

  // Trigger validation errors (empty title) and verify no overflow.
  await dialog.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(dialog.getByText('Please enter a title.')).toBeVisible()
  expect(await docOverflow()).toBeLessThanOrEqual(0)
  expect(await dialog.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0)
})
