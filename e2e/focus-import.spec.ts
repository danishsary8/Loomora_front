import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'UTC' })

const USER = {
  id: '2f0b7f6e-9c1d-4e5a-8b2c-1d3e4f5a6b7c',
  name: 'Focus Guest',
  email: 'focus@example.com',
  has_password: true,
  email_verified_at: '2026-11-26T00:00:00Z',
  timezone: 'UTC',
  time_format: '24h',
  week_starts_on: 1,
  goal: 'be_consistent',
  heard_from: null,
  survey_done: true,
  current_streak: 1,
  longest_streak: 1,
  created_at: '2026-11-26T00:00:00Z',
}

test('migrates guest Focus sessions on sign-in with retry after failure', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-26T09:00:00Z') })
  const importPayloads: Array<{
    todos: Array<{ id: string; title: string }>
    focus_sessions: Array<{
      id: string
      mode: string
      started_at: string
      ended_at: string
      end_reason: string
      planned_focus_ms: number | null
      todo_id: string | null
      schedule_item_id: string | null
      label: string | null
      segments: Array<{ type: string; started_at: string; ended_at: string; active_ms: number }>
      laps: number[] | null
    }>
  }> = []
  let importedSessions: Array<Record<string, unknown>> = []

  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'test-token',
        expires_at: '2026-12-26T09:00:00Z',
        user: USER,
      }),
    })
  })
  await page.route('**/api/v1/todos**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })
  await page.route('**/api/v1/schedule/day**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ date: '2026-11-26', data: [] }),
    })
  })
  await page.route('**/api/v1/streak**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { current_streak: 1, longest_streak: 1, today_counted: true },
      }),
    })
  })
  await page.route('**/api/v1/days/*/intention', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { date: '2026-11-26', text: null } }),
    })
  })
  await page.route('**/api/v1/reminders/due', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: [] }),
    })
  })
  await page.route('**/api/v1/focus-sessions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: importedSessions }),
    })
  })
  await page.route('**/api/v1/import', async (route) => {
    const body = route.request().postDataJSON() as (typeof importPayloads)[number]
    importPayloads.push(body)
    if (importPayloads.length === 1) {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Temporary error' }),
      })
      return
    }
    importedSessions = body.focus_sessions.map((session) => ({
      ...session,
      local_date: '2026-11-26',
      focus_ms: session.segments.reduce((sum, seg) => sum + seg.active_ms, 0),
      break_ms: 0,
      paused_ms: 0,
      created_at: session.ended_at,
    }))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          todos: { created: body.todos.length, skipped: 0 },
          schedule_items: { created: 0, skipped: 0 },
          exceptions: { created: 0, skipped: 0 },
          checkins: { created: 0, skipped: 0 },
          focus_sessions: { created: body.focus_sessions.length, skipped: 0 },
          daily_intentions: { created: 0, skipped: 0 },
        },
      }),
    })
  })

  // Record a guest Focus session.
  await page.goto('/focus')
  await page.getByRole('button', { name: 'Stopwatch' }).click()
  await page.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toHaveAttribute(
    'aria-disabled',
    'false',
  )
  await page.clock.fastForward(45_000)
  await page.getByRole('button', { name: 'End early' }).click()

  const history = page.getByRole('region', { name: 'Focus history' })
  await expect(history.getByRole('listitem')).toContainText('Stopwatch')

  // Save plan from Profile -> Create an account -> Sign in.
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Save your plan' }).click()
  const prompt = page.getByRole('dialog', { name: 'Save your plan' })
  await prompt.getByRole('button', { name: 'Create an account' }).click()
  await page.getByRole('link', { name: 'Sign in' }).click()

  await page.getByLabel('Email').fill(USER.email)
  await page.getByLabel('Password').fill('password123')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  // First import fails -> retry dialog appears, local session preserved.
  const retrySheet = page.getByRole('dialog', { name: 'We could not save your plan' })
  await expect(retrySheet).toBeVisible()
  await retrySheet.getByRole('button', { name: 'Try again' }).click()

  await expect(page.getByText('Your plan is saved')).toBeVisible()
  expect(importPayloads).toHaveLength(2)
  expect(importPayloads[0]?.focus_sessions).toHaveLength(1)
  expect(importPayloads[1]).toEqual(importPayloads[0])

  // Verify the imported session is visible in account Focus history.
  await page.goto('/focus')
  await expect(
    page.getByRole('region', { name: 'Focus history' }).getByRole('listitem'),
  ).toContainText('Stopwatch')
})
