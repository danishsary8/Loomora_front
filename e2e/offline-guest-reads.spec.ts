import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

function savedTodos(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ id: string; title: string; done_at: string | null }[]>((resolve, reject) => {
        const open = indexedDB.open('loomora-guest')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const read = db.transaction('todos').objectStore('todos').getAll()
          read.onerror = () => reject(read.error)
          read.onsuccess = () => {
            db.close()
            resolve(read.result as { id: string; title: string; done_at: string | null }[])
          }
        }
      }),
  )
}

test('guest streak and save-plan summary load offline across cold reloads and reconnect at 375 px', async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-375', 'Mobile viewport scenario')

  const problems: string[] = []
  page.on('pageerror', (error) => problems.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text())
  })

  await page.goto('/today')
  await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)

  await context.setOffline(true)
  await expect(page.getByText(/You are offline/)).toBeVisible()

  // Add and check off 3 guest to-dos completely offline.
  for (const title of ['First offline task', 'Second offline task', 'Third offline task']) {
    await page.getByRole('button', { name: 'Add a to-do' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add a to-do' })
    await sheet.getByLabel('Title').fill(title)
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(sheet).toBeHidden()
    await page.getByText(title).click()
    await expect(page.getByRole('checkbox', { name: `Mark “${title}” done` })).toBeChecked()
  }

  const saveDialog = page.getByRole('dialog', { name: 'Save your plan' })
  await expect(saveDialog).toBeVisible()
  await saveDialog.getByRole('button', { name: 'Not now' }).click()
  await expect(saveDialog).toBeHidden()

  const streakBadge = page.getByLabel('Streak: 1 day. Today counted.')
  await expect(streakBadge).toBeVisible()

  const saved = await savedTodos(page)
  expect(saved).toHaveLength(3)
  expect(saved.every((row) => row.done_at !== null)).toBe(true)

  // Clear Save your plan dismissal and reload offline with a cold TanStack Query cache.
  await page.evaluate(() => localStorage.removeItem('loomora.savePlanDismissedOn'))
  await page.reload()
  await expect(page.getByText(/You are offline/)).toBeVisible()
  await expect(saveDialog).toBeVisible()
  await saveDialog.getByRole('button', { name: 'Not now' }).click()
  await expect(saveDialog).toBeHidden()
  await expect(streakBadge).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= 375)).toBe(true)

  // Cold-cache offline load on Profile shows guest streak and local-only plan card.
  await page.goto('/profile')
  await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible()
  await expect(page.getByText(/You are offline/)).toBeVisible()
  await expect(page.getByText('1 day')).toBeVisible()
  await expect(page.getByText('Today counted.')).toBeVisible()
  await expect(page.getByText('Data lives on this device only.')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= 375)).toBe(true)

  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations).toEqual([])

  // Reconnect: data persists with original IDs and no duplicates.
  await context.setOffline(false)
  await expect(page.getByText(/You are offline/)).toBeHidden()
  await expect(page.getByText('1 day')).toBeVisible()
  expect(await savedTodos(page)).toEqual(saved)
  expect(problems).toEqual([])
})
