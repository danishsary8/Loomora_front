import type { LocalDate } from '@/features/todos/types'

interface FocusSegment {
  type: 'focus' | 'short_break' | 'long_break'
  started_at: string
  ended_at: string
  active_ms: number
}

/** B-043 finished session input. Allocate id at timer start with newId and persist it with the timer. */
export interface FocusSessionInput {
  id: string
  mode: 'countdown' | 'stopwatch'
  started_at: string
  ended_at: string
  end_reason: 'completed' | 'ended_early'
  planned_focus_ms?: number | null
  todo_id?: string | null
  schedule_item_id?: string | null
  label?: string | null
  segments: FocusSegment[]
  laps?: number[] | null
}

export interface FocusSession extends Required<FocusSessionInput> {
  local_date: LocalDate
  focus_ms: number
  break_ms: number
  paused_ms: number
  created_at: string
}

export { newId as newFocusSessionId } from '@/lib/id'
