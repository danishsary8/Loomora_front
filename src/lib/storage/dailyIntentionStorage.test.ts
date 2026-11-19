import Dexie from 'dexie'
import { accountDataApi, useSession, type ImportBody } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { GuestDatabase } from './db'
import { GuestDailyIntentionRepository } from './GuestDailyIntentionRepository'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { GuestTodoRepository } from './GuestTodoRepository'
import { readGuestPreferences, writeGuestPreferences } from './guestPreferences'
import { isEmptyPlan, readGuestPlan, saveGuestPlan } from './saveGuestPlan'

const existing = { date: '2026-11-19', text: 'Keep server text' }
const stored = { date: existing.date, text: 'Device draft' }
const preference = { time_format: '12h', week_starts_on: 7 } as const

it('opens a true v7 database without rewriting any existing rows or preferences', async () => {
  const name = `test-${crypto.randomUUID()}`
  const old = new Dexie(name)
  old.version(7).stores({
    todos: 'id, due_date, created_at, deleted_at, parent_id',
    schedule_items: 'id',
    schedule_exceptions: 'id, schedule_item_id, date, &[schedule_item_id+date]',
    schedule_checkins: 'id, schedule_item_id, date, &[schedule_item_id+date]',
    meta: 'key',
  })
  const date = existing.date
  const instant = `${date}T03:00:00Z`
  const rows = {
    todos: [
      {
        id: 'parent',
        priority: 'high',
        notes: 'Keep notes',
        repeat_rule: { type: 'daily' },
        next_todo_id: 'child',
        remind_at: instant,
        remind_dismissed_at: instant,
      },
      { id: 'child', parent_id: 'parent', deleted_at: instant },
    ],
    schedule_items: [{ id: 'item', days: [0], start_time: '08:00', end_time: '09:00' }],
    schedule_exceptions: [{ id: 'exception', schedule_item_id: 'item', date, type: 'skip' }],
    schedule_checkins: [{ id: 'checkin', schedule_item_id: 'item', date, done_at: instant }],
    meta: [{ key: 'timePreferences', value: preference }],
  }
  const db = new GuestDatabase(name)
  try {
    for (const [table, records] of Object.entries(rows)) await old.table(table).bulkAdd(records)
    old.close()
    await db.open()
    expect(db.verno).toBe(8)
    for (const [table, records] of Object.entries(rows)) {
      expect(await db.table(table).toArray()).toEqual(
        [...records].sort((a, b) => ('id' in a && 'id' in b ? a.id.localeCompare(b.id) : 0)),
      )
    }
    expect(await db.table('dailyIntentions').toArray()).toEqual([])
    await db.table('dailyIntentions').put(stored)
    await db.table('dailyIntentions').put(existing)
    expect(await db.table('dailyIntentions').toArray()).toEqual([existing])
  } finally {
    old.close()
    await db.delete()
  }
})

describe('daily intentions in Save Plan', () => {
  let db: GuestDatabase
  const guest = () => ({
    todos: new GuestTodoRepository({ db }),
    schedule: new GuestScheduleRepository({ db }),
    intentions: new GuestDailyIntentionRepository(db),
  })

  beforeEach(() => {
    db = new GuestDatabase(`test-${crypto.randomUUID()}`)
    useSession.getState().signIn(makeTokenResponse())
  })

  afterEach(() => db.delete())

  it('imports an intention-only plan, keeps the server copy and preserves preferences', async () => {
    await writeGuestPreferences(db, preference)
    await db.table('dailyIntentions').put(stored)
    const added = { date: '2026-11-20', text: 'New day' }
    await db.table('dailyIntentions').put(added)
    const serverRows = new Map([[existing.date, existing.text]])
    const calls: unknown[] = []
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        const body = (await request.json()) as ImportBody & { daily_intentions: (typeof stored)[] }
        calls.push(body)
        let skipped = 0
        for (const { date, text } of body.daily_intentions) {
          if (serverRows.has(date)) skipped++
          else serverRows.set(date, text)
        }
        return HttpResponse.json({ data: { daily_intentions: { created: 1, skipped } } })
      }),
    )
    expect(isEmptyPlan(await readGuestPlan(guest()))).toBe(false)
    await expect(saveGuestPlan(guest(), accountDataApi)).resolves.toBe(true)
    expect(calls).toEqual([
      {
        todos: [],
        schedule_items: [],
        exceptions: [],
        checkins: [],
        daily_intentions: [stored, added],
      },
    ])
    expect([...serverRows.values()]).toEqual(['Keep server text', 'New day'])
    expect(await db.table('dailyIntentions').count()).toBe(0)
    expect(await readGuestPreferences(db)).toEqual(preference)
  })

  it('keeps unrelated guest data and new intention edits made while an intention-only import runs', async () => {
    await db.dailyIntentions.put(stored)
    let finish!: () => void
    let start!: () => void
    const requestPending = new Promise<void>((resolve) => {
      finish = resolve
    })
    const started = new Promise<void>((resolve) => {
      start = resolve
    })
    server.use(
      http.post(`${API}/import`, async () => {
        start()
        await requestPending
        return HttpResponse.json({ data: { daily_intentions: { created: 1, skipped: 0 } } })
      }),
    )
    const repositories = guest()
    const importing = saveGuestPlan(repositories, accountDataApi)
    await started
    const todo = await repositories.todos.create({ title: 'Added during import' })
    const item = await repositories.schedule.create({
      title: 'Added during import',
      start_time: '08:00',
      end_time: '09:00',
      days: [0],
    })
    const edited = { ...stored, text: 'Edited during import' }
    await db.dailyIntentions.put(edited)
    finish()
    await expect(importing).resolves.toBe(true)
    expect(await repositories.todos.listAll()).toEqual([todo])
    expect(await repositories.schedule.listItems()).toEqual([item])
    expect(await db.dailyIntentions.toArray()).toEqual([edited])
  })

  it('retains to-do and schedule changes made while a mixed plan imports', async () => {
    const repositories = guest()
    const todo = await repositories.todos.create({ title: 'Snapshot task' })
    const item = await repositories.schedule.create({
      title: 'Snapshot schedule',
      start_time: '08:00',
      end_time: '09:00',
      starts_on: '2026-11-01',
      days: [3],
    })
    await db.dailyIntentions.put(stored)
    let finish!: () => void
    let start!: () => void
    const requestPending = new Promise<void>((resolve) => {
      finish = resolve
    })
    const started = new Promise<void>((resolve) => {
      start = resolve
    })
    server.use(
      http.post(`${API}/import`, async () => {
        start()
        await requestPending
        return HttpResponse.json({ data: { daily_intentions: { created: 1, skipped: 0 } } })
      }),
    )
    const importing = saveGuestPlan(repositories, accountDataApi)
    await started
    await repositories.todos.setDone(todo.id, true)
    const other = await repositories.todos.create({ title: 'New task' })
    await repositories.schedule.setCheckin(item.id, stored.date, true)
    finish()
    await expect(importing).resolves.toBe(true)
    expect(await repositories.todos.listAll()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: todo.id, done_at: expect.any(String) }),
        other,
      ]),
    )
    expect(await repositories.schedule.listItems()).toEqual([item])
    expect(await repositories.schedule.listCheckins()).toEqual([
      expect.objectContaining({ schedule_item_id: item.id, date: stored.date }),
    ])
    expect(await db.dailyIntentions.count()).toBe(0)
  })

  it('caps chunks at 1000 and retains the entire plan after a later chunk fails', async () => {
    const rows = Array.from({ length: 1001 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
      text: `Plan ${index}`,
    }))
    await db.table('dailyIntentions').bulkAdd(rows)
    const sizes: number[] = []
    const serverDates = new Set<string>()
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        const { daily_intentions } = (await request.json()) as { daily_intentions: typeof rows }
        sizes.push(daily_intentions.length)
        if (sizes.length === 2) return HttpResponse.json({ message: 'Rejected' }, { status: 422 })
        const priorSize = serverDates.size
        for (const row of daily_intentions) serverDates.add(row.date)
        const created = serverDates.size - priorSize
        return HttpResponse.json({
          data: { daily_intentions: { created, skipped: daily_intentions.length - created } },
        })
      }),
    )
    await expect(saveGuestPlan(guest(), accountDataApi)).rejects.toMatchObject({ status: 422 })
    expect(sizes).toEqual([1000, 1])
    expect(serverDates.size).toBe(1000)
    expect(await db.table('dailyIntentions').toArray()).toEqual(rows)
    await expect(saveGuestPlan(guest(), accountDataApi)).resolves.toBe(true)
    expect(sizes).toEqual([1000, 1, 1000, 1])
    expect(serverDates.size).toBe(1001)
    expect(await db.table('dailyIntentions').count()).toBe(0)
  })
})
