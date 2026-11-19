import { isLocalDate } from '@/lib/date'

const LOCAL_MINUTE = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d$/
const DAY_MS = 86_400_000

function localClock(timeZone: string) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
}

function formatLocalMinute(date: Date, clock: Intl.DateTimeFormat): string {
  const fields = Object.fromEntries(
    clock.formatToParts(date).map(({ type, value }) => [type, value]),
  )
  return `${fields.year?.padStart(4, '0')}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`
}

export function localReminderValue(value: string | null, timeZone: string): string {
  const date = value ? new Date(value) : null
  return date && Number.isFinite(date.getTime())
    ? formatLocalMinute(date, localClock(timeZone))
    : ''
}

export function reminderInstant(value: string, timeZone: string): string | null {
  const date = LOCAL_MINUTE.exec(value)?.[1]
  if (!date || !isLocalDate(date)) return null

  const clock = localClock(timeZone)
  // A UTC reference lets us measure the zone's offsets before and after a clock change.
  const wall = Date.parse(`${value}Z`)
  const candidates = [wall - DAY_MS, wall + DAY_MS].map((sample) => {
    const local = formatLocalMinute(new Date(sample), clock)
    return wall - (Date.parse(`${local}Z`) - sample)
  })
  // Round-tripping rejects a time skipped by a clock change. For a repeated time, use the earlier instant.
  const match = candidates
    .sort((a, b) => a - b)
    .find((candidate) => formatLocalMinute(new Date(candidate), clock) === value)
  return match === undefined ? null : new Date(match).toISOString()
}
