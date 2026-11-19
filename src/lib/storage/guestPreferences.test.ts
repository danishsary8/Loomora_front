import Dexie from 'dexie'
import { GuestDatabase } from './db'
import { readGuestPreferences, writeGuestPreferences } from './guestPreferences'

it('preserves v6 records exactly and retains preferences after reconnecting', async () => {
  const name = `test-${crypto.randomUUID()}`
  const old = new Dexie(name)
  old.version(6).stores({
    todos: 'id, due_date, created_at, deleted_at, parent_id',
    schedule_items: 'id',
    schedule_exceptions: 'id, schedule_item_id, date, &[schedule_item_id+date]',
    schedule_checkins: 'id, schedule_item_id, date, &[schedule_item_id+date]',
  })
  const date = '2026-11-19'
  const now = `${date}T16:00:00.000Z`
  const rows = {
    todos: [
      {
        id: 'parent',
        priority: 'high',
        notes: 'keep this',
        repeat_rule: { type: 'daily' },
        next_todo_id: 'repeat',
        remind_at: now,
        remind_dismissed_at: now,
        deleted_at: now,
      },
      { id: 'child', parent_id: 'parent', deleted_at: now, done_at: now },
      { id: 'repeat', due_date: '2026-11-20', remind_at: '2026-11-20T16:00:00.000Z' },
    ],
    schedule_items: [{ id: 'item', days: [0, 6], start_time: '14:30', end_time: '15:00' }],
    schedule_exceptions: [{ id: 'exception', schedule_item_id: 'item', date, type: 'skip' }],
    schedule_checkins: [{ id: 'checkin', schedule_item_id: 'item', date, done_at: now }],
  }
  let db = new GuestDatabase(name)
  try {
    for (const [table, records] of Object.entries(rows)) await old.table(table).bulkAdd(records)
    old.close()
    expect(await readGuestPreferences(db)).toEqual({ time_format: '24h', week_starts_on: 1 })
    await writeGuestPreferences(db, { time_format: '12h', week_starts_on: 7 })
    db.close()
    db = new GuestDatabase(name)
    expect(await readGuestPreferences(db)).toEqual({ time_format: '12h', week_starts_on: 7 })
    for (const [table, records] of Object.entries(rows)) {
      const stored = db.table(table)
      expect(await stored.bulkGet(records.map(({ id }) => id))).toEqual(records)
      expect(await stored.count()).toBe(records.length)
    }
  } finally {
    old.close()
    await db.delete()
  }
})
