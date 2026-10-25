import 'fake-indexeddb/auto'
import { MAX_SCHEDULE_ITEMS, type CreateScheduleItemInput } from '@/features/schedule/types'
import { TITLE_MAX_LENGTH } from '@/features/todos/types'
import { GuestDatabase } from './db'
import { NotFoundError, ValidationError } from './errors'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { ServerScheduleRepository } from './ServerScheduleRepository'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

// 2026-10-19 is a Monday.
const MONDAY = '2026-10-19'
const TUESDAY = '2026-10-20'

let db: GuestDatabase
let clock: Date
let repo: GuestScheduleRepository

function input(overrides: Partial<CreateScheduleItemInput> = {}): CreateScheduleItemInput {
  return {
    title: 'Class',
    category: 'study',
    start_time: '09:00',
    end_time: '10:00',
    days: [0, 1, 2, 3, 4],
    starts_on: '2026-10-01',
    ...overrides,
  }
}

beforeEach(() => {
  db = new GuestDatabase(`test-${crypto.randomUUID()}`)
  clock = new Date(2026, 9, 24, 8, 0, 0)
  repo = new GuestScheduleRepository({ db, now: () => clock })
})

afterEach(async () => {
  await db.delete()
})

describe('GuestScheduleRepository create', () => {
  it('creates an item with a client UUID, trimmed title and defaults', async () => {
    const item = await repo.createItem({
      title: '  Class  ',
      start_time: '09:00',
      end_time: '10:00',
      days: [4, 0, 0, 2],
    })
    expect(item).toEqual({
      id: expect.stringMatching(UUID_V4),
      title: 'Class',
      category: 'other',
      start_time: '09:00',
      end_time: '10:00',
      days: [0, 2, 4],
      starts_on: '2026-10-24',
      ends_on: null,
      created_at: clock.toISOString(),
      updated_at: clock.toISOString(),
    })
    expect(await db.schedule_items.get(item.id)).toEqual(item)
    expect(await repo.listItems()).toEqual([item])
  })

  it('rejects an empty or too long title', async () => {
    await expect(repo.createItem(input({ title: '   ' }))).rejects.toMatchObject({ field: 'title' })
    await expect(
      repo.createItem(input({ title: 'x'.repeat(TITLE_MAX_LENGTH + 1) })),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(await repo.createItem(input({ title: 'x'.repeat(TITLE_MAX_LENGTH) }))).toBeDefined()
  })

  it('requires start_time before end_time', async () => {
    const bad = { field: 'end_time' }
    await expect(repo.createItem(input({ end_time: '09:00' }))).rejects.toMatchObject(bad)
    await expect(
      repo.createItem(input({ start_time: '10:00', end_time: '09:00' })),
    ).rejects.toMatchObject(bad)
    expect(await repo.createItem(input({ end_time: '09:01' }))).toBeDefined()
  })

  it('rejects malformed times', async () => {
    await expect(repo.createItem(input({ start_time: '9:00' }))).rejects.toMatchObject({
      field: 'start_time',
    })
    await expect(repo.createItem(input({ end_time: '25:00' }))).rejects.toMatchObject({
      field: 'end_time',
    })
  })

  it('requires at least one valid day', async () => {
    await expect(repo.createItem(input({ days: [] }))).rejects.toMatchObject({ field: 'days' })
    await expect(repo.createItem(input({ days: [7] }))).rejects.toMatchObject({ field: 'days' })
    await expect(repo.createItem(input({ days: [-1] }))).rejects.toMatchObject({ field: 'days' })
    await expect(repo.createItem(input({ days: [1.5] }))).rejects.toMatchObject({ field: 'days' })
  })

  it('rejects an unknown category and bad dates', async () => {
    await expect(repo.createItem(input({ category: 'nope' as never }))).rejects.toMatchObject({
      field: 'category',
    })
    await expect(repo.createItem(input({ starts_on: '2026-02-30' }))).rejects.toMatchObject({
      field: 'starts_on',
    })
    await expect(
      repo.createItem(input({ starts_on: '2026-10-10', ends_on: '2026-10-09' })),
    ).rejects.toMatchObject({ field: 'ends_on' })
  })

  it('allows 100 items and refuses the 101st', async () => {
    await db.schedule_items.bulkAdd(
      Array.from({ length: MAX_SCHEDULE_ITEMS }, (_, i) => ({
        id: `item-${i}`,
        title: 'x',
        category: 'other' as const,
        start_time: '09:00',
        end_time: '10:00',
        days: [0],
        starts_on: '2026-10-01',
        ends_on: null,
        created_at: clock.toISOString(),
        updated_at: clock.toISOString(),
      })),
    )
    await expect(repo.createItem(input())).rejects.toBeInstanceOf(ValidationError)
    expect(await db.schedule_items.count()).toBe(MAX_SCHEDULE_ITEMS)
  })
})

describe('GuestScheduleRepository occurrences', () => {
  it('lists occurrences for a date, earliest first', async () => {
    await repo.createItem(input({ title: 'Gym', start_time: '14:00', end_time: '15:00' }))
    await repo.createItem(input())
    const day = await repo.listForDate(MONDAY)
    expect(day.map((o) => [o.title, o.start_time])).toEqual([
      ['Class', '09:00'],
      ['Gym', '14:00'],
    ])
    expect(await repo.listForDate('2026-10-24')).toEqual([])
  })

  it('lists seven days from the start date', async () => {
    await repo.createItem(input({ days: [0, 2] }))
    const week = await repo.listForWeek(MONDAY)
    expect(week).toHaveLength(7)
    expect(week.map((d) => d.length)).toEqual([1, 0, 1, 0, 0, 0, 0])
    expect(week[2]?.[0]?.date).toBe('2026-10-21')
  })

  it('walks a week across a month and year end', async () => {
    await repo.createItem(input({ days: [0, 1, 2, 3, 4, 5, 6], starts_on: '2026-12-01' }))
    const week = await repo.listForWeek('2026-12-29')
    expect(week.map((d) => d[0]?.date)).toEqual([
      '2026-12-29',
      '2026-12-30',
      '2026-12-31',
      '2027-01-01',
      '2027-01-02',
      '2027-01-03',
      '2027-01-04',
    ])
  })

  it('reports Now and Next at a given time', async () => {
    await repo.createItem(input())
    await repo.createItem(input({ title: 'Gym', start_time: '14:00', end_time: '15:00' }))
    const during = await repo.nowAndNext(MONDAY, '09:30')
    expect([during.now?.title, during.next?.title]).toEqual(['Class', 'Gym'])
    const after = await repo.nowAndNext(MONDAY, '15:00')
    expect(after).toEqual({ now: null, next: null })
    await expect(repo.nowAndNext(MONDAY, '9:30')).rejects.toMatchObject({ field: 'time' })
  })

  it('rejects malformed dates', async () => {
    await expect(repo.listForDate('2026-1-1')).rejects.toBeInstanceOf(ValidationError)
    await expect(repo.listForWeek('nope')).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('GuestScheduleRepository all repeats (docs/08 rule 5)', () => {
  it('edits the item itself, so every date changes', async () => {
    const item = await repo.createItem(input())
    clock = new Date(2026, 9, 25, 8, 0, 0)
    const updated = await repo.updateItem(item.id, {
      title: 'Lecture',
      start_time: '10:00',
      end_time: '11:30',
      days: [1, 3],
      category: 'work',
    })
    expect(updated).toMatchObject({
      title: 'Lecture',
      start_time: '10:00',
      end_time: '11:30',
      days: [1, 3],
      category: 'work',
      created_at: item.created_at,
      updated_at: clock.toISOString(),
    })
    expect(await repo.listForDate(MONDAY)).toEqual([])
    expect((await repo.listForDate(TUESDAY))[0]).toMatchObject({ title: 'Lecture' })
  })

  it('validates the merged item, not just the patch', async () => {
    const item = await repo.createItem(input())
    await expect(repo.updateItem(item.id, { start_time: '10:00' })).rejects.toMatchObject({
      field: 'end_time',
    })
    await expect(repo.updateItem(item.id, { days: [] })).rejects.toMatchObject({ field: 'days' })
    await expect(repo.updateItem(item.id, { title: ' ' })).rejects.toMatchObject({ field: 'title' })
    await expect(repo.updateItem(item.id, { ends_on: '2026-09-30' })).rejects.toMatchObject({
      field: 'ends_on',
    })
    expect(await db.schedule_items.get(item.id)).toEqual(item)
  })

  it('can end and reopen a repeat with ends_on', async () => {
    const item = await repo.createItem(input())
    await repo.updateItem(item.id, { ends_on: '2026-10-19' })
    expect(await repo.listForDate(MONDAY)).toHaveLength(1)
    expect(await repo.listForDate(TUESDAY)).toEqual([])
    await repo.updateItem(item.id, { ends_on: null })
    expect(await repo.listForDate(TUESDAY)).toHaveLength(1)
  })

  it('throws NotFoundError for an unknown item', async () => {
    await expect(repo.updateItem('missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError)
  })

  it('deletes the item with its exceptions and check-ins, and nothing else', async () => {
    const gone = await repo.createItem(input())
    const kept = await repo.createItem(input({ title: 'Gym' }))
    for (const id of [gone.id, kept.id]) {
      await repo.skipDate(id, TUESDAY)
      await repo.setCheckin(id, MONDAY, true)
    }
    await repo.deleteItem(gone.id)
    expect((await repo.listItems()).map((i) => i.id)).toEqual([kept.id])
    expect(await db.schedule_exceptions.toArray()).toHaveLength(1)
    expect(await db.schedule_checkins.toArray()).toHaveLength(1)
    expect((await db.schedule_exceptions.toArray())[0]?.schedule_item_id).toBe(kept.id)
  })

  it('ignores deleting an unknown item', async () => {
    await expect(repo.deleteItem('missing')).resolves.toBeUndefined()
  })
})

describe('GuestScheduleRepository only one date (docs/08 rule 5)', () => {
  it('skips one date and leaves the others', async () => {
    const item = await repo.createItem(input())
    await repo.skipDate(item.id, TUESDAY)
    expect(await repo.listForDate(TUESDAY)).toEqual([])
    expect(await repo.listForDate(MONDAY)).toHaveLength(1)
    expect(await repo.listForDate('2026-10-27')).toHaveLength(1)
  })

  it('overrides title and times for one date only', async () => {
    const item = await repo.createItem(input())
    await repo.setOverride(item.id, TUESDAY, {
      title: 'Exam',
      start_time: '13:00',
      end_time: '15:00',
    })
    expect((await repo.listForDate(TUESDAY))[0]).toMatchObject({
      title: 'Exam',
      start_time: '13:00',
      end_time: '15:00',
      overridden: true,
    })
    expect((await repo.listForDate(MONDAY))[0]).toMatchObject({ title: 'Class', overridden: false })
  })

  it('keeps one exception per item and date: a new one replaces the old', async () => {
    const item = await repo.createItem(input())
    await repo.setOverride(item.id, TUESDAY, { title: 'Exam' })
    await repo.skipDate(item.id, TUESDAY)
    await repo.setOverride(item.id, TUESDAY, { title: 'Quiz' })
    const rows = await db.schedule_exceptions.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ type: 'override', title: 'Quiz' })
    expect((await repo.listForDate(TUESDAY))[0]?.title).toBe('Quiz')
  })

  it('validates an override against the item times', async () => {
    const item = await repo.createItem(input())
    await expect(repo.setOverride(item.id, TUESDAY, { end_time: '08:00' })).rejects.toMatchObject({
      field: 'end_time',
    })
    await expect(repo.setOverride(item.id, TUESDAY, { title: ' ' })).rejects.toMatchObject({
      field: 'title',
    })
    await expect(repo.setOverride(item.id, '2026-1-1', { title: 'x' })).rejects.toMatchObject({
      field: 'date',
    })
    expect(await db.schedule_exceptions.count()).toBe(0)
  })

  it('restores a skipped or overridden date', async () => {
    const item = await repo.createItem(input())
    await repo.skipDate(item.id, TUESDAY)
    await repo.restoreDate(item.id, TUESDAY)
    expect(await repo.listForDate(TUESDAY)).toHaveLength(1)
    await repo.setOverride(item.id, TUESDAY, { title: 'Exam' })
    await repo.restoreDate(item.id, TUESDAY)
    expect((await repo.listForDate(TUESDAY))[0]?.title).toBe('Class')
  })

  it('throws NotFoundError for an unknown item', async () => {
    await expect(repo.skipDate('missing', TUESDAY)).rejects.toBeInstanceOf(NotFoundError)
    await expect(repo.setOverride('missing', TUESDAY, { title: 'x' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})

describe('GuestScheduleRepository check-ins (docs/08 rule 7)', () => {
  it('marks one occurrence done and undoes it', async () => {
    const item = await repo.createItem(input())
    await repo.setCheckin(item.id, MONDAY, true)
    expect((await repo.listForDate(MONDAY))[0]?.done).toBe(true)
    expect((await repo.listForDate(TUESDAY))[0]?.done).toBe(false)
    const [row] = await db.schedule_checkins.toArray()
    expect(row).toEqual({
      id: expect.stringMatching(UUID_V4),
      schedule_item_id: item.id,
      date: MONDAY,
      done_at: clock.toISOString(),
    })
    await repo.setCheckin(item.id, MONDAY, false)
    expect((await repo.listForDate(MONDAY))[0]?.done).toBe(false)
    expect(await db.schedule_checkins.count()).toBe(0)
  })

  it('is idempotent: checking in twice keeps one row and the first time', async () => {
    const item = await repo.createItem(input())
    await repo.setCheckin(item.id, MONDAY, true)
    const first = clock.toISOString()
    clock = new Date(2026, 9, 24, 9, 0, 0)
    await repo.setCheckin(item.id, MONDAY, true)
    const rows = await db.schedule_checkins.toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0]?.done_at).toBe(first)
  })

  it('undoing a check-in that does not exist is fine', async () => {
    const item = await repo.createItem(input())
    await expect(repo.setCheckin(item.id, MONDAY, false)).resolves.toBeUndefined()
  })

  it('throws NotFoundError when checking in an unknown item', async () => {
    await expect(repo.setCheckin('missing', MONDAY, true)).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('persistence', () => {
  it('keeps schedule data when the database is reopened', async () => {
    const item = await repo.createItem(input())
    await repo.skipDate(item.id, TUESDAY)
    await repo.setCheckin(item.id, MONDAY, true)
    db.close()
    const reopened = new GuestScheduleRepository({
      db: new GuestDatabase(db.name),
      now: () => clock,
    })
    expect((await reopened.listForDate(MONDAY))[0]?.done).toBe(true)
    expect(await reopened.listForDate(TUESDAY)).toEqual([])
    db = new GuestDatabase(db.name)
  })
})

describe('ServerScheduleRepository stub', () => {
  it('rejects every call until the account tasks land', async () => {
    const server = new ServerScheduleRepository()
    await expect(server.listItems()).rejects.toThrow('not implemented')
    await expect(server.listForDate()).rejects.toThrow('not implemented')
    await expect(server.listForWeek()).rejects.toThrow('not implemented')
    await expect(server.nowAndNext()).rejects.toThrow('not implemented')
    await expect(server.createItem()).rejects.toThrow('not implemented')
    await expect(server.updateItem()).rejects.toThrow('not implemented')
    await expect(server.deleteItem()).rejects.toThrow('not implemented')
    await expect(server.setOverride()).rejects.toThrow('not implemented')
    await expect(server.skipDate()).rejects.toThrow('not implemented')
    await expect(server.restoreDate()).rejects.toThrow('not implemented')
    await expect(server.setCheckin()).rejects.toThrow('not implemented')
  })
})
