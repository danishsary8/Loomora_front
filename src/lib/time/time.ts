import type { Weekday } from '@/features/schedule/types'

export type TimeFormat = '12h' | '24h'
/** The API's ISO weekday number, 1 (Monday) through 7 (Sunday). */
export type WeekStart = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface TimePreferences {
  time_format: TimeFormat
  week_starts_on: WeekStart
}

export const DEFAULT_TIME_PREFERENCES: TimePreferences = {
  time_format: '24h',
  week_starts_on: 1,
}

export const WEEKDAYS: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6]

/** Rotate the display order while preserving the schedule's zero-based IDs. */
export function orderedWeekdays(start: WeekStart = DEFAULT_TIME_PREFERENCES.week_starts_on) {
  const offset = start - 1
  return [...WEEKDAYS.slice(offset), ...WEEKDAYS.slice(0, offset)]
}

const clocks = new Map<string, Intl.DateTimeFormat>()

/** Format an actual instant in the given IANA zone, or in the device zone by default. */
export function formatInstantTime(
  instant: Date | string,
  format: TimeFormat,
  locale: string,
  timeZone?: string,
): string {
  const zone = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
  const key = `${locale}|${format}|${zone}`
  let clock = clocks.get(key)
  if (!clock) {
    clock = new Intl.DateTimeFormat(locale, {
      timeZone: zone,
      hour: format === '12h' ? 'numeric' : '2-digit',
      minute: '2-digit',
      hourCycle: format === '12h' ? 'h12' : 'h23',
    })
    clocks.set(key, clock)
  }
  return clock.format(typeof instant === 'string' ? new Date(instant) : instant)
}

/** Display a schedule's wall time. UTC is only a formatting reference here. */
export function formatWallTime(
  wallTime: string,
  format: TimeFormat = DEFAULT_TIME_PREFERENCES.time_format,
  locale = 'en',
): string {
  const hour = Number(wallTime.slice(0, 2))
  const minute = Number(wallTime.slice(3, 5))
  return formatInstantTime(new Date(Date.UTC(2000, 0, 1, hour, minute)), format, locale, 'UTC')
}

/** Normalize a typed time to the 24-hour wall time used by storage and APIs. */
export function parseWallTime(value: string): string | null {
  const match = /^(\d{1,2}):([0-5]\d)\s*(am|pm)?$/i.exec(value.trim())
  if (!match) return null
  const [, hours, minutes, period] = match
  const hour = Number(hours)
  if (period ? hour < 1 || hour > 12 : hour > 23) return null
  const canonical = period ? (hour % 12) + (period.toLowerCase() === 'pm' ? 12 : 0) : hour
  return `${String(canonical).padStart(2, '0')}:${minutes}`
}
