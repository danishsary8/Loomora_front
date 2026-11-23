import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
const TOMORROW = '2026-11-20'

function storedOccurrences(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ nextDue: string | null; count: number }>((resolve, reject) => {
        const open = indexedDB.open('loomora-guest')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const database = open.result
          const request = database.transaction('todos').objectStore('todos').getAll()
          request.onerror = () => reject(request.error)
          request.onsuccess = () => {
            const rows = request.result.filter((row) => row.title === 'Daily reading')
            const parent = rows.find((row) => row.done_at)
            const next = rows.find((row) => row.id === parent?.next_todo_id)
            database.close()
            resolve({ nextDue: next?.due_date ?? null, count: rows.length })
          }
        }
      }),
  )
}

test.use({ timezoneId: 'Asia/Phnom_Penh', reducedMotion: 'reduce' })

test('daily repeat creates tomorrow once and persists on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-375', 'Mobile viewport scenario')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.clock.setFixedTime(new Date('2026-11-18T17:01:00Z'))
  await page.goto('/today')
  const add = page.getByRole('button', { name: 'Add a to-do' })
  await add.focus()
  await page.keyboard.press('Enter')
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByLabel('Title')).toBeFocused()
  await page.keyboard.type('Daily reading')
  const due = sheet.getByLabel('Due date (optional)')
  await expect(due).toHaveValue('2026-11-19')
  await sheet.getByRole('button', { name: 'More options' }).click()
  const repeat = sheet.getByRole('combobox', { name: 'Repeat' })
  await expect(repeat).toHaveValue('none')
  await repeat.focus()
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('ArrowDown')
  await expect(repeat).toHaveValue('weekly')
  await page.keyboard.press('Tab')
  const monday = sheet.getByRole('button', { name: 'Monday' })
  await expect(monday).toBeFocused()
  await page.keyboard.press('Space')
  await expect(monday).toHaveAttribute('aria-pressed', 'true')
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').withTags(WCAG_TAGS).analyze())
      .violations,
  ).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  await repeat.focus()
  await page.keyboard.press('ArrowUp')
  await expect(repeat).toHaveValue('daily')
  await sheet.getByRole('button', { name: 'Add', exact: true }).press('Enter')
  await expect(sheet).toBeHidden()
  await expect(page.getByText('Repeats daily')).toBeVisible()
  const parent = page.getByRole('checkbox', { name: /Daily reading/ })
  await parent.press('Space')
  await expect(parent).toBeChecked()
  await expect.poll(() => storedOccurrences(page)).toEqual({ nextDue: TOMORROW, count: 2 })
  await page.reload()
  await expect(parent).toBeChecked()
  await expect(parent).toHaveCount(1)
  await expect.poll(() => storedOccurrences(page)).toEqual({ nextDue: TOMORROW, count: 2 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([])
  expect(errors).toEqual([])
})
