import 'fake-indexeddb/auto'
import { MAX_SCHEDULE_ITEMS, type CreateScheduleItemInput } from '@/features/schedule/types'
import { GuestDatabase } from './db'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { NotFoundError, ValidationError } from './errors'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
// 2026-10-26 is a Monday.
const MON = '2026-10-26'
const TUE = '2026-10-27'

let db: GuestDatabase
let clock: Date
let repo: GuestScheduleRepository

const input = (overrides: Partial<CreateScheduleItemInput> = {}): CreateScheduleItemInput => ({
  title: 'Math class',
  start_time: '09:00',
  end_time: '10:00',
  days: [0, 2],
  starts_on: '2026-10-01',
  ...overrides,
})

const invalid = (field: string) =>
  expect.objectContaining({ name: 'ValidationError', field }) as unknown as Error

beforeEach(() => {
  db = new GuestDatabase(`test-${crypto.randomUUID()}`)
  clock = new Date('2026-10-24T08:00:00.000Z')
  repo = new GuestScheduleRepository({ db, now: () => clock })
})

afterEach(async () => {
  await db.delete()
})

describe('GuestScheduleRepository create (docs/08 rule 11)', () => {
  it('creates an item with a client UUID, trimmed title, sorted days and defaults', async () => {
    const item = await repo.create(input({ title: '  Math class ', days: [2, 0, 2] }))
    expect(item).toEqual({
      id: expect.stringMatching(UUID_V4),
      title: 'Math class',
      category: 'other',
      start_time: '09:00',
      end_time: '10:00',
      days: [0, 2],
      starts_on: '2026-10-01',
      ends_on: null,
      created_at: '2026-10-24T08:00:00.000Z',
      updated_at: '2026-10-24T08:00:00.000Z',
    })
    expect(await repo.listItems()).toEqual([item])
  })

  it('starts today by default', async () => {
    const item = await repo.create(input({ starts_on: undefined }))
    expect(item.starts_on).toBe('2026-10-24')
  })

  it('survives a database reopen', async () => {
    const item = await repo.create(input())
    db.close()
    const reopened = new GuestScheduleRepository({
      db: new GuestDatabase(db.name),
      now: () => clock,
    })
    expect(await reopened.listItems()).toEqual([item])
  })

  it.each(['', '   ', 'x'.repeat(201)])('rejects the title %j', async (title) => {
    await expect(repo.create(input({ title }))).rejects.toThrow(invalid('title'))
  })

  it('accepts a 200 character title', async () => {
    await expect(repo.create(input({ title: 'x'.repeat(200) }))).resolves.toBeDefined()
  })

  it('rejects start_time equal to or after end_time', async () => {
    await expect(repo.create(input({ start_time: '10:00', end_time: '10:00' }))).rejects.toThrow(
      invalid('end_time'),
    )
    await expect(repo.create(input({ start_time: '11:00', end_time: '10:00' }))).rejects.toThrow(
      invalid('end_time'),
    )
  })

  it.each(['9:00', '24:00', '09:60', 'ab:cd', ''])('rejects the time %j', async (time) => {
    await expect(repo.create(input({ start_time: time }))).rejects.toThrow(invalid('start_time'))
    await expect(repo.create(input({ end_time: time }))).rejects.toThrow(invalid('end_time'))
  })

  it('rejects empty days and days outside 0 to 6', async () => {
    await expect(repo.create(input({ days: [] }))).rejects.toThrow(invalid('days'))
    await expect(repo.create(input({ days: [7 as never] }))).rejects.toThrow(invalid('days'))
    await expect(repo.create(input({ days: [-1 as never] }))).rejects.toThrow(invalid('days'))
  })

  it('rejects an unknown category and bad dates', async () => {
    await expect(repo.create(input({ category: 'party' as never }))).rejects.toThrow(
      invalid('category'),
    )
    await expect(repo.create(input({ starts_on: '2026-02-30' }))).rejects.toThrow(
      invalid('starts_on'),
    )
    await expect(repo.create(input({ ends_on: 'soon' }))).rejects.toThrow(invalid('ends_on'))
    await expect(repo.create(input({ ends_on: '2026-09-30' }))).rejects.toThrow(invalid('ends_on'))
  })

  it('refuses the 101st item and stores nothing extra', async () => {
    for (let n = 0; n < MAX_SCHEDULE_ITEMS; n += 1) await repo.create(input({ title: `Item ${n}` }))
    await expect(repo.create(input())).rejects.toBeInstanceOf(ValidationError)
    expect(await db.schedule_items.count()).toBe(MAX_SCHEDULE_ITEMS)
  })
})

describe('GuestScheduleRepository update ("All repeats", docs/08 rule 5)', () => {
  it('changes the item, so every occurrence changes', async () => {
    const item = await repo.create(input({ days: [0, 1] }))
    clock = new Date('2026-10-25T08:00:00.000Z')
    const updated = await repo.update(item.id, {
      title: 'Physics',
      end_time: '10:30',
      days: [1, 0],
    })
    expect(updated).toMatchObject({
      title: 'Physics',
      end_time: '10:30',
      days: [0, 1],
      updated_at: '2026-10-25T08:00:00.000Z',
    })
    for (const date of [MON, TUE]) {
      expect(await repo.listForDate(date)).toMatchObject([{ title: 'Physics', end_time: '10:30' }])
    }
  })

  it('validates the merged result', async () => {
    const item = await repo.create(input())
    await expect(repo.update(item.id, { start_time: '10:00' })).rejects.toThrow(invalid('end_time'))
    await expect(repo.update(item.id, { days: [] })).rejects.toThrow(invalid('days'))
    await expect(repo.update(item.id, { title: ' ' })).rejects.toThrow(invalid('title'))
    await expect(repo.update(item.id, { ends_on: '2026-09-01' })).rejects.toThrow(
      invalid('ends_on'),
    )
    expect((await repo.listItems())[0]).toEqual(item)
  })

  it('can set and clear ends_on', async () => {
    const item = await repo.create(input({ days: [0] }))
    await repo.update(item.id, { ends_on: '2026-10-26' })
    expect(await repo.listForDate('2026-11-02')).toEqual([])
    await repo.update(item.id, { ends_on: null })
    expect(await repo.listForDate('2026-11-02')).toHaveLength(1)
  })

  it('throws NotFoundError for an unknown id', async () => {
    await expect(repo.update('missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError)
  })
})

describe('GuestScheduleRepository exceptions ("Only today", docs/08 rule 5)', () => {
  it('skip removes only that date', async () => {
    const item = await repo.create(input({ days: [0] }))
    const skip = await repo.setException(item.id, MON, { type: 'skip' })
    expect(skip).toEqual({
      id: expect.stringMatching(UUID_V4),
      schedule_item_id: item.id,
      date: MON,
      type: 'skip',
      title: null,
      start_time: null,
      end_time: null,
    })
    expect(await repo.listForDate(MON)).toEqual([])
    expect(await repo.listForDate('2026-11-02')).toHaveLength(1)
  })

  it('override changes that date only', async () => {
    const item = await repo.create(input({ days: [0] }))
    await repo.setException(item.id, MON, { type: 'override', title: 'Exam', start_time: '08:00' })
    expect(await repo.listForDate(MON)).toMatchObject([
      { title: 'Exam', start_time: '08:00', end_time: '10:00', overridden: true },
    ])
    expect(await repo.listForDate('2026-11-02')).toMatchObject([
      { title: 'Math class', start_time: '09:00', overridden: false },
    ])
  })

  it('keeps one exception per item and date: the second replaces the first', async () => {
    const item = await repo.create(input({ days: [0] }))
    const first = await repo.setException(item.id, MON, { type: 'skip' })
    const second = await repo.setException(item.id, MON, { type: 'override', title: 'Exam' })
    expect(second.id).toBe(first.id)
    expect(await db.schedule_exceptions.count()).toBe(1)
    expect(await repo.listForDate(MON)).toMatchObject([{ title: 'Exam' }])
  })

  it('rejects an empty override and an override that ends before it starts', async () => {
    const item = await repo.create(input({ days: [0] }))
    await expect(repo.setException(item.id, MON, { type: 'override' })).rejects.toThrow(
      invalid('type'),
    )
    await expect(
      repo.setException(item.id, MON, { type: 'override', start_time: '10:30' }),
    ).rejects.toThrow(invalid('end_time'))
    await expect(repo.setException(item.id, MON, { type: 'override', title: ' ' })).rejects.toThrow(
      invalid('title'),
    )
    expect(await db.schedule_exceptions.count()).toBe(0)
  })

  it('rejects a date on which the item does not occur, and a bad date', async () => {
    const item = await repo.create(input({ days: [0] }))
    await expect(repo.setException(item.id, TUE, { type: 'skip' })).rejects.toThrow(invalid('date'))
    await expect(repo.setException(item.id, 'nope', { type: 'skip' })).rejects.toThrow(
      invalid('date'),
    )
  })

  it('throws NotFoundError for an unknown item', async () => {
    await expect(repo.setException('missing', MON, { type: 'skip' })).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })

  it('removeException restores the day, and does nothing when there is none', async () => {
    const item = await repo.create(input({ days: [0] }))
    await repo.setException(item.id, MON, { type: 'skip' })
    await repo.removeException(item.id, MON)
    expect(await repo.listForDate(MON)).toHaveLength(1)
    await expect(repo.removeException(item.id, MON)).resolves.toBeUndefined()
  })
})

describe('GuestScheduleRepository check-ins (docs/08 rule 7)', () => {
  it('marks one occurrence done and undoes it', async () => {
    const item = await repo.create(input({ days: [0] }))
    await repo.setCheckin(item.id, MON, true)
    expect((await repo.listForDate(MON))[0]?.done).toBe(true)
    expect((await repo.listForDate('2026-11-02'))[0]?.done).toBe(false)
    await repo.setCheckin(item.id, MON, false)
    expect((await repo.listForDate(MON))[0]?.done).toBe(false)
  })

  it('is idempotent: checking twice keeps one row and the first time', async () => {
    const item = await repo.create(input({ days: [0] }))
    await repo.setCheckin(item.id, MON, true)
    const [first] = await db.schedule_checkins.toArray()
    clock = new Date('2026-10-26T12:00:00.000Z')
    await repo.setCheckin(item.id, MON, true)
    expect(await db.schedule_checkins.toArray()).toEqual([first])
    expect(first).toMatchObject({
      id: expect.stringMatching(UUID_V4),
      schedule_item_id: item.id,
      date: MON,
      done_at: '2026-10-24T08:00:00.000Z',
    })
  })

  it('rejects a date on which the item does not occur, a skipped day still counts as valid date', async () => {
    const item = await repo.create(input({ days: [0] }))
    await expect(repo.setCheckin(item.id, TUE, true)).rejects.toThrow(invalid('date'))
    await expect(repo.setCheckin('missing', MON, true)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('undo on a missing check-in does nothing', async () => {
    const item = await repo.create(input({ days: [0] }))
    await expect(repo.setCheckin(item.id, MON, false)).resolves.toBeUndefined()
  })
})

describe('GuestScheduleRepository delete (docs/08 rule 5)', () => {
  it('removes the item with its exceptions and check-ins, and leaves other items alone', async () => {
    const doomed = await repo.create(input({ days: [0] }))
    const kept = await repo.create(input({ title: 'Gym', days: [0] }))
    await repo.setException(doomed.id, MON, { type: 'override', title: 'Exam' })
    await repo.setCheckin(doomed.id, MON, true)
    await repo.setException(kept.id, MON, { type: 'override', title: 'Run' })
    await repo.setCheckin(kept.id, MON, true)

    await repo.delete(doomed.id)

    expect((await repo.listItems()).map((i) => i.id)).toEqual([kept.id])
    expect(await db.schedule_exceptions.toArray()).toMatchObject([{ schedule_item_id: kept.id }])
    expect(await db.schedule_checkins.toArray()).toMatchObject([{ schedule_item_id: kept.id }])
  })

  it('does not fail for an unknown id', async () => {
    await expect(repo.delete('missing')).resolves.toBeUndefined()
  })
})

describe('GuestScheduleRepository listForDate', () => {
  it('returns occurrences sorted by start time', async () => {
    await repo.create(input({ title: 'Late', start_time: '15:00', end_time: '16:00', days: [0] }))
    await repo.create(input({ title: 'Early', start_time: '07:00', end_time: '08:00', days: [0] }))
    expect((await repo.listForDate(MON)).map((o) => o.title)).toEqual(['Early', 'Late'])
  })

  it('does not touch the to-do store', async () => {
    await repo.create(input())
    expect(await db.todos.count()).toBe(0)
  })
})
