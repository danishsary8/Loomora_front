import type { ScheduleItem, Weekday } from '../types'
import { copyDayChanges, itemsOnWeekday, todayWeekday } from './weekPlan'

function item(id: string, start: string, days: Weekday[], end = '23:00'): ScheduleItem {
  return {
    id,
    title: id,
    category: 'other',
    start_time: start,
    end_time: end,
    days,
    starts_on: '2026-10-01',
    ends_on: null,
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
  }
}

describe('todayWeekday', () => {
  it('numbers Monday 0 to Sunday 6', () => {
    expect(todayWeekday(new Date(2026, 9, 26))).toBe(0)
    expect(todayWeekday(new Date(2026, 9, 29))).toBe(3)
    expect(todayWeekday(new Date(2026, 9, 25))).toBe(6)
  })
})

describe('itemsOnWeekday', () => {
  const items = [item('b', '10:00', [0, 2]), item('a', '08:00', [0]), item('c', '09:00', [1])]

  it('keeps only items that repeat on the day, earliest first', () => {
    expect(itemsOnWeekday(items, 0).map((i) => i.id)).toEqual(['a', 'b'])
    expect(itemsOnWeekday(items, 1).map((i) => i.id)).toEqual(['c'])
  })

  it('is empty for a free day', () => {
    expect(itemsOnWeekday(items, 5)).toEqual([])
  })

  it('breaks ties by end time, then id', () => {
    const tied = [item('z', '08:00', [0], '09:00'), item('y', '08:00', [0], '09:00')]
    expect(itemsOnWeekday(tied, 0).map((i) => i.id)).toEqual(['y', 'z'])
    const ends = [item('a', '08:00', [0], '10:00'), item('b', '08:00', [0], '09:00')]
    expect(itemsOnWeekday(ends, 0).map((i) => i.id)).toEqual(['b', 'a'])
  })
})

describe('copyDayChanges', () => {
  it('adds the target days to every item on the source day', () => {
    const items = [item('a', '08:00', [0]), item('b', '09:00', [0, 4])]
    expect(copyDayChanges(items, 0, [1, 2])).toEqual([
      { id: 'a', days: [0, 1, 2] },
      { id: 'b', days: [0, 1, 2, 4] },
    ])
  })

  it('leaves items on other days alone', () => {
    const items = [item('a', '08:00', [0]), item('other', '08:00', [3])]
    expect(copyDayChanges(items, 0, [1]).map((c) => c.id)).toEqual(['a'])
  })

  it('skips items that already repeat on every target day', () => {
    expect(copyDayChanges([item('a', '08:00', [0, 1])], 0, [1])).toEqual([])
  })

  it('ignores the source day among the targets', () => {
    expect(copyDayChanges([item('a', '08:00', [0])], 0, [0])).toEqual([])
  })

  it('does nothing for an empty source day', () => {
    expect(copyDayChanges([item('a', '08:00', [3])], 0, [1, 2])).toEqual([])
  })
})
