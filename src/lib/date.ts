import { format } from 'date-fns'
import type { LocalDate } from '@/features/todos/types'

const LOCAL_DATE = /^\d{4}-\d{2}-\d{2}$/

/** The calendar date of `date` in the device's time zone, `YYYY-MM-DD`. */
export function toLocalDate(date: Date = new Date()): LocalDate {
  return format(date, 'yyyy-MM-dd')
}

/** True for a real calendar date written as `YYYY-MM-DD`. */
export function isLocalDate(value: string): boolean {
  if (!LOCAL_DATE.test(value)) return false
  const [y, m, d] = value.split('-').map(Number) as [number, number, number]
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/** True for a time written as 24-hour `HH:MM`. */
export function isTime(value: string): boolean {
  return TIME.test(value)
}

/** The time of day of `date` in the device's time zone, `HH:MM`. */
export function toLocalTime(date: Date = new Date()): string {
  return format(date, 'HH:mm')
}

/** Weekday of a `YYYY-MM-DD` date as docs/08 numbers it: 0 = Monday to 6 = Sunday. */
export function weekdayOf(date: LocalDate): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}
