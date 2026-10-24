import type { ScheduleItem, Weekday } from '../types'

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6]

/** The weekday number (0 = Monday) of a date. */
export function todayWeekday(date: Date = new Date()): Weekday {
  return ((date.getDay() + 6) % 7) as Weekday
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
