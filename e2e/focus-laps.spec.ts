import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })
// Seeding and laying out 1,000 laps takes longer than the default timeout on slow runners.
test.slow()

const limit = 'Lap limit reached. A session can record up to 1,000 laps.'

function readGuestTimer(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ laps: number[] } | undefined>((resolve, reject) => {
        const open = indexedDB.open('loomora-guest')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const request = db.transaction('focus_timers').objectStore('focus_timers').get('guest')
          request.onsuccess = () => {
            db.close()
            resolve(request.result)
          }
          request.onerror = () => reject(request.error)
        }
      }),
  )
}

/** Start a stopwatch, then give its paused snapshot 998 laps so the limit is two laps away. */
async function openStopwatchWith998Laps(page: Page) {
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Stopwatch', exact: true }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  const pause = page.getByRole('button', { name: 'Pause' })
  await expect(pause).toHaveAttribute('aria-disabled', 'false')
  await pause.click()
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('loomora-guest')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('focus_timers', 'readwrite')
          const store = tx.objectStore('focus_timers')
          const request = store.get('guest')
          request.onsuccess = () => {
            const timer = request.result
            timer.laps = Array.from({ length: 998 }, (_, index) => index + 1)
            timer.phase.timing.accumulatedMs = 60_000
            timer.revision += 1
            store.put(timer)
          }
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onabort = () => reject(tx.error)
        }
      }),
  )
  await page.reload()
  await expect(page.getByText('Lap 998', { exact: true })).toBeVisible()
  const resume = page.getByRole('button', { name: 'Resume' })
  await expect(resume).toHaveAttribute('aria-disabled', 'false')
  await resume.click()
}

test('announces laps 999 and 1000, then disables Lap with an explanation by keyboard', async ({
  page,
}) => {
  await openStopwatchWith998Laps(page)
  const form = page.locator('#main form')
  const status = form.getByRole('status')
  const lap = page.getByRole('button', { name: 'Lap', exact: true })
  await expect(lap).toHaveAttribute('aria-disabled', 'false')
  await expect(status).not.toContainText('recorded')

  await lap.focus()
  await page.keyboard.press('Enter')
  await expect(status).toContainText(/Lap 999 recorded, split \d{2}:\d{2}\.\d{2}\./)
  await expect(status).not.toContainText('limit')
  await expect(lap).toHaveAttribute('aria-disabled', 'false')
  await page.keyboard.press('Enter')
  await expect(status).toContainText('Lap 1000 recorded')
  await expect(status).toContainText(limit)
  await expect(status).not.toContainText('Lap 999 recorded')

  await expect(lap).toHaveAttribute('aria-disabled', 'true')
  await expect(lap).toHaveAccessibleDescription(limit)
  await expect(page.getByText(limit, { exact: true })).toBeVisible()
  await expect(lap).toBeFocused()
  expect(await lap.evaluate((element) => element.matches(':focus-visible'))).toBe(true)
  expect(await lap.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none')

  await page.keyboard.press('Enter')
  await lap.click({ force: true })
  await expect(page.getByText('Lap 1000', { exact: true })).toBeVisible()
  await expect(page.getByText('Lap 1001', { exact: true })).toHaveCount(0)
  expect((await readGuestTimer(page))?.laps).toHaveLength(1000)
  expect((await new AxeBuilder({ page }).include('#main').analyze()).violations).toEqual([])

  await page.getByRole('button', { name: 'Pause' }).click()
  await page.reload()
  await expect(page.getByText('Session restored.')).toBeVisible()
  await expect(status).not.toContainText('recorded')
  await expect(lap).toHaveAttribute('aria-disabled', 'true')
  await expect(lap).toHaveAccessibleDescription(limit)
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(lap).toHaveAttribute('aria-disabled', 'true')

  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeFocused()
  await expect(page.getByText(limit, { exact: true })).toHaveCount(0)
})

test('expanded Focus keeps the lap limit explanation without overflow at 320–1440 px', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      value: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')),
    })
  })
  await openStopwatchWith998Laps(page)
  const lap = page.getByRole('button', { name: 'Lap', exact: true })
  await expect(lap).toHaveAttribute('aria-disabled', 'false')
  await lap.click()
  await expect(page.getByText('Lap 999', { exact: true })).toBeVisible()
  await expect(lap).toHaveAttribute('aria-disabled', 'false')

  await page.getByRole('button', { name: 'Expand timer' }).click()
  const dialog = page.getByRole('dialog', { name: 'Focus timer' })
  const expandedLap = dialog.getByRole('button', { name: 'Lap', exact: true })
  await expect(expandedLap).toHaveAttribute('aria-disabled', 'false')
  await expandedLap.click()
  await expect(dialog.getByRole('status')).toContainText('Lap 1000 recorded')
  await expect(expandedLap).toHaveAttribute('aria-disabled', 'true')
  await expect(expandedLap).toHaveAccessibleDescription(limit)
  await expect(dialog.getByText(limit, { exact: true })).toBeVisible()
  await expandedLap.click({ force: true })
  expect((await readGuestTimer(page))?.laps).toHaveLength(1000)
  expect((await new AxeBuilder({ page }).include('dialog').analyze()).violations).toEqual([])

  for (const scale of [100, 200]) {
    await page.evaluate((value) => {
      document.documentElement.style.fontSize = value + '%'
    }, scale)
    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 812 })
      const overflow = await dialog.evaluate((element) => ({
        page: document.documentElement.scrollWidth - innerWidth,
        dialog: element.scrollWidth - element.clientWidth,
      }))
      expect(overflow, `expanded ${width}px at ${scale}% text size`).toEqual({
        page: 0,
        dialog: 0,
      })
    }
  }

  await dialog.getByRole('button', { name: 'Exit expanded view' }).click()
  await expect(page.getByRole('button', { name: 'Expand timer' })).toBeFocused()
  const note = page.getByText(limit, { exact: true })
  for (const scale of [100, 200]) {
    await page.evaluate((value) => {
      document.documentElement.style.fontSize = value + '%'
    }, scale)
    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 812 })
      await expect(note).toBeVisible()
      const overflow = await note.evaluate((element) => ({
        page: document.documentElement.scrollWidth - innerWidth,
        note: element.scrollWidth - element.clientWidth,
      }))
      expect(overflow, `normal ${width}px at ${scale}% text size`).toEqual({ page: 0, note: 0 })
    }
  }
})
