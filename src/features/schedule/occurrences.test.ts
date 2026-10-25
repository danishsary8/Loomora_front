import { nowAndNext, occurrencesForDate, occursOn } from './occurrences'
import type { ScheduleCheckin, ScheduleException, ScheduleItem } from './types'

// 2026-10-19 is a Monday (0), 2026-10-24 a Saturday (5), 2026-10-25 a Sunday (6).
function item(overrides: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id: 'a',
    title: 'Class',
    category: 'study',
    start_time: '09:00',
    end_time: '10:00',
    days: [0, 1, 2, 3, 4],
    starts_on: '2026-10-01',
    ends_on: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...overrides,
  }
}

function exception(overrides: Partial<ScheduleException> = {}): ScheduleException {
  return {
    id: 'e1',
    schedule_item_id: 'a',
    date: '2026-10-21',
    type: 'skip',
    title: null,
    start_time: null,
    end_time: null,
    ...overrides,
  }
}

function checkin(overrides: Partial<ScheduleCheckin> = {}): ScheduleCheckin {
  return {
    id: 'c1',
    schedule_item_id: 'a',
    date: '2026-10-21',
    done_at: '2026-10-21T03:00:00.000Z',
    ...overrides,
  }
}

describe('occursOn (docs/08 rule 4)', () => {
  it('occurs on a listed weekday', () => {
    expect(occursOn(item(), '2026-10-19')).toBe(true) // Monday
    expect(occursOn(item(), '2026-10-23')).toBe(true) // Friday
  })

  it('does not occur on an unlisted weekday', () => {
    expect(occursOn(item(), '2026-10-24')).toBe(false) // Saturday
    expect(occursOn(item(), '2026-10-25')).toBe(false) // Sunday
  })

  it('starts on starts_on, not before', () => {
    const i = item({ starts_on: '2026-10-21' })
    expect(occursOn(i, '2026-10-20')).toBe(false)
    expect(occursOn(i, '2026-10-21')).toBe(true)
  })

  it('stops after ends_on, which is included', () => {
    const i = item({ ends_on: '2026-10-22' })
    expect(occursOn(i, '2026-10-22')).toBe(true)
    expect(occursOn(i, '2026-10-23')).toBe(false)
  })

  it('repeats every matching week until it ends', () => {
    const i = item({ days: [6] })
    expect(occursOn(i, '2026-10-25')).toBe(true)
    expect(occursOn(i, '2026-11-01')).toBe(true)
    expect(occursOn(i, '2026-11-02')).toBe(false)
  })
})

describe('occurrencesForDate', () => {
  it('returns an occurrence with the item data, not done', () => {
    expect(occurrencesForDate([item()], [], [], '2026-10-19')).toEqual([
      {
        schedule_item_id: 'a',
        date: '2026-10-19',
        title: 'Class',
        category: 'study',
        start_time: '09:00',
        end_time: '10:00',
        done: false,
        overridden: false,
      },
    ])
  })

  it('returns nothing on a day with no repeats', () => {
    expect(occurrencesForDate([item()], [], [], '2026-10-24')).toEqual([])
    expect(occurrencesForDate([], [], [], '2026-10-19')).toEqual([])
  })

  it('removes a skipped occurrence on that date only', () => {
    const skip = [exception({ date: '2026-10-21' })]
    expect(occurrencesForDate([item()], skip, [], '2026-10-21')).toEqual([])
    expect(occurrencesForDate([item()], skip, [], '2026-10-22')).toHaveLength(1)
  })

  it('replaces title and times with an override, for that date only', () => {
    const override = [
      exception({
        type: 'override',
        title: 'Exam',
        start_time: '13:00',
        end_time: '15:00',
      }),
    ]
    const [changed] = occurrencesForDate([item()], override, [], '2026-10-21')
    expect(changed).toMatchObject({
      title: 'Exam',
      start_time: '13:00',
      end_time: '15:00',
      category: 'study',
      overridden: true,
    })
    const [other] = occurrencesForDate([item()], override, [], '2026-10-22')
    expect(other).toMatchObject({ title: 'Class', start_time: '09:00', overridden: false })
  })

  it('keeps the item value for override fields left empty', () => {
    const override = [exception({ type: 'override', title: 'Moved', end_time: '11:00' })]
    const [o] = occurrencesForDate([item()], override, [], '2026-10-21')
    expect(o).toMatchObject({ title: 'Moved', start_time: '09:00', end_time: '11:00' })
  })

  it('ignores an exception that belongs to another item or date', () => {
    const others = [
      exception({ schedule_item_id: 'b' }),
      exception({ id: 'e2', date: '2026-10-20' }),
    ]
    expect(occurrencesForDate([item()], others, [], '2026-10-21')).toHaveLength(1)
  })

  it('marks an occurrence done only for the checked-in date (rule 7)', () => {
    const done = [checkin({ date: '2026-10-21' })]
    expect(occurrencesForDate([item()], [], done, '2026-10-21')[0]?.done).toBe(true)
    expect(occurrencesForDate([item()], [], done, '2026-10-22')[0]?.done).toBe(false)
  })

  it('ignores a check-in that belongs to another item', () => {
    const done = [checkin({ schedule_item_id: 'b' })]
    expect(occurrencesForDate([item()], [], done, '2026-10-21')[0]?.done).toBe(false)
  })

  it('sorts by start time, then end time, then id', () => {
    const items = [
      item({ id: 'late', start_time: '14:00', end_time: '15:00' }),
      item({ id: 'b', start_time: '09:00', end_time: '10:00' }),
      item({ id: 'a', start_time: '09:00', end_time: '10:00' }),
      item({ id: 'short', start_time: '09:00', end_time: '09:30' }),
    ]
    const ids = occurrencesForDate(items, [], [], '2026-10-19').map((o) => o.schedule_item_id)
    expect(ids).toEqual(['short', 'a', 'b', 'late'])
  })
})

describe('nowAndNext (docs/08 rule 6)', () => {
  const day = occurrencesForDate(
    [
      item({ id: 'a', title: 'Class', start_time: '09:00', end_time: '10:00' }),
      item({ id: 'b', title: 'Gym', start_time: '10:00', end_time: '11:00' }),
      item({ id: 'c', title: 'Study', start_time: '14:00', end_time: '16:00' }),
    ],
    [],
    [],
    '2026-10-19',
  )
  const titles = (time: string) => {
    const { now, next } = nowAndNext(day, time)
    return [now?.title ?? null, next?.title ?? null]
  }

  it('is Free with nothing before the first item', () => {
    expect(titles('08:00')).toEqual([null, 'Class'])
  })

  it('starts an item at its start time', () => {
    expect(titles('09:00')).toEqual(['Class', 'Gym'])
  })

  it('shows the current item and the following one', () => {
    expect(titles('09:59')).toEqual(['Class', 'Gym'])
  })

  it('ends an item at its end time and starts the next one', () => {
    expect(titles('10:00')).toEqual(['Gym', 'Study'])
  })

  it('is Free in a gap and points at the next item', () => {
    expect(titles('12:00')).toEqual([null, 'Study'])
  })

  it('has no Next during the last item', () => {
    expect(titles('15:30')).toEqual(['Study', null])
  })

  it('is Free with Nothing more today after the last item', () => {
    expect(titles('16:00')).toEqual([null, null])
  })

  it('is Free with Nothing more today on an empty day', () => {
    expect(nowAndNext([], '12:00')).toEqual({ now: null, next: null })
  })

  it('never counts a skipped occurrence as Now or Next', () => {
    const skipped = occurrencesForDate(
      [item({ id: 'a' }), item({ id: 'b', start_time: '10:00', end_time: '11:00' })],
      [exception({ schedule_item_id: 'a', date: '2026-10-19' })],
      [],
      '2026-10-19',
    )
    const { now, next } = nowAndNext(skipped, '08:00')
    expect(now).toBeNull()
    expect(next?.schedule_item_id).toBe('b')
  })
})
