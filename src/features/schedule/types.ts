import type { LocalDate } from '@/features/todos/types'
import type { Category } from '@/styles/tokens'

/** Time of day in 24-hour `HH:MM`. */
export type LocalTime = string

/** Weekday number as docs/08 uses it: 0 = Monday to 6 = Sunday. */
export type Weekday = number

/**
 * A repeating schedule item (docs/08 `schedule_items`). Same shape for guest and server
 * data (A8-5), snake_case like the API.
 */
export interface ScheduleItem {
  id: string
  title: string
  category: Category
  start_time: LocalTime
  end_time: LocalTime
  days: Weekday[]
  starts_on: LocalDate
  ends_on: LocalDate | null
  created_at: string
  updated_at: string
}

/** A change for one date only (docs/08 `schedule_exceptions`). */
export interface ScheduleException {
  id: string
  schedule_item_id: string
  date: LocalDate
  type: 'skip' | 'override'
  title: string | null
  start_time: LocalTime | null
  end_time: LocalTime | null
}

/** Marks one occurrence done (docs/08 `schedule_checkins`). */
export interface ScheduleCheckin {
  id: string
  schedule_item_id: string
  date: LocalDate
  /** ISO 8601 UTC timestamp. */
  done_at: string
}

/** One schedule item on one date, with exceptions and check-in applied (docs/08 rule 4). */
export interface Occurrence {
  schedule_item_id: string
  date: LocalDate
  title: string
  category: Category
  start_time: LocalTime
  end_time: LocalTime
  done: boolean
  /** True when an override exception changed this date. */
  overridden: boolean
}

/** What is happening now and what comes next (docs/08 rule 6). */
export interface NowNext {
  now: Occurrence | null
  next: Occurrence | null
}

export interface CreateScheduleItemInput {
  title: string
  category?: Category
  start_time: LocalTime
  end_time: LocalTime
  days: Weekday[]
  /** First day the item applies; defaults to today. */
  starts_on?: LocalDate
  ends_on?: LocalDate | null
}

export type UpdateScheduleItemInput = Partial<
  Pick<ScheduleItem, 'title' | 'category' | 'start_time' | 'end_time' | 'days' | 'ends_on'>
>

/** Fields an override may change; a missing field keeps the item's value. */
export interface OverrideInput {
  title?: string
  start_time?: LocalTime
  end_time?: LocalTime
}

// docs/08 rule 11 (R1 limits).
export const MAX_SCHEDULE_ITEMS = 100
