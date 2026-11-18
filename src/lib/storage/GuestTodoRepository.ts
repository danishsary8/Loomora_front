import { buildTodayList } from '@/features/todos/todayList'
import {
  DEFAULT_CATEGORY,
  MAX_TODOS,
  type CreateTodoInput,
  type LocalDate,
  type TodayTodo,
  type Todo,
  type UpdateTodoInput,
} from '@/features/todos/types'
import { newId } from '@/lib/id'
import { GuestDatabase } from './db'
import { NotFoundError, ValidationError } from './errors'
import type { TodoRepository } from './TodoRepository'
import { checkTodoFields, cleanTitle } from './validation'

export interface GuestTodoRepositoryOptions {
  db?: GuestDatabase
  /** Clock for timestamps; tests pass a fixed one. */
  now?: () => Date
}

/** To-dos for guests, stored on this device in IndexedDB. */
export class GuestTodoRepository implements TodoRepository {
  private readonly db: GuestDatabase
  private readonly now: () => Date

  constructor({
    db = new GuestDatabase(),
    now = () => new Date(),
  }: GuestTodoRepositoryOptions = {}) {
    this.db = db
    this.now = now
  }

  listAll(): Promise<Todo[]> {
    return this.db.todos.toArray()
  }

  /** Remove every guest to-do (after a successful import, docs/08 rule 9). */
  async clear(): Promise<void> {
    await this.db.todos.clear()
  }

  async listForDate(date: LocalDate): Promise<TodayTodo[]> {
    // R1 caps guests at 500 to-dos, so filtering in memory is fine.
    return buildTodayList(await this.db.todos.toArray(), date)
  }

  async create(input: CreateTodoInput): Promise<Todo> {
    checkTodoFields(input)
    const title = cleanTitle(input.title)
    const stamp = this.now().toISOString()
    const todo: Todo = {
      id: newId(),
      title,
      category: input.category ?? DEFAULT_CATEGORY,
      due_date: input.due_date ?? null,
      done_at: null,
      created_at: stamp,
      updated_at: stamp,
    }
    // Errors are thrown outside Dexie transactions: Dexie rewraps errors whose names
    // match its own (e.g. NotFoundError), so callers would get a DexieError instead.
    const added = await this.db.transaction('rw', this.db.todos, async () => {
      if ((await this.db.todos.count()) >= MAX_TODOS) return false
      await this.db.todos.add(todo)
      return true
    })
    if (!added) throw new ValidationError('title', `You can keep at most ${MAX_TODOS} to-dos.`)
    return todo
  }

  async update(id: string, patch: UpdateTodoInput): Promise<Todo> {
    checkTodoFields(patch)
    const changes: Partial<Todo> = { updated_at: this.now().toISOString() }
    if (patch.title !== undefined) changes.title = cleanTitle(patch.title)
    if (patch.category !== undefined) changes.category = patch.category
    if (patch.due_date !== undefined) changes.due_date = patch.due_date
    return this.write(id, changes)
  }

  async setDone(id: string, done: boolean): Promise<Todo> {
    const stamp = this.now().toISOString()
    return this.write(id, { done_at: done ? stamp : null, updated_at: stamp })
  }

  async delete(id: string): Promise<void> {
    await this.db.todos.delete(id)
  }

  private async write(id: string, changes: Partial<Todo>): Promise<Todo> {
    const next = await this.db.transaction('rw', this.db.todos, async () => {
      const current = await this.db.todos.get(id)
      if (!current) return undefined
      const updated: Todo = { ...current, ...changes }
      await this.db.todos.put(updated)
      return updated
    })
    if (!next) throw new NotFoundError('Todo', id)
    return next
  }
}
