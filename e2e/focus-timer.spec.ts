import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { FocusSession, FocusSessionInput } from '../src/features/focus/types'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })

test('starts by keyboard, waits for the next phase, and resumes a paused break after reload', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Custom' }).click()
  await page.getByRole('spinbutton', { name: 'Duration in minutes' }).fill('1')
  const start = page.getByRole('button', { name: 'Start', exact: true })
  await start.focus()
  await start.press('Enter')
  await expect(page.getByRole('button', { name: 'Pause' })).toBeFocused()
  await page.clock.fastForward(61_000)
  await expect(page.getByText('Ready for the next phase.', { exact: false })).toBeVisible()
  const next = page.getByRole('button', { name: 'Start short break' })
  await page.clock.fastForward(10 * 60_000)
  await expect(next).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText('05:00')
  await next.click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Session restored.')).toBeVisible()
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeFocused()
  await page.getByRole('button', { name: 'End early' }).click()
  await expect(start).toBeFocused()
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<FocusSession[]>((resolve, reject) => {
            const open = indexedDB.open('loomora-guest')
            open.onerror = () => reject(open.error)
            open.onsuccess = () => {
              const db = open.result
              const request = db
                .transaction('focus_sessions')
                .objectStore('focus_sessions')
                .getAll()
              request.onerror = () => reject(request.error)
              request.onsuccess = () => {
                db.close()
                resolve(request.result)
              }
            }
          }),
      ),
    )
    .toMatchObject([{ end_reason: 'ended_early', focus_ms: 60_000 }])
})

test('fits the Elemental layout at six widths with normal and doubled text', async ({ page }) => {
  await page.goto('/focus')
  const start = page.getByRole('button', { name: 'Start', exact: true })
  await expect(start).toBeVisible()
  const results = await new AxeBuilder({ page }).include('#main').analyze()
  expect(results.violations).toEqual([])
  await page.getByRole('button', { name: 'Custom' }).click()

  async function checkWidths() {
    for (const scale of [100, 200]) {
      await page.evaluate((scale) => {
        document.documentElement.style.fontSize = scale + '%'
      }, scale)
      for (const width of [320, 375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 812 })
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - innerWidth,
        )
        expect(overflow, `${width}px at ${scale}% text size`).toBeLessThanOrEqual(0)
        const controls = page.locator('#main form :is(button, select, input)')
        const minimumSizes = await controls.evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect()
            return Math.min(box.width, box.height)
          }),
        )
        expect(
          Math.min(...minimumSizes),
          `Touch targets at ${width}px and ${scale}%`,
        ).toBeGreaterThanOrEqual(44)
        if (width >= 768 || scale !== 200) continue
        const primary = page.locator('#main button[type="submit"]')
        await page.evaluate(() => window.scrollTo(0, 0))
        await primary.focus()
        const box = await primary.boundingBox()
        const nav = await page.getByRole('navigation').filter({ visible: true }).boundingBox()
        if (!box || !nav)
          throw new Error('The primary control and mobile navigation must be visible')
        expect(box.y + box.height).toBeLessThanOrEqual(nav.y)
        await primary.blur()
      }
    }
  }

  await checkWidths()
  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await start.click()
  await page.getByRole('button', { name: 'Lap', exact: true }).click()
  await expect(page.getByText('Lap 1')).toBeVisible()
  await checkWidths()
})

test('keeps an offline account save with its owner and retries the original linked session', async ({
  page,
  context,
}, testInfo) => {
  const scheduleId = '2ff729f5-834e-41b5-917f-fbe9d825ddbe'
  const requests: FocusSessionInput[] = []
  let failSaves = true
  let rejectFirstSave!: () => void
  const firstSave = new Promise<void>((resolve) => {
    rejectFirstSave = resolve
  })
  let loginCount = 0

  await context.route(/\/api\/v1\//, async (route) => {
    const request = route.request()
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const path = new URL(request.url()).pathname
    if (path.endsWith('/auth/login')) {
      const { email } = request.postDataJSON() as { email: string }
      const owner = email.startsWith('owner@')
      return route.fulfill({
        headers,
        json: {
          token: ++loginCount + '|focus-test',
          expires_at: '2099-01-01T00:00:00Z',
          user: {
            id: owner ? 'focus-owner' : 'focus-other',
            name: owner ? 'Focus owner' : 'Other account',
            email,
            has_password: true,
            email_verified_at: '2026-11-24T00:00:00Z',
            timezone: 'Asia/Phnom_Penh',
            time_format: '24h',
            week_starts_on: 1,
            survey_done: true,
            goal: null,
            heard_from: null,
            current_streak: 0,
            longest_streak: 0,
            created_at: '2026-11-24T00:00:00Z',
          },
        },
      })
    }
    if (path.endsWith('/auth/logout')) return route.fulfill({ status: 204, headers })
    if (path.endsWith('/health')) return route.fulfill({ headers, json: { status: 'ok' } })
    if (path.endsWith('/schedule/items')) {
      return route.fulfill({
        headers,
        json: {
          data: [
            {
              id: scheduleId,
              title: 'Deep work block',
              category: 'work',
              start_time: '09:00',
              end_time: '10:00',
              days: [0],
              starts_on: '2026-11-24',
              ends_on: null,
            },
          ],
        },
      })
    }
    if (path.endsWith('/focus-sessions') && request.method() === 'POST') {
      const payload = request.postDataJSON() as FocusSessionInput
      requests.push(payload)
      if (requests.length === 1) await firstSave
      if (failSaves) return route.abort('internetdisconnected')
      return route.fulfill({ status: 201, headers, json: { data: payload } })
    }
    return route.fulfill({ headers, json: { data: [] } })
  })

  async function signIn(email: string) {
    await page.goto('/sign-in')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('correct-horse')
    await page.getByRole('button', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/today$/)
    await page.getByRole('link', { name: 'Focus', exact: true }).click()
  }

  async function signOut() {
    await page.getByRole('link', { name: 'Profile', exact: true }).click()
    await page.getByRole('button', { name: 'Sign out' }).click()
    await expect(page.getByRole('link', { name: 'Try it now' })).toBeVisible()
    await page.goto('/focus')
  }

  await page.goto('/today')
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add a to-do' })
  await sheet.getByLabel('Title').fill('Guest reading')
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Guest reading')).toBeVisible()
  await page.goto('/focus')
  const link = page.getByLabel('Link to your plan (optional)')
  await link.selectOption({ label: 'Guest reading' })
  const start = page.getByRole('button', { name: 'Start', exact: true })
  if (testInfo.project.use.hasTouch) await start.tap()
  else await start.click()
  await expect(page.getByText('Linked to Guest reading')).toBeVisible()

  await signIn('owner@example.test')
  await expect(start).toBeVisible()
  await expect(page.getByRole('option', { name: 'Guest reading' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await link.selectOption({ label: 'Deep work block' })
  await start.click()
  await expect(page.getByText('Linked to Deep work block')).toBeVisible()
  const lap = page.getByRole('button', { name: 'Lap', exact: true })
  if (testInfo.project.use.hasTouch) await lap.tap()
  else await lap.click()
  await expect(page.getByText('Lap 1')).toBeVisible()

  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  await expect(page.getByText('Saving your session…')).toBeVisible()
  rejectFirstSave()
  const retry = page.getByRole('button', { name: 'Retry save' })
  await expect(retry).toBeEnabled()
  await expect(
    page.getByRole('alert').filter({ hasText: 'kept on this device for retry' }),
  ).toBeVisible()
  expect(requests[0]).toMatchObject({
    mode: 'stopwatch',
    end_reason: 'completed',
    schedule_item_id: scheduleId,
    laps: [expect.any(Number)],
  })
  await signOut()
  await expect(page.getByText('Linked to Guest reading')).toBeVisible()
  await expect(retry).toHaveCount(0)

  await signIn('other@example.test')
  await expect(start).toBeVisible()
  await expect(retry).toHaveCount(0)
  expect(requests).toHaveLength(1)

  await signOut()
  await signIn('owner@example.test')
  await expect(retry).toBeEnabled()
  await expect.poll(() => requests.length).toBe(2)
  failSaves = false
  await retry.click()
  await expect(retry).toHaveCount(0)
  await expect(start).toBeFocused()
  expect(requests).toEqual([requests[0], requests[0], requests[0]])
})
