import { weekdayOf } from '@/lib/date'
import type {
  LocalTime,
  NowNext,
  Occurrence,
  ScheduleCheckin,
  ScheduleException,
  ScheduleItem,
} from './types'
import type { LocalDate } from '@/features/todos/types'

/** True when `item` repeats on `date`, before exceptions (docs/08 rule 4). */
export function occursOn(item: ScheduleItem, date: LocalDate): boolean {
  if (date < item.starts_on) return false
  if (item.ends_on !== null && date > item.ends_on) return false
  return item.days.includes(weekdayOf(date))
}

/**
 * Everything scheduled on `date`, earliest first (docs/08 rule 4): repeats that fall on the
 * date, minus skipped ones, with overrides applied and check-ins marked. Exceptions and
 * check-ins for other dates are ignored.
 */
export function occurrencesForDate(
  items: readonly ScheduleItem[],
  exceptions: readonly ScheduleException[],
  checkins: readonly ScheduleCheckin[],
  date: LocalDate,
): Occurrence[] {
  const exceptionFor = new Map(
    exceptions.filter((e) => e.date === date).map((e) => [e.schedule_item_id, e]),
  )
  const doneIds = new Set(checkins.filter((c) => c.date === date).map((c) => c.schedule_item_id))

  const result: Occurrence[] = []
  for (const item of items) {
    if (!occursOn(item, date)) continue
    const exception = exceptionFor.get(item.id)
    if (exception?.type === 'skip') continue
    const override = exception?.type === 'override' ? exception : undefined
    result.push({
      schedule_item_id: item.id,
      date,
      title: override?.title ?? item.title,
      category: item.category,
      start_time: override?.start_time ?? item.start_time,
      end_time: override?.end_time ?? item.end_time,
      done: doneIds.has(item.id),
      overridden: override !== undefined,
    })
  }
  return result.sort(
    (a, b) =>
      a.start_time.localeCompare(b.start_time) ||
      a.end_time.localeCompare(b.end_time) ||
      a.schedule_item_id.localeCompare(b.schedule_item_id),
  )
}

/**
 * Now / Next for one day's occurrences (docs/08 rule 6). Now starts at or before `time` and
 * ends after it, so an item ending at 10:00 is over at 10:00. Next is the first one starting
 * later than `time`. `occurrences` must come from {@link occurrencesForDate}, which sorts them.
 */
export function nowAndNext(occurrences: readonly Occurrence[], time: LocalTime): NowNext {
  const now = occurrences.find((o) => o.start_time <= time && time < o.end_time) ?? null
  const next = occurrences.find((o) => o.start_time > time) ?? null
  return { now, next }
}
