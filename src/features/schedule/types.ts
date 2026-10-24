import type { LocalDate } from '@/features/todos/types'
import type { Category } from '@/styles/tokens'

/** Time of day in the user's time zone, `HH:mm` (24 hour). */
export type TimeOfDay = string

/** Weekday number, 0 = Monday to 6 = Sunday (docs/08 `schedule_items.days`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** A repeating schedule item (docs/08 `schedule_items`). Snake_case like the API (A8-5). */
export interface ScheduleItem {
  id: string
  title: string
  category: Category
  start_time: TimeOfDay
  end_time: TimeOfDay
  days: Weekday[]
  starts_on: LocalDate
  ends_on: LocalDate | null
  created_at: string
  updated_at: string
}

/** One-day change to a schedule item (docs/08 `schedule_exceptions`). */
export interface ScheduleException {
  id: string
  schedule_item_id: string
  date: LocalDate
  type: 'skip' | 'override'
  title: string | null
  start_time: TimeOfDay | null
  end_time: TimeOfDay | null
}

/** An occurrence marked done (docs/08 `schedule_checkins`). */
export interface ScheduleCheckin {
  id: string
  schedule_item_id: string
  date: LocalDate
  /** ISO 8601 UTC timestamp. */
  done_at: string
}

/** A schedule item as it happens on one date, exceptions applied (docs/08 rule 4). */
export interface Occurrence {
  schedule_item_id: string
  date: LocalDate
  title: string
  category: Category
  start_time: TimeOfDay
  end_time: TimeOfDay
  /** True when an override changed this day (docs/08 rule 5). */
  overridden: boolean
  /** True when a check-in exists for this date (docs/08 rule 7). */
  done: boolean
}

export interface NowNext {
  now: Occurrence | null
  next: Occurrence | null
}

export interface CreateScheduleItemInput {
  title: string
  category?: Category
  start_time: TimeOfDay
  end_time: TimeOfDay
  days: Weekday[]
  /** Defaults to today. */
  starts_on?: LocalDate
  ends_on?: LocalDate | null
}

/** "All repeats" edit (docs/08 rule 5). */
export type UpdateScheduleItemInput = Partial<
  Pick<ScheduleItem, 'title' | 'category' | 'start_time' | 'end_time' | 'days' | 'ends_on'>
>

/** "Only today" change: skip the day, or override its title and times. */
export type ExceptionInput =
  | { type: 'skip' }
  | { type: 'override'; title?: string; start_time?: TimeOfDay; end_time?: TimeOfDay }

// docs/08 rule 11 (R1 limits). Title length is shared with to-dos.
export const MAX_SCHEDULE_ITEMS = 100
export const DEFAULT_SCHEDULE_CATEGORY: Category = 'other'
