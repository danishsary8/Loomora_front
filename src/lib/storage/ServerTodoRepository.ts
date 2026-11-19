import type {
  CreateTodoInput,
  LocalDate,
  SnoozeMinutes,
  TodayTodo,
  UpdateTodoInput,
} from '@/features/todos/types'
import type { TodosApi } from '@/lib/api'
import { asValidation, toTodayTodo } from './serverMapping'
import type { TodoRepository } from './TodoRepository'

/** Account to-dos via the API (docs/09 `/todos`). */
export class ServerTodoRepository implements TodoRepository {
  private readonly api: TodosApi

  constructor(api: TodosApi) {
    this.api = api
  }

  async listForDate(date: LocalDate): Promise<TodayTodo[]> {
    return (await this.api.list(date)).map(toTodayTodo)
  }

  async create(input: CreateTodoInput): Promise<TodayTodo> {
    return toTodayTodo(await asValidation(this.api.create(input)))
  }

  async update(id: string, patch: UpdateTodoInput): Promise<TodayTodo> {
    return toTodayTodo(await asValidation(this.api.update(id, patch)))
  }

  async setDone(id: string, done: boolean): Promise<TodayTodo> {
    return toTodayTodo(await (done ? this.api.setDone(id) : this.api.clearDone(id)))
  }

  async listDueReminders(signal?: AbortSignal): Promise<TodayTodo[]> {
    return (await this.api.listDueReminders(signal))
      .filter((todo) => todo.remind_at && !todo.done_at && !todo.parent_id)
      .map(toTodayTodo)
  }

  async snoozeReminder(id: string, minutes: SnoozeMinutes): Promise<TodayTodo> {
    return toTodayTodo(await asValidation(this.api.snoozeReminder(id, minutes)))
  }

  async dismissReminder(id: string): Promise<TodayTodo> {
    return toTodayTodo(await this.api.dismissReminder(id))
  }

  async restore(id: string): Promise<TodayTodo> {
    return toTodayTodo(await asValidation(this.api.restore(id)))
  }

  delete(id: string): Promise<void> {
    return this.api.remove(id)
  }
}
