import type {
  CreateTodoInput,
  LocalDate,
  TodayTodo,
  Todo,
  UpdateTodoInput,
} from '@/features/todos/types'
import type { TodosApi } from '@/lib/api'
import { asValidation, toTodayTodo, toTodo } from './serverMapping'
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

  async create(input: CreateTodoInput): Promise<Todo> {
    return toTodo(await asValidation(this.api.create(input)))
  }

  async update(id: string, patch: UpdateTodoInput): Promise<Todo> {
    return toTodo(await asValidation(this.api.update(id, patch)))
  }

  async setDone(id: string, done: boolean): Promise<Todo> {
    return toTodo(await (done ? this.api.setDone(id) : this.api.clearDone(id)))
  }

  delete(id: string): Promise<void> {
    return this.api.remove(id)
  }
}
