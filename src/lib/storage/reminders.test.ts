import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { GuestDatabase } from './db'
import { GuestTodoRepository } from './GuestTodoRepository'
import { ValidationError } from './errors'

const now = '2026-11-19T17:01:00.000Z'
const due = '2026-11-19T17:00:00.000Z'

describe('guest reminders', () => {
  let db: GuestDatabase
  let repo: GuestTodoRepository

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(now)
    db = new GuestDatabase(`reminders-${crypto.randomUUID()}`)
    repo = new GuestTodoRepository({ db, timeZone: 'Asia/Phnom_Penh' })
  })

  afterEach(async () => {
    await db.delete()
    vi.useRealTimers()
  })

  it('lists only eligible reminders in time order, including the precise due time', async () => {
    const exact = await repo.create({ title: 'Exact', remind_at: now })
    const earlier = await repo.create({ title: 'Earlier', remind_at: due })
    await repo.create({ title: 'Future', remind_at: '2026-11-19T17:01:00.001Z' })
    const done = await repo.create({ title: 'Done', remind_at: due })
    const deleted = await repo.create({ title: 'Deleted', remind_at: due })
    await repo.setDone(done.id, true)
    await repo.delete(deleted.id)
    expect((await repo.listDueReminders()).map(({ id }) => id)).toEqual([earlier.id, exact.id])
  })

  it.each([
    [5, '2026-11-19T17:06:00.000Z'],
    [10, '2026-11-19T17:11:00.000Z'],
    [30, '2026-11-19T17:31:00.000Z'],
    [60, '2026-11-19T18:01:00.000Z'],
  ] as const)(
    'snoozes for %i minutes and is due again at the new time',
    async (minutes, expected) => {
      const todo = await repo.create({ title: 'Snooze', remind_at: due })
      await repo.dismissReminder(todo.id)
      await repo.snoozeReminder(todo.id, minutes)
      expect(await db.todos.get(todo.id)).toMatchObject({
        remind_at: expected,
        remind_dismissed_at: null,
      })
      expect(await repo.listDueReminders()).toEqual([])
      vi.setSystemTime(expected)
      expect(await repo.listDueReminders()).toMatchObject([{ id: todo.id }])
    },
  )

  it('retains the reminder and its first dismissal across reload, then reactivates on change', async () => {
    const todo = await repo.create({ title: 'Dismiss', remind_at: due })
    await repo.dismissReminder(todo.id)
    db.close()
    db = new GuestDatabase(db.name)
    repo = new GuestTodoRepository({ db })
    vi.setSystemTime('2026-11-19T17:02:00Z')
    await repo.dismissReminder(todo.id)
    await repo.update(todo.id, { remind_at: '2026-11-20T00:00:00+07:00' })
    expect(await db.todos.get(todo.id)).toMatchObject({ remind_at: due, remind_dismissed_at: now })
    expect(await repo.listDueReminders()).toEqual([])
    await repo.update(todo.id, { remind_at: now })
    expect(await repo.listDueReminders()).toMatchObject([{ id: todo.id }])
    await repo.update(todo.id, { remind_at: null })
    expect(await repo.listDueReminders()).toEqual([])
  })

  it('rejects subtask reminders on create, edit, and snooze', async () => {
    const parent = await repo.create({ title: 'Parent' })
    const child = await repo.create({ title: 'Child', parent_id: parent.id })
    await expect(
      repo.create({ title: 'Invalid', parent_id: parent.id, remind_at: due }),
    ).rejects.toMatchObject({ field: 'remind_at' })
    await expect(repo.update(child.id, { remind_at: due })).rejects.toBeInstanceOf(ValidationError)
    await expect(repo.snoozeReminder(child.id, 5)).rejects.toBeInstanceOf(ValidationError)
    expect(await repo.listDueReminders()).toEqual([])
  })

  it.each([due, null])('carries reminder %s and resets dismissal on a repeat', async (remindAt) => {
    const parent = await repo.create({
      title: 'Repeat',
      due_date: '2026-11-18',
      repeat_rule: { type: 'daily' },
      remind_at: remindAt,
    })
    if (remindAt) await repo.dismissReminder(parent.id)
    const done = await repo.setDone(parent.id, true)
    expect(await db.todos.get(done.next_todo_id ?? '')).toMatchObject({
      due_date: '2026-11-21',
      remind_at: remindAt ? '2026-11-22T17:00:00.000Z' : null,
      remind_dismissed_at: null,
    })
  })

  it('migrates v5 reminder defaults without changing existing data', async () => {
    const old = new Dexie(db.name)
    old.version(5).stores({
      todos: 'id, due_date, created_at, deleted_at, parent_id',
      schedule_items: 'id',
      schedule_exceptions: 'id, schedule_item_id, date, &[schedule_item_id+date]',
      schedule_checkins: 'id, schedule_item_id, date, &[schedule_item_id+date]',
    })
    const row = {
      id: 'existing',
      parent_id: null,
      notes: 'keep',
      priority: 'high',
      repeat_rule: { type: 'daily' },
      next_todo_id: 'next',
      deleted_at: now,
    }
    await old.table('todos').add(row)
    old.close()
    expect(await db.todos.get(row.id)).toEqual({
      ...row,
      remind_at: null,
      remind_dismissed_at: null,
    })
  })
})
