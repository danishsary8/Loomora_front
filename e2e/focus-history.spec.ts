import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'Asia/Phnom_Penh' })

test('shows a saved guest session on its starting local date, including offline', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date('2026-11-23T16:59:10Z') })
  await page.goto('/focus')
  const history = page.getByRole('region', { name: 'Focus history' })
  const date = history.getByLabel('Session date')
  const start = page.getByRole('button', { name: 'Start', exact: true })

  await expect(date).toHaveValue('2026-11-23')
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await start.focus()
  await page.keyboard.press('Tab')
  await expect(date).toBeFocused()
  await start.click()
  const pause = page.getByRole('button', { name: 'Pause' })
  await expect(pause).toHaveAttribute('aria-disabled', 'false')
  await page.clock.fastForward(48_000)
  await pause.click()
  await expect(page.getByRole('button', { name: 'Resume' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.clock.fastForward(30_000)
  await page.getByRole('button', { name: 'End early' }).click()

  const row = history.getByRole('listitem')
  await expect(row).toContainText('Stopwatch')
  await expect(row).toContainText('Ended early')
  await expect(row.locator('time')).toHaveText('23:59')
  await expect(history.locator('dd')).toHaveText(/^(?:4[89]|5\d)(?:\.\d+)? sec$/)
  await expect(date).toHaveValue('2026-11-23')

  await context.setOffline(true)
  await date.fill('2026-11-24')
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await date.fill('2026-11-23')
  await expect(row).toBeVisible()
  const search = history.getByRole('searchbox', { name: 'Search sessions' })
  const modes = history.getByRole('group', { name: 'Timer mode' })
  const all = modes.getByRole('radio', { name: 'All' })
  const countdown = modes.getByRole('radio', { name: 'Countdown' })
  const stopwatch = modes.getByRole('radio', { name: 'Stopwatch' })
  await search.fill('ENDED EARLY')
  await stopwatch.click()
  await expect(row).toContainText('Stopwatch')
  await date.fill('2026-11-24')
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await date.fill('2026-11-23')
  await expect(row).toBeVisible()
  await countdown.click()
  await expect(history.getByRole('status')).toHaveText('No sessions match your filters.')
  await expect(history.locator('dd')).toHaveText(/^(?:4[89]|5\d)(?:\.\d+)? sec$/)
  await history.getByRole('button', { name: 'Clear filters' }).press('Enter')
  await expect(search).toBeFocused()
  await expect(search).toHaveValue('')
  await expect(all).toBeChecked()
  await expect(date).toHaveValue('2026-11-23')
  await expect(row).toBeVisible()
  await expect(history).not.toContainText('Focus history is unavailable offline.')
})

test('fits Focus history at six widths with normal and doubled text', async ({ page }) => {
  await page.goto('/focus')
  const history = page.getByRole('region', { name: 'Focus history' })
  const date = history.getByLabel('Session date')
  const start = page.getByRole('button', { name: 'Start', exact: true })

  await start.click()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.getByRole('button', { name: 'End early', exact: true }).click()
  await expect(history.getByRole('listitem')).toContainText('Countdown')

  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await start.click()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.getByRole('button', { name: 'Finish', exact: true }).click()
  const modes = history.getByRole('group', { name: 'Timer mode' })
  const all = modes.getByRole('radio', { name: 'All' })
  const countdown = modes.getByRole('radio', { name: 'Countdown' })
  const stopwatch = modes.getByRole('radio', { name: 'Stopwatch' })
  const search = history.getByRole('searchbox', { name: 'Search sessions' })
  const clear = history.getByRole('button', { name: 'Clear filters' })
  await expect(history.getByRole('listitem')).toHaveCount(2)
  await all.press('ArrowRight')
  await expect(countdown).toBeChecked()
  await expect(history.getByRole('listitem')).toContainText('Countdown')
  await countdown.press('ArrowRight')
  await expect(stopwatch).toBeChecked()
  await expect(history.getByRole('listitem')).toContainText('Completed')

  const { violations } = await new AxeBuilder({ page }).include('#main').analyze()
  expect(violations).toEqual([])

  for (const scale of [100, 200]) {
    await page.evaluate((scale) => {
      document.documentElement.style.fontSize = scale + '%'
    }, scale)

    for (const width of [320, 375, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 812 })
      const context = `${width}px at ${scale}% text size`
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
        context,
      ).toBeLessThanOrEqual(0)

      await start.focus()
      const mobileNav = page.getByRole('navigation').filter({ visible: true })
      for (const option of [all, countdown, stopwatch]) {
        const box = await option.boundingBox()
        if (!box) throw new Error('The filter option must be visible')
        expect(Math.min(box.height, box.width), context).toBeGreaterThanOrEqual(44)
      }
      for (const control of [date, search, stopwatch, clear]) {
        await page.keyboard.press('Tab')
        if (control === search) {
          // Chromium tabs through each part of a native date field before exiting it.
          for (let part = 0; part < 4; part++) {
            if (!(await date.evaluate((field) => field === document.activeElement))) break
            await page.keyboard.press('Tab')
          }
        }
        await expect(control, context).toBeFocused()
        const box = await control.boundingBox()
        if (!box) throw new Error('The History control must be visible')
        expect(Math.min(box.height, box.width), context).toBeGreaterThanOrEqual(44)
        if (width < 768) {
          await expect
            .poll(
              async () => {
                const field = await control.boundingBox()
                const nav = await mobileNav.boundingBox()
                if (!field || !nav)
                  throw new Error('The History control and mobile navigation must be visible')
                return Math.min(field.y, nav.y - field.y - field.height)
              },
              { message: context },
            )
            .toBeGreaterThanOrEqual(0)
        }
      }
    }
  }
})

test('guest deletes a Focus session, restores via ActionToast Undo, and keeps deletion across reload (F-R3-14)', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date('2026-11-23T16:59:10Z') })
  await page.goto('/focus')
  const history = page.getByRole('region', { name: 'Focus history' })
  const start = page.getByRole('button', { name: 'Start', exact: true })

  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await start.click()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.clock.fastForward(15_000)
  await page.clock.resume()
  await page.getByRole('button', { name: 'Finish' }).click()

  const row = history.getByRole('listitem')
  await expect(row).toContainText('Stopwatch')
  await expect(history.locator('dd')).toHaveText(/^(?:1[5-9]|2\d)(?:\.\d+)? sec$/)

  // Delete offline and Undo via shared ActionToast.
  await context.setOffline(true)
  await history.getByRole('button', { name: /Delete session from/i }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete Focus session?' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete session' }).click()
  await expect(dialog).toBeHidden()
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await expect(history.locator('dd')).toHaveText('0 sec')

  const undo = page.getByRole('button', { name: 'Undo' })
  await expect(page.getByText('Focus session deleted.')).toBeVisible()
  await undo.click()
  await expect(row).toBeVisible()
  await expect(history.locator('dd')).toHaveText(/^(?:1[5-9]|2\d)(?:\.\d+)? sec$/)

  // Delete again without Undo and verify persistence across reload.
  await context.setOffline(false)
  await history.getByRole('button', { name: /Delete session from/i }).click()
  await page
    .getByRole('dialog', { name: 'Delete Focus session?' })
    .getByRole('button', { name: 'Delete session' })
    .click()
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await page.reload()
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await expect(history.locator('dd')).toHaveText('0 sec')
})

test('account deletes a Focus session (204), restores on Undo (200), and handles expired restore (410) (F-R3-14)', async ({
  page,
}) => {
  const headers = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': '*',
  }
  const sessionId = '3f9d6a12-4c2b-4d7e-8a9b-0c1d2e3f4a5b'
  const record = {
    id: sessionId,
    local_date: '2026-11-23',
    mode: 'countdown',
    end_reason: 'completed',
    started_at: '2026-11-23T11:00:00Z',
    ended_at: '2026-11-23T11:25:00Z',
    created_at: '2026-11-23T11:25:00Z',
    focus_ms: 1_500_000,
    break_ms: 0,
    paused_ms: 0,
    planned_focus_ms: 1_500_000,
    todo_id: null,
    schedule_item_id: null,
    label: 'API Focus review',
    segments: [
      {
        type: 'focus',
        started_at: '2026-11-23T11:00:00Z',
        ended_at: '2026-11-23T11:25:00Z',
        active_ms: 1_500_000,
      },
    ],
    laps: null,
  }
  let deleted = false
  let expireRestore = false

  await page.route(/\/api\//, async (route) => {
    const req = route.request()
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    const url = new URL(req.url())
    if (url.pathname.endsWith('/auth/login')) {
      return route.fulfill({
        headers,
        json: {
          token: '1|focus-delete-token',
          expires_at: '2030-01-01T00:00:00Z',
          user: {
            id: '00000000-0000-4000-8000-000000000099',
            name: 'Sokha',
            email: 'sokha@example.test',
            email_verified_at: '2026-11-20T00:00:00Z',
            timezone: 'Asia/Phnom_Penh',
            time_format: '24h',
            week_starts_on: 'monday',
            survey_done: true,
            has_password: true,
            current_streak: 0,
            longest_streak: 0,
            created_at: '2026-11-20T00:00:00Z',
          },
        },
      })
    }
    if (url.pathname.endsWith(`/focus-sessions/${sessionId}`) && req.method() === 'DELETE') {
      deleted = true
      return route.fulfill({ status: 204, headers })
    }
    if (url.pathname.endsWith(`/focus-sessions/${sessionId}/restore`) && req.method() === 'POST') {
      if (expireRestore) {
        return route.fulfill({
          status: 410,
          headers,
          json: { message: 'The undo deadline has expired.' },
        })
      }
      deleted = false
      return route.fulfill({ status: 200, headers, json: { data: record } })
    }
    if (url.pathname.endsWith('/focus-sessions') && req.method() === 'GET') {
      const requested = url.searchParams.get('date')
      return route.fulfill({
        headers,
        json: { data: requested === '2026-11-23' && !deleted ? [record] : [] },
      })
    }
    return route.fulfill({ headers, json: { data: [] } })
  })

  await page.clock.install({ time: new Date('2026-11-23T12:00:00Z') })
  await page.goto('/sign-in')
  await page.getByLabel('Email').fill('sokha@example.test')
  await page.getByLabel('Password').fill('correct-horse')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/today$/)
  await page.getByRole('link', { name: 'Focus', exact: true }).click()

  const history = page.getByRole('region', { name: 'Focus history' })
  await expect(history.getByText(/API Focus review/)).toBeVisible()
  await expect(history.locator('dd')).toHaveText('25 min')

  await history.getByRole('button', { name: /Delete session from/i }).click()
  const dialog = page.getByRole('dialog', { name: 'Delete Focus session?' })
  await dialog.getByRole('button', { name: 'Delete session' }).click()
  await expect(dialog).toBeHidden()
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await expect(history.locator('dd')).toHaveText('0 sec')

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(history.getByText(/API Focus review/)).toBeVisible()
  await expect(history.locator('dd')).toHaveText('25 min')

  // Delete again and verify 410 expired restore feedback.
  expireRestore = true
  await history.getByRole('button', { name: /Delete session from/i }).click()
  await page
    .getByRole('dialog', { name: 'Delete Focus session?' })
    .getByRole('button', { name: 'Delete session' })
    .click()
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(page.getByText('The undo window for this Focus session has expired.')).toBeVisible()
  await expect(history.getByText('No saved Focus sessions for this date.')).toBeVisible()
})
