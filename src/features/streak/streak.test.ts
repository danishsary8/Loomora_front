import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { Todo } from '@/features/todos/types'
import { computeStreak, type StreakInput } from './streak'

// 2026-10-26 is a Monday. Days used: 22 (Thu), 23, 24, 25, 26 = today.
const TODAY = '2026-10-26'
const UTC = 'UTC'

function todo(id: string, patch: Partial<Todo> = {}): Todo {
  return {
    id,
    title: id,
    category: 'other',
    due_date: null,
    done_at: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...patch,
  }
}

/** A to-do due on `day` and checked off at noon the same day. */
const doneOn = (id: string, day: string) =>
  todo(id, { due_date: day, done_at: `${day}T12:00:00.000Z` })

/** A to-do due on `day` and not done. */
const missedOn = (id: string, day: string) => todo(id, { due_date: day })

function item(id: string, patch: Partial<ScheduleItem> = {}): ScheduleItem {
  return {
    id,
    title: id,
    category: 'other',
    start_time: '09:00',
    end_time: '10:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    starts_on: '2026-10-01',
    ends_on: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    ...patch,
  }
}

function checkin(itemId: string, date: string): ScheduleCheckin {
  return {
    id: `${itemId}-${date}`,
    schedule_item_id: itemId,
    date,
    done_at: `${date}T12:00:00.000Z`,
  }
}

function streak(patch: Partial<StreakInput>) {
  return computeStreak({
    todos: [],
    items: [],
    exceptions: [],
    checkins: [],
    today: TODAY,
    timeZone: UTC,
    ...patch,
  })
}

describe('computeStreak (docs/08 rule 8)', () => {
  it('is 0 with no data', () => {
    expect(streak({})).toEqual({ count: 0, todayCounted: false })
  })

  it('counts today once something is checked off', () => {
    expect(streak({ todos: [doneOn('a', TODAY)] })).toEqual({ count: 1, todayCounted: true })
  })

  it('adds one per consecutive counted day', () => {
    const todos = [doneOn('a', '2026-10-24'), doneOn('b', '2026-10-25'), doneOn('c', TODAY)]
    expect(streak({ todos })).toEqual({ count: 3, todayCounted: true })
  })

  it('does not judge today: an unchecked today keeps yesterday’s streak', () => {
    const todos = [doneOn('a', '2026-10-25'), missedOn('b', TODAY)]
    expect(streak({ todos })).toEqual({ count: 1, todayCounted: false })
  })

  it('counts one check-off a day no matter how many', () => {
    const todos = [doneOn('a', TODAY), doneOn('b', TODAY), doneOn('c', TODAY)]
    expect(streak({ todos }).count).toBe(1)
  })

  it('breaks on a planned day with no check-off', () => {
    const todos = [doneOn('a', '2026-10-23'), missedOn('b', '2026-10-24'), doneOn('c', TODAY)]
    expect(streak({ todos })).toEqual({ count: 1, todayCounted: true })
  })

  it('is 0 when yesterday was planned and missed and today has nothing yet', () => {
    expect(streak({ todos: [missedOn('a', '2026-10-25')] })).toEqual({
      count: 0,
      todayCounted: false,
    })
  })

  it('skips a day with nothing planned', () => {
    const todos = [doneOn('a', '2026-10-24'), doneOn('b', TODAY)]
    expect(streak({ todos }).count).toBe(2)
  })

  it('does not count a skipped day itself', () => {
    const todos = [doneOn('a', '2026-10-22'), doneOn('b', TODAY)]
    expect(streak({ todos }).count).toBe(2)
  })

  it('counts a checked-off day even if nothing was due', () => {
    const undated = todo('a', { done_at: '2026-10-25T09:00:00.000Z' })
    expect(streak({ todos: [undated, doneOn('b', TODAY)] }).count).toBe(2)
  })

  describe('schedule items', () => {
    it('counts a day with a schedule check-in', () => {
      const items = [item('s', { days: [0, 6] })]
      expect(
        streak({ items, checkins: [checkin('s', '2026-10-25'), checkin('s', TODAY)] }).count,
      ).toBe(2)
    })

    it('breaks on a planned occurrence that was not checked off', () => {
      const items = [item('s', { days: [0, 5, 6] })]
      const checkins = [checkin('s', '2026-10-24'), checkin('s', TODAY)]
      // Sunday the 25th has an occurrence and no check-in, so it breaks the streak.
      expect(streak({ items, checkins }).count).toBe(1)
    })

    it('skips days the item does not repeat on', () => {
      const items = [item('s', { days: [0, 5] })] // Monday and Saturday
      const checkins = [checkin('s', '2026-10-24'), checkin('s', TODAY)]
      expect(streak({ items, checkins }).count).toBe(2)
    })

    it('ignores a skipped occurrence', () => {
      const items = [item('s', { days: [0, 5, 6] })]
      const exceptions: ScheduleException[] = [
        {
          id: 'e',
          schedule_item_id: 's',
          date: '2026-10-25',
          type: 'skip',
          title: null,
          start_time: null,
          end_time: null,
        },
      ]
      const checkins = [checkin('s', '2026-10-24'), checkin('s', TODAY)]
      expect(streak({ items, exceptions, checkins }).count).toBe(2)
    })

    it('does not look before the item started', () => {
      const items = [item('s', { starts_on: '2026-10-25' })]
      const checkins = [checkin('s', '2026-10-25'), checkin('s', TODAY)]
      expect(streak({ items, checkins }).count).toBe(2)
    })
  })

  describe('time zone', () => {
    const lateNight = todo('a', { done_at: '2026-10-25T20:30:00.000Z' })

    it('puts a check-off on the local day in the user’s zone', () => {
      // 20:30 UTC is 03:30 on the 26th in Phnom Penh (UTC+7): that is today.
      expect(streak({ todos: [lateNight], timeZone: 'Asia/Phnom_Penh' })).toEqual({
        count: 1,
        todayCounted: true,
      })
    })

    it('keeps it on the earlier day in a zone behind UTC', () => {
      // Same instant is 13:30 on the 25th in Los Angeles: yesterday, today not counted.
      expect(streak({ todos: [lateNight], timeZone: 'America/Los_Angeles' })).toEqual({
        count: 1,
        todayCounted: false,
      })
    })
  })

  it('handles month and year boundaries', () => {
    const todos = [doneOn('a', '2026-12-31'), doneOn('b', '2027-01-01')]
    expect(streak({ todos, today: '2027-01-01' }).count).toBe(2)
  })
})
