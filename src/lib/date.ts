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

/** The day before a `YYYY-MM-DD` date. */
export function previousDay(date: LocalDate): LocalDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10)
}

/** The calendar date of an instant in a time zone (IANA name), `YYYY-MM-DD`. */
export function localDateIn(instant: string, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(instant))
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}
