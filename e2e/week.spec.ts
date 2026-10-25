import { expect, test, type Page } from '@playwright/test'

// The day strip replaces the 7 columns below 768 px (tailwind md).
const isPhone = (page: Page) => (page.viewportSize()?.width ?? 0) < 768

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

// F-009 done-when: add an item for Mon to Fri, see it on each day (phone strip and desktop columns).
test('an item added for Monday to Friday shows on each of those days', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
  })
  page.on('pageerror', (err) => problems.push(err.message))

  await page.goto('/week')
  await expect(page.getByText('Build your week')).toBeVisible()
  await page.getByRole('button', { name: 'Add to my schedule' }).click()

  const sheet = page.getByRole('dialog', { name: 'Add to my schedule' })
  await sheet.getByLabel('Title').fill('Morning class')
  for (const name of WEEKDAYS) await sheet.getByRole('button', { name, exact: true }).click()
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()

  const strip = page.getByRole('group', { name: 'Days of the week' })
  const phone = isPhone(page)
  for (const name of WEEKDAYS) {
    if (phone) await strip.getByRole('button', { name, exact: true }).click()
    const column = page.getByRole('region', { name, exact: true })
    await expect(column.getByText('Morning class')).toBeVisible()
  }

  // Weekend stays free.
  if (phone) await strip.getByRole('button', { name: 'Saturday' }).click()
  await expect(
    page.getByRole('region', { name: 'Saturday' }).getByText('Nothing planned.'),
  ).toBeVisible()

  // Survives a reload (guest storage).
  await page.reload()
  await page.locator('section[aria-label="Monday"]').waitFor({ state: 'attached' })
  if (phone) await strip.getByRole('button', { name: 'Friday' }).click()
  await expect(
    page.getByRole('region', { name: 'Friday' }).getByText('Morning class'),
  ).toBeVisible()

  expect(problems).toEqual([])
})

test('Copy day to... copies Monday onto Saturday', async ({ page }) => {
  await page.goto('/week')
  await page.getByRole('button', { name: 'Add to my schedule' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add to my schedule' })
  await sheet.getByLabel('Title').fill('Study')
  await sheet.getByRole('button', { name: 'Monday', exact: true }).click()
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()

  const strip = page.getByRole('group', { name: 'Days of the week' })
  const phone = isPhone(page)
  if (phone) await strip.getByRole('button', { name: 'Monday', exact: true }).click()
  await page.getByRole('button', { name: 'Copy Monday to…' }).click()
  const copy = page.getByRole('dialog', { name: 'Copy Monday to…' })
  await copy.getByRole('button', { name: 'Saturday', exact: true }).click()
  await copy.getByRole('button', { name: 'Copy', exact: true }).click()
  await expect(copy).toBeHidden()

  if (phone) await strip.getByRole('button', { name: 'Saturday' }).click()
  await expect(page.getByRole('region', { name: 'Saturday' }).getByText('Study')).toBeVisible()
})

test('no horizontal scroll and the floating + clears the bottom nav', async ({
  page,
}, testInfo) => {
  await page.goto('/week')
  await page.getByRole('button', { name: 'Add to my schedule' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Title').fill('Run')
  await sheet.getByRole('button', { name: 'Monday', exact: true }).click()
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
  const fab = await page.getByRole('button', { name: 'Add to my schedule' }).boundingBox()
  if (!fab) throw new Error('floating + not rendered')
  if (testInfo.project.name === 'phone-375') {
    const nav = await page.getByTestId('bottom-nav').boundingBox()
    if (!nav) throw new Error('bottom nav not rendered')
    expect(fab.y + fab.height).toBeLessThanOrEqual(nav.y)
  }
})
