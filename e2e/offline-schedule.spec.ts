import { expect, test, type Page } from '@playwright/test'

function savedSchedule(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ id: string; title: string; days: number[] }[]>((resolve, reject) => {
        const open = indexedDB.open('loomora-guest')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const read = db.transaction('schedule_items').objectStore('schedule_items').getAll()
          read.onerror = () => reject(read.error)
          read.onsuccess = () => resolve(read.result)
          db.close()
        }
      }),
  )
}

test('a guest weekly item survives an offline reload and reconnect with the same ID', async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-375', 'Mobile viewport scenario')
  const title = 'Offline weekly study'

  await page.goto('/week')
  await expect(page.getByText('Build your week')).toBeVisible()
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true)
  await context.setOffline(true)
  await expect(page.getByText(/You are offline/)).toBeVisible()

  await page.getByRole('button', { name: 'Add to my schedule' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add to my schedule' })
  await sheet.getByLabel('Title').fill(title)
  await sheet.getByRole('button', { name: 'Monday', exact: true }).click()
  await sheet.getByRole('button', { name: 'Wednesday', exact: true }).click()
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()

  const saved = await savedSchedule(page)
  expect(saved).toMatchObject([{ id: expect.any(String), title, days: [0, 2] }])
  const strip = page.getByRole('group', { name: 'Days of the week' })
  const monday = page.getByRole('region', { name: 'Monday', exact: true }).getByText(title)
  const wednesday = page.getByRole('region', { name: 'Wednesday', exact: true }).getByText(title)
  await strip.getByRole('button', { name: 'Monday', exact: true }).click()
  await expect(monday).toBeVisible()

  await page.reload()
  await expect(page.getByText(/You are offline/)).toBeVisible()
  await strip.getByRole('button', { name: 'Wednesday', exact: true }).click()
  await expect(wednesday).toBeVisible()
  expect(await savedSchedule(page)).toEqual(saved)

  await context.setOffline(false)
  await expect(page.getByText(/You are offline/)).toBeHidden()
  await expect(wednesday).toHaveCount(1)
  expect(await savedSchedule(page)).toEqual(saved)
})
