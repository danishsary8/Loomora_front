import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

test('guest adds and completes subtasks, with progress, persistence and accessible controls', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-375', 'Mobile viewport scenario')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/today')
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  const sheet = page.getByRole('dialog')
  await sheet.getByLabel('Title').fill('Read chapter 3')
  await sheet.getByLabel('Priority').selectOption('high')
  await sheet.getByLabel('Notes', { exact: true }).fill('Use the library copy.')
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()

  for (const title of ['Find the book', 'Take notes']) {
    await page.getByRole('button', { name: /Add subtask to/ }).click()
    await expect(sheet.getByLabel('Title')).toBeFocused()
    await sheet.getByLabel('Title').fill(title)
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(sheet).toBeHidden()
  }

  const first = page.getByRole('checkbox', { name: /Find the book/ })
  const second = page.getByRole('checkbox', { name: /Take notes/ })
  const parent = page.getByRole('checkbox', { name: /Read chapter 3/ })
  await expect(page.getByRole('button', { name: /Delete.*Take notes/ })).toBeVisible()
  await first.focus()
  await page.keyboard.press('Space')
  await expect(first).toBeChecked()
  await expect(page.getByText('1/2', { exact: true })).toBeVisible()
  await expect(second).not.toBeChecked()
  await parent.focus()
  await page.keyboard.press('Space')
  await expect(second).toBeChecked()
  await expect(page.getByText('2/2', { exact: true })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<number>((resolve, reject) => {
            const open = indexedDB.open('loomora-guest')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const request = open.result.transaction('todos').objectStore('todos').getAll()
              request.onerror = () => reject(request.error)
              request.onsuccess = () => {
                open.result.close()
                resolve(request.result.filter((todo) => todo.done_at).length)
              }
            }
          }),
      ),
    )
    .toBe(3)
  await page.getByRole('button', { name: 'Not now' }).click()
  await page.reload()
  await expect(parent).toBeChecked()
  await expect(first).toBeChecked()
  await expect(second).toBeChecked()
  await expect(page.getByText('Use the library copy.')).toBeVisible()
  await expect(page.getByText('High', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Edit.*Read chapter 3/ }).click()
  await expect(sheet.getByLabel('Notes', { exact: true })).toHaveValue('Use the library copy.')
  const notes = sheet.getByLabel('Notes', { exact: true })
  await notes.fill('x'.repeat(2001))
  await expect(notes).toHaveAttribute('aria-invalid', 'true')
  await expect(notes).toHaveAccessibleDescription('Notes can be up to 2000 characters.')
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').withTags(WCAG_TAGS).analyze())
      .violations,
  ).toEqual([])
  await notes.clear()
  await sheet.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByText('Use the library copy.')).toHaveCount(0)
  await page.getByRole('button', { name: /Delete.*Take notes/ }).click()
  await expect(second).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(second).toBeChecked()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  expect((await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze()).violations).toEqual([])
  expect(errors).toEqual([])
})
