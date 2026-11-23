import { expect, test, type Page } from '@playwright/test'

function savedTodos(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ id: string; title: string; notes: string; due_date: string }[]>(
        (resolve, reject) => {
          const open = indexedDB.open('loomora-guest')
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const db = open.result
            const read = db.transaction('todos').objectStore('todos').getAll()
            read.onerror = () => reject(read.error)
            read.onsuccess = () => resolve(read.result)
            db.close()
          }
        },
      ),
  )
}

test('guest save survives an offline reload and reconnect without duplicates', async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-375', 'Mobile viewport scenario')
  const title = 'Pack the charger'
  const notes = 'Put it in the front pocket.'

  await page.goto('/today')
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)
  await context.setOffline(true)
  await expect(page.getByText(/You are offline/)).toBeVisible()

  await page.getByRole('button', { name: 'Add a to-do' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add a to-do' })
  const date = await sheet.getByLabel('Due date (optional)').inputValue()
  await sheet.getByLabel('Title').fill(title)
  await sheet.getByRole('button', { name: 'More options' }).click()
  await sheet.getByLabel('Notes', { exact: true }).fill(notes)
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()

  const saved = await savedTodos(page)
  expect(saved).toMatchObject([{ id: expect.any(String), title, notes, due_date: date }])
  const row = page.getByRole('checkbox', { name: `Mark “${title}” done` })
  await expect(row).toBeVisible()

  await page.reload()
  await expect(page.getByText(/You are offline/)).toBeVisible()
  await expect(row).toBeVisible()
  await expect(page.getByText(notes, { exact: true })).toBeVisible()
  expect(await savedTodos(page)).toEqual(saved)

  await context.setOffline(false)
  await expect(page.getByText(/You are offline/)).toBeHidden()
  await expect(row).toHaveCount(1)
  expect(await savedTodos(page)).toEqual(saved)
})
