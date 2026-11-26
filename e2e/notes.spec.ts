import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'UTC' })

test('creates, edits, filters, deletes, and restores guest notes offline with zero overflow', async ({
  page,
  context,
}) => {
  await page.goto('/today')
  await page.getByRole('link', { name: 'Notes' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Notes' })).toBeVisible()
  await expect(page.getByText('No notes yet')).toBeVisible()

  // Create a note while offline (guest Dexie storage).
  await context.setOffline(true)
  await page.getByRole('button', { name: 'New note' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'New note' })
  await dialog.getByLabel('Title (optional)').fill('Study plan')
  await dialog.getByLabel('Note (optional)').fill('Review algebra notes before Friday.')
  await dialog.getByRole('button', { name: 'Save note' }).click()

  await expect(dialog).toBeHidden()
  await expect(page.getByText('Study plan')).toBeVisible()
  await expect(page.getByText('Review algebra notes before Friday.')).toBeVisible()

  // Delete and Undo.
  await page.getByRole('button', { name: 'Delete note Study plan' }).click()
  const confirm = page.getByRole('dialog', { name: 'Delete this note?' })
  await confirm.getByRole('button', { name: 'Delete note' }).click()
  await expect(page.getByText('Study plan')).toBeHidden()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('Study plan')).toBeVisible()
  await context.setOffline(false)

  // Axe accessibility check.
  const axe = await new AxeBuilder({ page }).analyze()
  expect(axe.violations).toEqual([])

  // Responsive overflow sweep at 320, 375, 768, 1440 px and 200% text at 320 px.
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 812 })
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow, `overflow at ${width}px`).toBe(0)
  }
  await page.setViewportSize({ width: 320, height: 812 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
  })
  const overflow200 = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow200, 'overflow at 320px 200% text').toBe(0)
})
