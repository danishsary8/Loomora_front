import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'UTC' })

test('renders guest Insights, Weekly Recap, and Plan vs Reality offline and across widths', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date('2026-11-26T09:00:00Z') })

  // Create and complete a to-do on Today.
  await page.goto('/today')
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  await page.getByLabel('Title').fill('Write summary')
  await page.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeHidden()
  await page
    .getByRole('checkbox', { name: /Write summary/ })
    .locator('..')
    .click()
  await expect(page.getByRole('checkbox', { name: /Write summary/ })).toBeChecked()

  // Complete a Focus session on Focus.
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.clock.fastForward(60_000)
  await page.getByRole('button', { name: 'End early' }).click()
  await expect(
    page.getByRole('region', { name: 'Focus history' }).getByRole('listitem'),
  ).toBeVisible()

  // Visit Insights, then go offline and verify guest Dexie queries keep working.
  await page.getByRole('link', { name: 'Insights' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Weekly recap' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Plan vs reality' })).toBeVisible()
  await expect(page.getByText('1 done / 1 due')).toBeVisible()
  await expect(page.getByText('Unplanned focus: 1 min')).toBeVisible()

  await context.setOffline(true)
  await page.getByRole('button', { name: 'Previous week' }).click()
  await expect(page.getByText('No activity in this range yet')).toBeVisible()
  await page.getByRole('button', { name: 'Next week' }).click()
  await expect(page.getByRole('heading', { name: 'Weekly recap' })).toBeVisible()
  await page.getByRole('button', { name: '7 days' }).click()
  await expect(page.getByText('1 done / 1 due')).toBeVisible()
  const history = page.getByRole('region', { name: 'Streak history' })
  await expect(history.getByText('Before this range')).toBeVisible()
  await expect(history.getByText('At least 1 day')).toBeVisible()
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
