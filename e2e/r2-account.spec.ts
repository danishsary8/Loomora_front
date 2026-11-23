import { expect, test } from '@playwright/test'
import assert from 'node:assert/strict'
import type { ApiTodo } from '../src/lib/api/types'
import { LOCAL_API_ORIGIN } from './local-api'

test.use({ timezoneId: 'UTC', reducedMotion: 'reduce' })

const today = '2026-11-20'
const tomorrow = '2026-11-21'
const now = '2026-11-19T17:01:00.000Z'
const remindAt = '2026-11-19T17:00:00.000Z'
const notes = 'Use the library copy.'
const user = {
  id: 'qa-023-account',
  name: 'QA Account',
  email: 'qa@example.test',
  has_password: true,
  email_verified_at: now,
  timezone: 'Asia/Phnom_Penh',
  survey_done: true,
}
const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

function todo(id: string, title: string, fields: Partial<ApiTodo> = {}): ApiTodo {
  return {
    id,
    title,
    category: 'other',
    priority: 'normal',
    notes: null,
    parent_id: null,
    repeat_rule: null,
    next_todo_id: null,
    remind_at: null,
    due_date: null,
    done_at: null,
    overdue: false,
    old: false,
    created_at: now,
    subtasks: [],
    ...fields,
  }
}

test('account Today uses the account date and renders the API repeat lifecycle', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone-375', 'Mobile viewport scenario')
  await page.clock.setFixedTime(new Date(now))
  await page.addInitScript((account) => {
    localStorage.setItem(
      'loomora.session',
      JSON.stringify({ token: '1|qa-023', expiresAt: '2099-01-01T00:00:00Z', user: account }),
    )
  }, user)

  const first = todo('first', 'Find the book', { parent_id: 'parent' })
  const second = todo('second', 'Read the chapter', {
    parent_id: 'parent',
    created_at: '2026-11-19T17:01:00.001Z',
  })
  const created = todo('parent', 'Daily reading', {
    due_date: today,
    priority: 'high',
    notes,
    remind_at: remindAt,
    repeat_rule: { type: 'weekly', days: [4] },
  })
  let current: ApiTodo | undefined
  let successor: ApiTodo | undefined
  let dismissed = false
  let checkedOff = 0
  let currentDate = today

  await page.route(`${LOCAL_API_ORIGIN}/api/v1/**`, async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())
    const path = url.pathname.replace('/api/v1', '')
    const respond = (data: unknown, status = 200) =>
      route.fulfill({ json: { data }, status, headers: cors })
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: cors })
    if (path === '/health') return route.fulfill({ json: { status: 'ok' }, headers: cors })
    expect(request.headers().authorization).toBe('Bearer 1|qa-023')

    switch (`${method} ${path}`) {
      case 'GET /me':
        return respond(user)
      case 'GET /streak':
        return respond({ current_streak: 0, longest_streak: 0, today_counted: false })
      case `GET /days/${today}/intention`:
      case `GET /days/${tomorrow}/intention`:
        return respond({ text: null })
      case 'GET /todos': {
        const date = url.searchParams.get('date')
        expect([today, tomorrow]).toContain(date)
        const row = date === today ? current : successor
        return respond(row ? [row] : [])
      }
      case 'GET /reminders/due': {
        const due = currentDate === today ? (!dismissed ? current : undefined) : successor
        return respond(due && !due.done_at ? [due] : [])
      }
      case 'POST /todos':
        expect(request.postDataJSON()).toMatchObject({
          title: created.title,
          due_date: today,
          priority: 'high',
          notes: created.notes,
          repeat_rule: created.repeat_rule,
          remind_at: remindAt,
        })
        current = { ...created, subtasks: [first, second] }
        return respond(current, 201)
      case 'POST /todos/parent/reminder/dismiss':
        dismissed = true
        return respond(current)
      case 'PATCH /todos/parent':
        assert(current)
        expect(request.postDataJSON()).toMatchObject({ repeat_rule: { type: 'daily' } })
        current = { ...current, repeat_rule: { type: 'daily' } }
        return respond(current)
      case 'POST /todos/parent/done':
        assert(current)
        checkedOff++
        successor ??= todo('successor', created.title, {
          due_date: tomorrow,
          priority: created.priority,
          notes: created.notes,
          repeat_rule: { type: 'daily' },
          remind_at: '2026-11-20T17:00:00.000Z',
          subtasks: [
            { ...first, id: 'next-first', parent_id: 'successor' },
            { ...second, id: 'next-second', parent_id: 'successor' },
          ],
        })
        current = {
          ...current,
          done_at: now,
          next_todo_id: successor.id,
          subtasks: [first, second].map((child) => ({ ...child, done_at: now })),
        }
        return respond(current)
      case 'DELETE /todos/parent/done':
        assert(current)
        current = { ...current, done_at: null }
        return respond(current)
      default:
        return respond([])
    }
  })

  await page.goto('/today')
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByLabel('Due date (optional)')).toHaveValue(today)
  await sheet.getByLabel('Title').fill(created.title)
  await sheet.getByLabel('Priority').selectOption('high')
  await sheet.getByLabel('Notes', { exact: true }).fill(notes)
  await sheet.getByRole('combobox', { name: 'Repeat' }).selectOption('weekly')
  await sheet.getByRole('button', { name: 'Friday' }).click()
  await sheet.getByLabel('Reminder date', { exact: true }).fill(today)
  await sheet.getByLabel('Reminder time', { exact: true }).fill('00:00')
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()
  const banner = page.getByRole('region', { name: 'Reminder' })
  await expect(banner).toContainText(created.title)
  await banner.getByRole('button', { name: 'Dismiss' }).click()
  await expect(banner).toBeHidden()

  await page.getByRole('button', { name: /Edit.*Daily reading/ }).click()
  await expect(sheet.getByLabel('Reminder time', { exact: true })).toHaveValue('00:00')
  await sheet.getByRole('combobox', { name: 'Repeat' }).selectOption('daily')
  await sheet.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(sheet).toBeHidden()
  const parent = page.getByRole('checkbox', { name: /Daily reading/ })
  const children = page.getByRole('checkbox', { name: /Find the book|Read the chapter/ })
  await expect(children).toHaveCount(2)
  await expect(children.nth(0)).toHaveAccessibleName(/Find the book/)
  await expect(children.nth(1)).toHaveAccessibleName(/Read the chapter/)
  await parent.press('Space')
  await expect(children.nth(1)).toBeChecked()
  const undo = page.waitForResponse(
    (response) =>
      response.url().endsWith('/todos/parent/done') && response.request().method() === 'DELETE',
  )
  await parent.press('Space')
  expect((await undo).ok()).toBe(true)
  await parent.press('Space')
  await expect.poll(() => checkedOff).toBe(2)

  currentDate = tomorrow
  await page.clock.setFixedTime(new Date('2026-11-20T17:01:00.000Z'))
  await page.reload()
  await expect(parent).toHaveCount(1)
  await expect(parent).not.toBeChecked()
  await expect(children.nth(0)).not.toBeChecked()
  await expect(children.nth(1)).not.toBeChecked()
  await expect(page.getByText(notes)).toBeVisible()
  await expect(page.getByText('High', { exact: true })).toBeVisible()
  await expect(page.getByText('Repeats daily')).toBeVisible()
  await expect(banner).toContainText(created.title)
})
