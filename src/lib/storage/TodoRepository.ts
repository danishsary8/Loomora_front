import type {
  CreateTodoInput,
  LocalDate,
  SnoozeMinutes,
  TodayTodo,
  Todo,
  UpdateTodoInput,
} from '@/features/todos/types'

/** Mutations can return the authoritative children of a top-level to-do. */
export type SavedTodo = Todo & { subtasks?: TodayTodo[] }

/**
 * Storage adapter for to-dos (A8-5): the UI talks to this interface and does not know
 * whether data lives on the device (guest) or on the server (account).
 */
export interface TodoRepository {
  /** The Today list for `date` (docs/08 rules 1 and 2). */
  listForDate(date: LocalDate): Promise<TodayTodo[]>
  create(input: CreateTodoInput): Promise<SavedTodo>
  update(id: string, patch: UpdateTodoInput): Promise<SavedTodo>
  /** Set or clear done_at (docs/08 rule 7). */
  setDone(id: string, done: boolean): Promise<SavedTodo>
  listDueReminders(signal?: AbortSignal): Promise<Todo[]>
  snoozeReminder(id: string, minutes: SnoozeMinutes): Promise<Todo>
  dismissReminder(id: string): Promise<Todo>
  restore(id: string): Promise<SavedTodo>
  delete(id: string): Promise<void>
}
