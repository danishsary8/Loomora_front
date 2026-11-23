import type { FocusSession, FocusSessionInput } from '@/features/focus/types'
import { ApiError } from '@/lib/api/errors'
import { isLocalDate } from '@/lib/date'

const uuid = /^(?:[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/

// Match the backend's Laravel TrimStrings middleware, including invisible edge characters.
const labelSpace =
  /(?:[\p{White_Space}\0\u00ad\u061c\u115f\u1160\u180e\u200b-\u200f\u2060-\u206f\u2800\u3164\ufeff\uffa0\u{1d159}\u{1d173}-\u{1d17a}\u{e0020}]|\u034f|\u17b4|\u17b5)/u
const labelEdges = new RegExp(`^${labelSpace.source}+|${labelSpace.source}+$`, 'gu')

function normalizedLabel(label?: string | null): string | null {
  return label?.replace(labelEdges, '') || null
}

export function invalidFocusSession(field: string, message: string): never {
  throw new ApiError(422, { message, errors: { [field]: [message] } })
}

function utc(value: string) {
  const ms = Date.parse(value)
  return timestamp.test(value) && Number.isFinite(ms) ? new Date(ms).toISOString() : value
}

/** Canonical fields used for idempotency comparisons. The account API sends the staged original. */
export function canonicalFocusPayload(input: FocusSessionInput): Required<FocusSessionInput> {
  return {
    id: input.id.toLowerCase(),
    mode: input.mode,
    started_at: utc(input.started_at),
    ended_at: utc(input.ended_at),
    end_reason: input.end_reason,
    planned_focus_ms: input.planned_focus_ms ?? null,
    todo_id: input.todo_id?.toLowerCase() ?? null,
    schedule_item_id: input.schedule_item_id?.toLowerCase() ?? null,
    label: normalizedLabel(input.label),
    segments: input.segments.map(({ type, started_at, ended_at, active_ms }) => ({
      type,
      started_at: utc(started_at),
      ended_at: utc(ended_at),
      active_ms,
    })),
    laps: input.laps?.length ? [...input.laps] : null,
  }
}

export function sameFocusPayload(a: FocusSessionInput, b: FocusSessionInput): boolean {
  return JSON.stringify(canonicalFocusPayload(a)) === JSON.stringify(canonicalFocusPayload(b))
}

function time(value: string, field: string): number {
  const ms = Date.parse(value)
  if (!timestamp.test(value) || !isLocalDate(value.slice(0, 10)) || !Number.isFinite(ms)) {
    invalidFocusSession(field, 'Use an ISO 8601 timestamp with an explicit offset.')
  }
  return ms
}

export function focusDurations(
  input: FocusSessionInput,
): Pick<FocusSession, 'focus_ms' | 'break_ms' | 'paused_ms'> {
  for (const field of ['id', 'todo_id', 'schedule_item_id'] as const) {
    const value = input[field]
    if (value != null && !uuid.test(value)) invalidFocusSession(field, 'Use a UUID.')
  }
  if (input.todo_id && input.schedule_item_id) {
    invalidFocusSession('todo_id', 'Link at most one item.')
  }
  const label = normalizedLabel(input.label)
  if (label && [...label].length > 120) {
    invalidFocusSession('label', 'Use at most 120 characters.')
  }
  if (input.mode === 'countdown') {
    if (!Number.isSafeInteger(input.planned_focus_ms) || (input.planned_focus_ms ?? 0) < 1) {
      invalidFocusSession('planned_focus_ms', 'Use a positive millisecond duration.')
    }
    if (input.laps?.length) invalidFocusSession('laps', 'Only stopwatch sessions have laps.')
  } else if (input.planned_focus_ms != null) {
    invalidFocusSession('planned_focus_ms', 'Only countdown sessions have a planned duration.')
  }

  const start = time(input.started_at, 'started_at')
  const end = time(input.ended_at, 'ended_at')
  if (end < start) invalidFocusSession('ended_at', 'The session ends before it starts.')
  if (!input.segments.length || input.segments.length > 200) {
    invalidFocusSession('segments', 'Use between 1 and 200 segments.')
  }
  let focus = 0
  let breaks = 0
  let previousEnd = start
  for (const [index, segment] of input.segments.entries()) {
    const field = `segments.${index}`
    const segmentStart = time(segment.started_at, `${field}.started_at`)
    const segmentEnd = time(segment.ended_at, `${field}.ended_at`)
    if (segmentStart < previousEnd || segmentEnd < segmentStart || segmentEnd > end) {
      invalidFocusSession(field, 'Keep ordered, non-overlapping segments inside the session.')
    }
    const active = segment.active_ms
    if (!Number.isSafeInteger(active) || active < 0 || active > segmentEnd - segmentStart) {
      invalidFocusSession(`${field}.active_ms`, 'Keep active time within the segment.')
    }
    if (segment.type === 'focus') {
      focus += active
    } else {
      if (input.mode === 'stopwatch')
        invalidFocusSession(`${field}.type`, 'A stopwatch has no breaks.')
      breaks += active
    }
    previousEnd = segmentEnd
  }
  if (!focus) invalidFocusSession('segments', 'A session needs some active Focus time.')

  let previousLap = 0
  const laps = input.laps ?? []
  if (laps.length > 1000) invalidFocusSession('laps', 'Use at most 1000 laps.')
  for (const lap of laps) {
    if (!Number.isSafeInteger(lap) || lap <= previousLap || lap > focus) {
      invalidFocusSession('laps', 'Laps must increase and stay within the Focus time.')
    }
    previousLap = lap
  }
  return { focus_ms: focus, break_ms: breaks, paused_ms: end - start - focus - breaks }
}
