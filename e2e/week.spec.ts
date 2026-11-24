import AxeBuilder from '@axe-core/playwright'
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

// UX-008: at 768 px the sidebar leaves too little room for 7 columns, so the columns keep a
// readable width and scroll inside their own box; at 1440 px all 7 fit without scrolling.
test('768 px week columns scroll in their own box with long titles; 1440 px fits all seven', async ({
  page,
}) => {
  const longTitle = 'Interdisciplinary neuroscience seminar and laboratory supervision'
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.goto('/week')
  await page.getByRole('button', { name: 'Add to my schedule' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add to my schedule' })
  await sheet.getByLabel('Title').fill(longTitle)
  for (const name of [...WEEKDAYS, 'Saturday', 'Sunday']) {
    await sheet.getByRole('button', { name, exact: true }).click()
  }
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()

  const pageOverflow = () =>
    page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  const columns = page.getByRole('region', { name: /^Week schedule/ })
  await expect(columns).toBeVisible()
  expect(await pageOverflow()).toBeLessThanOrEqual(0)
  expect(await columns.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true)
  const violations = (
    await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze()
  ).violations
  expect(violations.map((v) => v.id)).toEqual([])

  for (const name of [...WEEKDAYS, 'Saturday', 'Sunday']) {
    const day = page.getByRole('region', { name, exact: true })
    expect((await day.boundingBox())?.width ?? 0).toBeGreaterThanOrEqual(128)
    const title = day.getByText(longTitle)
    expect(await title.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
  }

  // Keyboard: the scroller is focusable, and tabbing to Sunday's Copy brings it into view.
  await columns.focus()
  await expect(columns).toBeFocused()
  const sundayCopy = page.getByRole('button', { name: 'Copy Sunday to…' })
  // Saturday's Copy, then Sunday's card, then Sunday's Copy.
  await page.getByRole('button', { name: 'Copy Saturday to…' }).focus()
  await page.keyboard.press('Tab')
  await expect(
    page.getByRole('region', { name: 'Sunday' }).getByRole('button', { name: /^Edit / }),
  ).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(sundayCopy).toBeFocused()
  await expect(sundayCopy).toBeInViewport({ ratio: 1 })
  const [box, frame] = await Promise.all([sundayCopy.boundingBox(), columns.boundingBox()])
  if (!box || !frame) throw new Error('Week columns not rendered')
  expect(box.x).toBeGreaterThanOrEqual(frame.x)
  expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Copy Sunday to…' })).toBeVisible()
  await page.keyboard.press('Escape')
  expect(await pageOverflow()).toBeLessThanOrEqual(0)

  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('region', { name: /^Week schedule/ })).toHaveCount(0)
  expect(await pageOverflow()).toBeLessThanOrEqual(0)
})
