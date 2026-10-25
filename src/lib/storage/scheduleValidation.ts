import type { Weekday } from '@/features/schedule/types'
import { isLocalDate } from '@/lib/date'
import { CATEGORIES } from '@/styles/tokens'
import { ValidationError } from './errors'

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/

export function checkTime(field: string, value: string): void {
  if (!TIME_OF_DAY.test(value)) throw new ValidationError(field, 'Time must be HH:mm.')
}

/** docs/08 rule 11: start_time < end_time. */
export function checkTimeRange(start: string, end: string): void {
  checkTime('start_time', start)
  checkTime('end_time', end)
  if (start >= end) throw new ValidationError('end_time', 'End time must be after start time.')
}

/** docs/08 rule 11: days must not be empty; each day is 0 (Monday) to 6 (Sunday). */
export function checkDays(days: readonly number[]): void {
  if (days.length === 0) throw new ValidationError('days', 'Pick at least one day.')
  if (!days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))
    throw new ValidationError('days', 'Days must be 0 (Monday) to 6 (Sunday).')
}

export function normalizeDays(days: readonly Weekday[]): Weekday[] {
  return [...new Set(days)].sort((a, b) => a - b)
}

export function checkCategory(category: string): void {
  if (!(CATEGORIES as readonly string[]).includes(category))
    throw new ValidationError('category', 'Unknown category.')
}

export function checkDate(field: string, value: string): void {
  if (!isLocalDate(value)) throw new ValidationError(field, 'Date must be YYYY-MM-DD.')
}
