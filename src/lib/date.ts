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
