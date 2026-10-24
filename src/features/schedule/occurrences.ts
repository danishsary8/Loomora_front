import type {
  NowNext,
  Occurrence,
  ScheduleCheckin,
  ScheduleException,
  ScheduleItem,
  TimeOfDay,
  Weekday,
} from './types'
import type { LocalDate } from '@/features/todos/types'

/** Weekday of a `YYYY-MM-DD` date, 0 = Monday to 6 = Sunday. */
export function weekdayOf(date: LocalDate): Weekday {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const sundayFirst = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return ((sundayFirst + 6) % 7) as Weekday
}

/** docs/08 rule 4: on or after starts_on, on or before ends_on, and the weekday is listed. */
export function occursOn(item: ScheduleItem, date: LocalDate): boolean {
  if (date < item.starts_on) return false
  if (item.ends_on !== null && date > item.ends_on) return false
  return item.days.includes(weekdayOf(date))
}

/**
 * All occurrences on `date` (docs/08 rules 4, 5 and 7), earliest first.
 * A skip exception removes the occurrence; an override replaces title or times for that date.
 */
export function occurrencesForDate(
  items: readonly ScheduleItem[],
  exceptions: readonly ScheduleException[],
  checkins: readonly ScheduleCheckin[],
  date: LocalDate,
): Occurrence[] {
  const exceptionFor = new Map<string, ScheduleException>()
  for (const e of exceptions) if (e.date === date) exceptionFor.set(e.schedule_item_id, e)
  const doneIds = new Set<string>()
  for (const c of checkins) if (c.date === date) doneIds.add(c.schedule_item_id)

  const result: Occurrence[] = []
  for (const item of items) {
    if (!occursOn(item, date)) continue
    const exception = exceptionFor.get(item.id)
    if (exception?.type === 'skip') continue
    const override = exception?.type === 'override' ? exception : null
    result.push({
      schedule_item_id: item.id,
      date,
      title: override?.title ?? item.title,
      category: item.category,
      start_time: override?.start_time ?? item.start_time,
      end_time: override?.end_time ?? item.end_time,
      overridden: override !== null,
      done: doneIds.has(item.id),
    })
  }
  return result.sort(byStart)
}

/**
 * docs/08 rule 6. Now is the occurrence with start <= time < end (the earliest start if
 * several overlap). Next is the first occurrence starting after `time`.
 */
export function nowAndNext(occurrences: readonly Occurrence[], time: TimeOfDay): NowNext {
  const sorted = [...occurrences].sort(byStart)
  return {
    now: sorted.find((o) => o.start_time <= time && time < o.end_time) ?? null,
    next: sorted.find((o) => o.start_time > time) ?? null,
  }
}

function byStart(a: Occurrence, b: Occurrence): number {
  return (
    a.start_time.localeCompare(b.start_time) ||
    a.end_time.localeCompare(b.end_time) ||
    a.schedule_item_id.localeCompare(b.schedule_item_id)
  )
}
