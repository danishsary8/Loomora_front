import type {
  CreateTodoInput,
  LocalDate,
  TodayTodo,
  Todo,
  UpdateTodoInput,
} from '@/features/todos/types'

/**
 * Storage adapter for to-dos (A8-5): the UI talks to this interface and does not know
 * whether data lives on the device (guest) or on the server (account).
 */
export interface TodoRepository {
  /** Every to-do (used by the streak). */
  listAll(): Promise<Todo[]>
  /** The Today list for `date` (docs/08 rules 1 and 2). */
  listForDate(date: LocalDate): Promise<TodayTodo[]>
  create(input: CreateTodoInput): Promise<Todo>
  update(id: string, patch: UpdateTodoInput): Promise<Todo>
  /** Set or clear done_at (docs/08 rule 7). */
  setDone(id: string, done: boolean): Promise<Todo>
  delete(id: string): Promise<void>
}
