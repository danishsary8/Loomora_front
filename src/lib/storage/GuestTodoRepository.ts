import { nextRepeatDate } from '@/features/todos/repeat'
import { buildTodayList, byCreated, toTodaySubtask } from '@/features/todos/todayList'
import {
  DEFAULT_CATEGORY,
  DEFAULT_PRIORITY,
  MAX_TODOS,
  type CreateTodoInput,
  type LocalDate,
  type SnoozeMinutes,
  type TodayTodo,
  type Todo,
  type UpdateTodoInput,
} from '@/features/todos/types'
import { localDateIn } from '@/lib/date'
import { newId } from '@/lib/id'
import type { GuestDatabase } from './db'
import { NotFoundError, ValidationError } from './errors'
import { openGuestDatabase } from './openGuestDatabase'
import type { SavedTodo, TodoRepository } from './TodoRepository'
import {
  checkSubtaskFields,
  checkTodoFields,
  cleanTitle,
  normalizeReminder,
  normalizeRepeatRule,
} from './validation'

export interface GuestTodoRepositoryOptions {
  db?: GuestDatabase
  /** Clock for timestamps; tests pass a fixed one. */
  now?: () => Date
  timeZone?: string
}

/** To-dos for guests, stored on this device in IndexedDB. */
export class GuestTodoRepository implements TodoRepository {
  private readonly open: () => Promise<GuestDatabase>
  private readonly now: () => Date

  private readonly timeZone: string | undefined

  constructor({ db, now = () => new Date(), timeZone }: GuestTodoRepositoryOptions = {}) {
    this.open = db ? () => Promise.resolve(db) : openGuestDatabase
    this.now = now
    this.timeZone = timeZone
  }

  async listAll({ includeDeleted = false } = {}): Promise<Todo[]> {
    const all = await (await this.open()).todos.toArray()
    return includeDeleted ? all : all.filter((todo) => !todo.deleted_at)
  }

  /** Clean up the import snapshot without discarding changes made by another tab. */
  async clearImported(snapshot: Todo[]): Promise<void> {
    if (snapshot.length === 0) return
    const db = await this.open()
    await db.transaction('rw', db.todos, async () => {
      const current = await db.todos.toArray()
      const active = (rows: Todo[]) => rows.filter((todo) => !todo.deleted_at)
      const activeUnchanged = JSON.stringify(active(current)) === JSON.stringify(active(snapshot))
      const beforeById = new Map(snapshot.map((todo) => [todo.id, todo]))
      const remove = new Set(
        current
          .filter(
            (todo) =>
              (todo.deleted_at || activeUnchanged) &&
              JSON.stringify(todo) === JSON.stringify(beforeById.get(todo.id)),
          )
          .map(({ id }) => id),
      )
      // A retained subtask still needs its parent for display or restore.
      for (const { id, parent_id } of current) {
        if (parent_id && !remove.has(id)) remove.delete(parent_id)
      }
      await db.todos.bulkDelete([...remove])
    })
  }

  async listForDate(date: LocalDate): Promise<TodayTodo[]> {
    // R1 caps guests at 500 to-dos, so filtering in memory is fine.
    const all = await (await this.open()).todos.toArray()
    return buildTodayList(all, date)
  }

  async listDueReminders(): Promise<Todo[]> {
    const now = this.now().getTime()
    const rows = await this.listAll()
    return rows
      .filter(
        (row) =>
          !row.parent_id &&
          !row.done_at &&
          !row.remind_dismissed_at &&
          row.remind_at !== null &&
          Date.parse(row.remind_at) <= now,
      )
      .sort(
        (a, b) => (a.remind_at ?? '').localeCompare(b.remind_at ?? '') || a.id.localeCompare(b.id),
      )
  }

  snoozeReminder(id: string, minutes: SnoozeMinutes): Promise<SavedTodo> {
    return this.write(id, async (db, current) => {
      const now = this.now()
      const remindAt = new Date(now.getTime() + minutes * 60_000).toISOString()
      if (current.parent_id) checkSubtaskFields({ remind_at: remindAt })
      const updated = {
        ...current,
        remind_at: remindAt,
        remind_dismissed_at: null,
        updated_at: now.toISOString(),
      }
      await db.todos.put(updated)
      return updated
    })
  }

  dismissReminder(id: string): Promise<SavedTodo> {
    return this.write(id, async (db, current) => {
      if (!current.remind_at || current.remind_dismissed_at) return current
      const stamp = this.now().toISOString()
      const updated = { ...current, remind_dismissed_at: stamp, updated_at: stamp }
      await db.todos.put(updated)
      return updated
    })
  }

  async create(input: CreateTodoInput): Promise<Todo> {
    checkTodoFields(input)
    const title = cleanTitle(input.title)
    const stamp = this.now().toISOString()
    const db = await this.open()
    const todo = await db.transaction('rw', db.todos, async () => {
      const parent = input.parent_id ? await db.todos.get(input.parent_id) : undefined
      if (input.parent_id && (!parent || parent.deleted_at)) return null
      if (parent?.parent_id)
        throw new ValidationError('parent_id', 'Subtasks cannot have subtasks.')
      if (parent) checkSubtaskFields(input)
      await this.checkCapacity(db, 1)

      const row: Todo = {
        id: newId(),
        title,
        category: input.category ?? parent?.category ?? DEFAULT_CATEGORY,
        priority: input.priority ?? DEFAULT_PRIORITY,
        notes: input.notes?.trim() || null,
        parent_id: parent?.id ?? null,
        due_date: input.due_date ?? null,
        repeat_rule: normalizeRepeatRule(input.repeat_rule ?? null, input.due_date ?? null),
        next_todo_id: null,
        remind_at: input.remind_at == null ? null : normalizeReminder(input.remind_at),
        remind_dismissed_at: null,
        done_at: null,
        created_at: stamp,
        updated_at: stamp,
      }
      await db.todos.add(row)
      return row
    })
    if (!todo) throw new NotFoundError('Todo', input.parent_id ?? '')
    return todo
  }

  async update(id: string, patch: UpdateTodoInput): Promise<Todo> {
    checkTodoFields(patch)
    if ('parent_id' in patch)
      throw new ValidationError('parent_id', 'The parent cannot be changed.')

    return this.write(id, async (db, current) => {
      if (current.parent_id) checkSubtaskFields(patch)
      const changes: Partial<Todo> = { updated_at: this.now().toISOString() }
      if (patch.title !== undefined) changes.title = cleanTitle(patch.title)
      if (patch.category !== undefined) changes.category = patch.category
      if (patch.due_date !== undefined) changes.due_date = patch.due_date
      if (patch.priority !== undefined) changes.priority = patch.priority
      if (patch.notes !== undefined) changes.notes = patch.notes?.trim() || null
      if (patch.remind_at !== undefined) {
        const reminder = patch.remind_at === null ? null : normalizeReminder(patch.remind_at)
        if (reminder !== (current.remind_at ?? null)) {
          changes.remind_at = reminder
          changes.remind_dismissed_at = null
        }
      }
      const updated = { ...current, ...changes }
      updated.repeat_rule = normalizeRepeatRule(
        patch.repeat_rule === undefined ? current.repeat_rule : patch.repeat_rule,
        updated.due_date,
      )
      await db.todos.put(updated)
      return updated
    })
  }

  async setDone(id: string, done: boolean): Promise<SavedTodo> {
    return this.write(id, async (db, current) => {
      const stamp = this.now().toISOString()
      const doneAt = done ? (current.done_at ?? stamp) : null
      const updated = { ...current, done_at: doneAt, updated_at: stamp }
      if (!current.parent_id && doneAt) {
        const subtasks = await this.activeSubtasks(db, id)
        if (current.repeat_rule && current.due_date && !current.next_todo_id) {
          updated.next_todo_id = await this.createNext(
            db,
            current,
            current.due_date,
            nextRepeatDate(
              current.repeat_rule,
              current.due_date,
              localDateIn(stamp, this.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
            ),
            stamp,
            subtasks,
          )
        }
        await db.todos.bulkPut(
          subtasks
            .filter((row) => !row.done_at)
            .map((row) => ({
              ...row,
              done_at: doneAt,
              updated_at: stamp,
            })),
        )
      }
      await db.todos.put(updated)
      return this.withSubtasks(db, updated)
    })
  }

  async restore(id: string): Promise<SavedTodo> {
    return this.write(
      id,
      async (db, current) => {
        if (!current.deleted_at) return this.withSubtasks(db, current)
        if (current.parent_id && (await db.todos.get(current.parent_id))?.deleted_at)
          throw new ValidationError('parent_id', 'Restore the parent first.')

        const stamp = this.now().toISOString()
        const updated = { ...current, deleted_at: null, updated_at: stamp }
        if (updated.deleted_with_parent) updated.deleted_with_parent = false
        await db.todos.put(updated)
        if (!current.parent_id) {
          await db.todos
            .where('parent_id')
            .equals(id)
            .filter((row) => row.deleted_with_parent === true)
            .modify({ deleted_at: null, deleted_with_parent: false, updated_at: stamp })
        }
        return this.withSubtasks(db, updated)
      },
      true,
    )
  }

  async delete(id: string): Promise<void> {
    await this.write(id, async (db, current) => {
      const stamp = this.now().toISOString()
      const deleted = { ...current, deleted_at: stamp, updated_at: stamp }
      await db.todos.put(deleted)
      if (!current.parent_id) {
        await db.todos
          .where('parent_id')
          .equals(id)
          .filter((row) => !row.deleted_at)
          .modify({ deleted_at: stamp, deleted_with_parent: true, updated_at: stamp })
      }
      return deleted
    })
  }

  private async checkCapacity(db: GuestDatabase, added: number): Promise<void> {
    if ((await db.todos.count()) + added > MAX_TODOS)
      throw new ValidationError('title', `You can keep at most ${MAX_TODOS} to-dos.`)
  }

  private async createNext(
    db: GuestDatabase,
    parent: Todo,
    previousDueDate: LocalDate,
    dueDate: LocalDate,
    stamp: string,
    subtasks: Todo[],
  ): Promise<string> {
    // Check capacity for the whole occurrence inside the completion transaction.
    await this.checkCapacity(db, 1 + subtasks.length)
    const id = newId()
    // Date-only ISO strings use UTC midnight, so this delta counts whole days across DST.
    const shift = Date.parse(dueDate) - Date.parse(previousDueDate)
    const next = {
      ...parent,
      id,
      due_date: dueDate,
      done_at: null,
      next_todo_id: null,
      remind_at: parent.remind_at
        ? new Date(Date.parse(parent.remind_at) + shift).toISOString()
        : null,
      remind_dismissed_at: null,
      created_at: stamp,
      updated_at: stamp,
    }
    await db.todos.bulkAdd([
      next,
      ...subtasks.map((row) => ({
        ...row,
        id: newId(),
        parent_id: id,
        remind_at: null,
        remind_dismissed_at: null,
        done_at: null,
        updated_at: stamp,
      })),
    ])
    return id
  }

  private activeSubtasks(db: GuestDatabase, id: string): Promise<Todo[]> {
    return db.todos
      .where('parent_id')
      .equals(id)
      .filter((row) => !row.deleted_at)
      .toArray()
  }

  private async withSubtasks(db: GuestDatabase, todo: Todo): Promise<SavedTodo> {
    const rows = todo.parent_id ? [] : await this.activeSubtasks(db, todo.id)
    return {
      ...todo,
      subtasks: rows.sort(byCreated).map(toTodaySubtask),
    }
  }

  private async write(
    id: string,
    change: (db: GuestDatabase, current: Todo) => Promise<SavedTodo>,
    includeDeleted = false,
  ): Promise<SavedTodo> {
    const db = await this.open()
    const next = await db.transaction('rw', db.todos, async () => {
      const current = await db.todos.get(id)
      if (!current || (!includeDeleted && current.deleted_at)) return undefined
      return change(db, current)
    })
    // Dexie wraps errors named NotFoundError thrown inside a transaction.
    if (!next) throw new NotFoundError('Todo', id)
    return next
  }
}
