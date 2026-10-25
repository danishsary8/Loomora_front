import { nowAndNext, occursOn, occurrencesForDate, weekdayOf } from './occurrences'
import type { Occurrence, ScheduleCheckin, ScheduleException, ScheduleItem, Weekday } from './types'

let seq = 0

function item(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  seq += 1
  return {
    id: `i${seq}`,
    title: `Item ${seq}`,
    category: 'study',
    start_time: '09:00',
    end_time: '10:00',
    days: [0, 1, 2, 3, 4],
    starts_on: '2026-01-01',
    ends_on: null,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function exception(
  schedule_item_id: string,
  date: string,
  overrides: Partial<ScheduleException> = {},
): ScheduleException {
  seq += 1
  return {
    id: `e${seq}`,
    schedule_item_id,
    date,
    type: 'skip',
    title: null,
    start_time: null,
    end_time: null,
    ...overrides,
  }
}

function checkin(schedule_item_id: string, date: string): ScheduleCheckin {
  seq += 1
  return { id: `c${seq}`, schedule_item_id, date, done_at: `${date}T08:00:00.000Z` }
}

// 2026-10-24 is a Saturday; 2026-10-26 is a Monday.
const SAT = '2026-10-24'
const MON = '2026-10-26'
const ids = (list: Occurrence[]) => list.map((o) => o.schedule_item_id)

describe('weekdayOf', () => {
  it.each<[string, Weekday]>([
    ['2026-10-26', 0],
    ['2026-10-27', 1],
    ['2026-10-24', 5],
    ['2026-10-25', 6],
    ['2026-03-29', 6],
  ])('%s is weekday %i (0 = Monday)', (date, expected) => {
    expect(weekdayOf(date)).toBe(expected)
  })
})

describe('occursOn (docs/08 rule 4)', () => {
  it('occurs on a listed weekday', () => {
    expect(occursOn(item({ days: [0] }), MON)).toBe(true)
  })

  it('does not occur on an unlisted weekday', () => {
    expect(occursOn(item({ days: [0] }), '2026-10-27')).toBe(false)
  })

  it('occurs on the starts_on date itself and not the day before', () => {
    const i = item({ days: [0, 1, 2, 3, 4, 5, 6], starts_on: MON })
    expect(occursOn(i, MON)).toBe(true)
    expect(occursOn(i, '2026-10-25')).toBe(false)
  })

  it('occurs on the ends_on date itself and not the day after', () => {
    const i = item({ days: [0, 1, 2, 3, 4, 5, 6], ends_on: MON })
    expect(occursOn(i, MON)).toBe(true)
    expect(occursOn(i, '2026-10-27')).toBe(false)
  })

  it('repeats forever when ends_on is null', () => {
    expect(occursOn(item({ days: [0], ends_on: null }), '2030-01-07')).toBe(true)
  })

  it('works across a daylight saving change (dates are plain calendar days)', () => {
    expect(occursOn(item({ days: [0] }), '2026-03-30')).toBe(true)
  })
})

describe('occurrencesForDate (docs/08 rules 4, 5, 7)', () => {
  it('returns only the items that occur on the date', () => {
    const weekday = item({ days: [0] })
    const other = item({ days: [1] })
    expect(ids(occurrencesForDate([weekday, other], [], [], MON))).toEqual([weekday.id])
  })

  it('copies title, category and times and starts not overridden and not done', () => {
    const i = item({ title: 'Math', category: 'study', days: [0] })
    expect(occurrencesForDate([i], [], [], MON)).toEqual([
      {
        schedule_item_id: i.id,
        date: MON,
        title: 'Math',
        category: 'study',
        start_time: '09:00',
        end_time: '10:00',
        overridden: false,
        done: false,
      },
    ])
  })

  it('removes the occurrence on a skip exception for that date only', () => {
    const i = item({ days: [0] })
    const skip = exception(i.id, MON)
    expect(occurrencesForDate([i], [skip], [], MON)).toEqual([])
    expect(ids(occurrencesForDate([i], [skip], [], '2026-11-02'))).toEqual([i.id])
  })

  it('replaces only the overridden fields on an override exception', () => {
    const i = item({ title: 'Math', start_time: '09:00', end_time: '10:00', days: [0] })
    const o = exception(i.id, MON, { type: 'override', title: 'Math exam', end_time: '11:30' })
    const [occ] = occurrencesForDate([i], [o], [], MON)
    expect(occ).toMatchObject({
      title: 'Math exam',
      start_time: '09:00',
      end_time: '11:30',
      overridden: true,
    })
  })

  it('does not apply an override to another date', () => {
    const i = item({ title: 'Math', days: [0] })
    const o = exception(i.id, MON, { type: 'override', title: 'Math exam' })
    const [occ] = occurrencesForDate([i], [o], [], '2026-11-02')
    expect(occ).toMatchObject({ title: 'Math', overridden: false })
  })

  it('ignores an exception that belongs to another item', () => {
    const a = item({ days: [0] })
    const b = item({ days: [0] })
    expect(ids(occurrencesForDate([a, b], [exception(a.id, MON)], [], MON))).toEqual([b.id])
  })

  it('marks an occurrence done when a check-in exists for that date', () => {
    const i = item({ days: [0] })
    expect(occurrencesForDate([i], [], [checkin(i.id, MON)], MON)[0]?.done).toBe(true)
  })

  it('does not mark done from a check-in on another date or for another item', () => {
    const a = item({ days: [0] })
    const b = item({ days: [0] })
    const list = occurrencesForDate([a], [], [checkin(a.id, '2026-10-19'), checkin(b.id, MON)], MON)
    expect(list[0]?.done).toBe(false)
  })

  it('sorts by start time, then end time, then id', () => {
    const late = item({ id: 'late', days: [0], start_time: '14:00', end_time: '15:00' })
    const longer = item({ id: 'b', days: [0], start_time: '08:00', end_time: '10:00' })
    const shorter = item({ id: 'z', days: [0], start_time: '08:00', end_time: '09:00' })
    const tie1 = item({ id: 'a1', days: [0], start_time: '12:00', end_time: '13:00' })
    const tie2 = item({ id: 'a2', days: [0], start_time: '12:00', end_time: '13:00' })
    expect(ids(occurrencesForDate([late, tie2, longer, tie1, shorter], [], [], MON))).toEqual([
      'z',
      'b',
      'a1',
      'a2',
      'late',
    ])
  })

  it('returns nothing on a day without items', () => {
    expect(occurrencesForDate([item({ days: [0] })], [], [], SAT)).toEqual([])
  })
})

describe('nowAndNext (docs/08 rule 6)', () => {
  function occ(id: string, start: string, end: string): Occurrence {
    return {
      schedule_item_id: id,
      date: SAT,
      title: id,
      category: 'other',
      start_time: start,
      end_time: end,
      overridden: false,
      done: false,
    }
  }
  const school = occ('school', '08:00', '12:00')
  const lunch = occ('lunch', '12:00', '13:00')
  const gym = occ('gym', '17:00', '18:00')
  const day = [gym, school, lunch]

  it('now is the occurrence containing the time, next is the first one after it', () => {
    const { now, next } = nowAndNext(day, '09:30')
    expect(now?.schedule_item_id).toBe('school')
    expect(next?.schedule_item_id).toBe('lunch')
  })

  it('counts the start time as inside and the end time as outside', () => {
    expect(nowAndNext(day, '08:00').now?.schedule_item_id).toBe('school')
    expect(nowAndNext(day, '11:59').now?.schedule_item_id).toBe('school')
    expect(nowAndNext(day, '12:00').now?.schedule_item_id).toBe('lunch')
    expect(nowAndNext(day, '13:00').now).toBeNull()
  })

  it('has no now in a gap but still shows next', () => {
    const { now, next } = nowAndNext(day, '14:00')
    expect(now).toBeNull()
    expect(next?.schedule_item_id).toBe('gym')
  })

  it('has no now before the first occurrence', () => {
    const { now, next } = nowAndNext(day, '06:00')
    expect(now).toBeNull()
    expect(next?.schedule_item_id).toBe('school')
  })

  it('has no next after the last occurrence starts', () => {
    const { now, next } = nowAndNext(day, '17:30')
    expect(now?.schedule_item_id).toBe('gym')
    expect(next).toBeNull()
  })

  it('has neither once the day is over', () => {
    expect(nowAndNext(day, '20:00')).toEqual({ now: null, next: null })
  })

  it('has neither on an empty day', () => {
    expect(nowAndNext([], '10:00')).toEqual({ now: null, next: null })
  })

  it('picks the earliest start as now when occurrences overlap, and next starts later', () => {
    const a = occ('a', '09:00', '11:00')
    const b = occ('b', '10:00', '12:00')
    const c = occ('c', '11:00', '12:00')
    const { now, next } = nowAndNext([c, b, a], '10:30')
    expect(now?.schedule_item_id).toBe('a')
    expect(next?.schedule_item_id).toBe('c')
  })

  it('does not change the order of the list it is given', () => {
    const input = [gym, school]
    nowAndNext(input, '09:00')
    expect(input).toEqual([gym, school])
  })
})
