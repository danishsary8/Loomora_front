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
import type { GuestDatabase } from './db'
import { NotFoundError, ValidationError } from './errors'
import { openGuestDatabase } from './openGuestDatabase'
import type { TodoRepository } from './TodoRepository'
import { checkTodoFields, cleanTitle } from './validation'

export interface GuestTodoRepositoryOptions {
  db?: GuestDatabase
  /** Clock for timestamps; tests pass a fixed one. */
  now?: () => Date
}

/** To-dos for guests, stored on this device in IndexedDB. */
export class GuestTodoRepository implements TodoRepository {
  private readonly open: () => Promise<GuestDatabase>
  private readonly now: () => Date

  constructor({ db, now = () => new Date() }: GuestTodoRepositoryOptions = {}) {
    this.open = db ? () => Promise.resolve(db) : openGuestDatabase
    this.now = now
  }

  async listAll(): Promise<Todo[]> {
    const all = await (await this.open()).todos.toArray()
    return all.filter((t) => !t.deleted_at)
  }

  /** Remove every guest to-do (after a successful import, docs/08 rule 9). */
  async clear(): Promise<void> {
    await (await this.open()).todos.clear()
  }

  async listForDate(date: LocalDate): Promise<TodayTodo[]> {
    // R1 caps guests at 500 to-dos, so filtering in memory is fine.
    const all = await (await this.open()).todos.toArray()
    return buildTodayList(
      all.filter((t) => !t.deleted_at),
      date,
    )
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
    const db = await this.open()
    const added = await db.transaction('rw', db.todos, async () => {
      if ((await db.todos.count()) >= MAX_TODOS) return false
      await db.todos.add(todo)
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

  async restore(id: string): Promise<Todo> {
    const stamp = this.now().toISOString()
    return this.write(id, { deleted_at: null, updated_at: stamp })
  }

  async delete(id: string): Promise<void> {
    const stamp = this.now().toISOString()
    await this.write(id, { deleted_at: stamp, updated_at: stamp })
  }

  private async write(id: string, changes: Partial<Todo>): Promise<Todo> {
    const db = await this.open()
    const next = await db.transaction('rw', db.todos, async () => {
      const current = await db.todos.get(id)
      if (!current) return undefined
      const updated: Todo = { ...current, ...changes }
      await db.todos.put(updated)
      return updated
    })
    if (!next) throw new NotFoundError('Todo', id)
    return next
  }
}
