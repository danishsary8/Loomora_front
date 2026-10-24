import type { Category } from '@/styles/tokens'

/** Calendar date in the user's time zone, `YYYY-MM-DD`. */
export type LocalDate = string

/**
 * A to-do (docs/08 `todos`). Same shape for guest and server data (A8-5),
 * snake_case like the API. Guests have no user_id.
 */
export interface Todo {
  id: string
  title: string
  category: Category
  due_date: LocalDate | null
  /** ISO 8601 UTC timestamp, or null when not done. */
  done_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateTodoInput {
  title: string
  category?: Category
  due_date?: LocalDate | null
}

export type UpdateTodoInput = Partial<Pick<Todo, 'title' | 'category' | 'due_date'>>

/** A to-do as shown on Today, with the computed flags from docs/08 rule 2. */
export interface TodayTodo extends Todo {
  overdue: boolean
  /** Overdue for more than 30 days. */
  old: boolean
}

// docs/08 rule 11 (R1 limits).
export const TITLE_MAX_LENGTH = 200
export const MAX_TODOS = 500
export const DEFAULT_CATEGORY: Category = 'other'
