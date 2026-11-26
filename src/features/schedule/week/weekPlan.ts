import type { ScheduleItem, Weekday } from '../types'

import { toLocalDate } from '@/lib/date'
import { weekdayOf } from '../occurrences'

/** The weekday number (0 = Monday) of a date. */
export function todayWeekday(date: Date = new Date(), zone?: string): Weekday {
  return weekdayOf(toLocalDate(date, zone))
}

/**
 * Local calendar `Date` (UTC midnight of that local date) for each weekday in the
 * current week ordered by `weekdays` (Monday-first or Sunday-first).
 */
export function weekDatesFor(
  weekdays: readonly Weekday[],
  date: Date = new Date(),
  zone?: string,
): Record<Weekday, Date> {
  const local = toLocalDate(date, zone)
  const [y, m, d] = local.split('-').map(Number) as [number, number, number]
  const todayIndex = weekdays.indexOf(weekdayOf(local))
  const result = {} as Record<Weekday, Date>
  weekdays.forEach((day, i) => {
    const offset = i - (todayIndex >= 0 ? todayIndex : 0)
    result[day] = new Date(Date.UTC(y, m - 1, d + offset))
  })
  return result
}

function byStart(a: ScheduleItem, b: ScheduleItem): number {
  return (
    a.start_time.localeCompare(b.start_time) ||
    a.end_time.localeCompare(b.end_time) ||
    a.id.localeCompare(b.id)
  )
}

/** The items that repeat on `day`, earliest first. */
export function itemsOnWeekday(items: readonly ScheduleItem[], day: Weekday): ScheduleItem[] {
  return items.filter((item) => item.days.includes(day)).sort(byStart)
}

/**
 * "Copy day to...": every item on `from` also repeats on the `to` days.
 * Returns only the items whose days change, with their new days.
 */
export function copyDayChanges(
  items: readonly ScheduleItem[],
  from: Weekday,
  to: readonly Weekday[],
): Array<{ id: string; days: Weekday[] }> {
  const targets = to.filter((day) => day !== from)
  return itemsOnWeekday(items, from).flatMap((item) => {
    const days = [...new Set([...item.days, ...targets])].sort((a, b) => a - b) as Weekday[]
    return days.length === item.days.length ? [] : [{ id: item.id, days }]
  })
}
