import type { Weekday } from '@/features/schedule/types'
import type { Category } from '@/styles/tokens'

/** Calendar date in the user's time zone, `YYYY-MM-DD`. */
export type LocalDate = string

export const PRIORITIES = ['low', 'normal', 'high'] as const
export type Priority = (typeof PRIORITIES)[number]
export const DEFAULT_PRIORITY: Priority = 'normal'
export const NOTES_MAX_LENGTH = 2000

export const SNOOZE_MINUTES = [5, 10, 30, 60] as const
export type SnoozeMinutes = (typeof SNOOZE_MINUTES)[number]

export type RepeatRule = { type: 'daily' } | { type: 'weekly'; days: Weekday[] }

/**
 * A to-do (docs/08 `todos`). Same shape for guest and server data (A8-5),
 * snake_case like the API. Guests have no user_id.
 */
export interface Todo {
  id: string
  title: string
  category: Category
  priority: Priority
  notes: string | null
  parent_id: string | null
  repeat_rule: RepeatRule | null
  next_todo_id: string | null
  remind_at: string | null
  /** Local dismissal timestamp. The account API does not expose this field. */
  remind_dismissed_at?: string | null
  due_date: LocalDate | null
  /** ISO 8601 UTC timestamp, or null when not done. */
  done_at: string | null
  /** ISO 8601 UTC timestamp when soft-deleted, or null/undefined. */
  deleted_at?: string | null
  /** True when this subtask was soft-deleted by deleting its parent. */
  deleted_with_parent?: boolean
  created_at: string
  updated_at: string
}

export type UpdateTodoInput = Partial<
  Pick<Todo, 'title' | 'category' | 'due_date' | 'priority' | 'notes' | 'repeat_rule' | 'remind_at'>
>

export interface CreateTodoInput extends UpdateTodoInput {
  title: string
  parent_id?: string | null
}

/** A to-do as shown on Today, with the computed flags from docs/08 rule 2. */
export interface TodayTodo extends Todo {
  overdue: boolean
  /** Overdue for more than 30 days. */
  old: boolean
  subtasks: TodayTodo[]
}

// docs/08 rule 11 (R1 limits).
export const TITLE_MAX_LENGTH = 200
export const MAX_TODOS = 500
export const DEFAULT_CATEGORY: Category = 'other'
