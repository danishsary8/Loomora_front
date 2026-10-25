import type { Weekday } from '@/features/schedule/types'
import { isLocalDate, isTime } from '@/lib/date'
import { CATEGORIES } from '@/styles/tokens'
import { ValidationError } from './errors'

export function checkCategory(category: string | undefined): void {
  if (category !== undefined && !(CATEGORIES as readonly string[]).includes(category))
    throw new ValidationError('category', 'Unknown category.')
}

export function checkTime(field: string, value: string | undefined): void {
  if (value !== undefined && !isTime(value)) throw new ValidationError(field, 'Time must be HH:MM.')
}

export function checkDate(field: string, value: string | null | undefined): void {
  if (value !== undefined && value !== null && !isLocalDate(value))
    throw new ValidationError(field, 'Date must be YYYY-MM-DD.')
}

/** Days must be a non-empty list of weekdays 0 (Monday) to 6 (Sunday) (docs/08 rule 11). */
export function checkDays(days: readonly Weekday[]): void {
  if (days.length === 0) throw new ValidationError('days', 'Pick at least one day.')
  if (!days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6))
    throw new ValidationError('days', 'Days must be numbers from 0 (Monday) to 6 (Sunday).')
}

/** start_time must be earlier than end_time (docs/08 rule 11). */
export function checkTimeOrder(start: string, end: string): void {
  if (start >= end) throw new ValidationError('end_time', 'End time must be after the start time.')
}
