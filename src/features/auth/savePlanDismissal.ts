import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { LocalDate } from '@/features/todos/types'

const KEY = 'loomora.savePlanDismissedOn'
/** The prompt comes back after this many days (docs/04 Flow 3: "a few days"). */
export const RETURN_AFTER_DAYS = 3

export function readDismissedOn(): LocalDate | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function writeDismissedOn(date: LocalDate) {
  try {
    localStorage.setItem(KEY, date)
  } catch {
    // Storage blocked: the prompt may come back sooner.
  }
}

export function isSnoozed(dismissedOn: LocalDate | null, today: LocalDate): boolean {
  if (!dismissedOn) return false
  return differenceInCalendarDays(parseISO(today), parseISO(dismissedOn)) < RETURN_AFTER_DAYS
}
