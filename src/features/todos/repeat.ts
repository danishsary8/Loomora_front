import { weekdayOf } from '@/features/schedule/occurrences'
import type { LocalDate, RepeatRule } from './types'

/** Advance calendar dates independently of the browser's time zone and DST. */
export function nextRepeatDate(rule: RepeatRule, dueDate: LocalDate, today: LocalDate): LocalDate {
  const start = new Date(`${dueDate > today ? dueDate : today}T00:00:00Z`)
  let date: LocalDate
  do {
    start.setUTCDate(start.getUTCDate() + 1)
    date = start.toISOString().slice(0, 10)
  } while (rule.type === 'weekly' && !rule.days.includes(weekdayOf(date)))
  return date
}
