import { expect, test } from '@playwright/test'

// F-006 done-when: add a to-do, check it off, reload, it is still there (guest, IndexedDB).
test('guest adds a to-do, checks it off, and it survives a reload', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') problems.push(msg.text())
  })
  page.on('pageerror', (err) => problems.push(err.message))

  // First visit: landing → "Try it now" → empty Today, no signup (US-1.1).
  await page.goto('/')
  await page.getByRole('link', { name: 'Try it now' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add to my schedule' })).toBeEnabled()

  // Add (US-2.1): sheet opens with the title focused.
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add a to-do' })
  const title = sheet.getByLabel('Title')
  await expect(title).toBeFocused()
  await title.fill('Read chapter 3')
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()

  const checkbox = page.getByRole('checkbox', { name: 'Mark “Read chapter 3” done' })
  await expect(checkbox).not.toBeChecked()
  await expect(page.getByRole('progressbar', { name: '0 of 1 done' })).toBeVisible()

  // Check off (US-2.2): tap the row, stamp appears, ring updates.
  await page.getByText('Read chapter 3').click()
  await expect(checkbox).toBeChecked()
  await expect(page.getByText('Done!')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: '1 of 1 done' })).toBeVisible()

  // Reload: still there and still done (US-1.1 data stays on the device).
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Mark “Read chapter 3” done' })).toBeChecked()
  await expect(page.getByRole('progressbar', { name: '1 of 1 done' })).toBeVisible()

  // Un-check survives a reload too.
  await page.getByText('Read chapter 3').click()
  await page.reload()
  await expect(page.getByRole('checkbox', { name: 'Mark “Read chapter 3” done' })).not.toBeChecked()

  expect(problems).toEqual([])
})

test('the floating + adds more to-dos and sits clear of the bottom nav', async ({
  page,
}, testInfo) => {
  await page.goto('/today')
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  await page.getByRole('dialog').getByLabel('Title').fill('First')
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('First')).toBeVisible()

  const fab = page.getByRole('button', { name: 'Add a to-do' })
  await expect(fab).toBeVisible()
  const fabBox = await fab.boundingBox()
  if (!fabBox) throw new Error('floating + not rendered')
  expect(fabBox.width).toBeGreaterThanOrEqual(44)
  if (testInfo.project.name === 'phone-375') {
    const navBox = await page.getByTestId('bottom-nav').boundingBox()
    if (!navBox) throw new Error('bottom nav not rendered')
    expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(navBox.y)
  }

  await fab.click()
  await page.getByRole('dialog').getByLabel('Title').fill('Second')
  await page.keyboard.press('Enter')
  await expect(page.getByText('Second')).toBeVisible()
  await expect(page.getByRole('progressbar', { name: '0 of 2 done' })).toBeVisible()
})

test('the last row can scroll clear of the floating +', async ({ page }) => {
  await page.goto('/today')
  for (const title of ['One', 'Two', 'Three', 'Four', 'Five', 'Six']) {
    await page.getByRole('button', { name: 'Add a to-do' }).click()
    await page.getByRole('dialog').getByLabel('Title').fill(title)
    await page.keyboard.press('Enter')
    await expect(page.getByRole('dialog')).toBeHidden()
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  const lastRow = await page.getByTestId('todo-row').last().boundingBox()
  const fab = await page.getByRole('button', { name: 'Add a to-do' }).boundingBox()
  if (!lastRow || !fab) throw new Error('row or floating + not rendered')
  expect(lastRow.y + lastRow.height).toBeLessThanOrEqual(fab.y)
})
