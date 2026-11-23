import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { MAX_TODOS, TITLE_MAX_LENGTH, type Todo } from '@/features/todos/types'
import { GuestDatabase } from './db'
import { NotFoundError, ValidationError } from './errors'
import { GuestTodoRepository } from './GuestTodoRepository'

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

let db: GuestDatabase
let clock: Date
let repo: GuestTodoRepository

beforeEach(() => {
  db = new GuestDatabase(`test-${crypto.randomUUID()}`)
  clock = new Date('2026-10-24T08:00:00.000Z')
  repo = new GuestTodoRepository({ db, now: () => clock })
})

afterEach(async () => {
  await db.delete()
})

describe('GuestTodoRepository', () => {
  it('creates a to-do with a client UUID, trimmed title and defaults', async () => {
    const todo = await repo.create({ title: '  Read chapter 3  ' })
    expect(todo).toEqual({
      priority: 'normal',
      notes: null,
      parent_id: null,
      repeat_rule: null,
      next_todo_id: null,
      remind_at: null,
      remind_dismissed_at: null,
      id: expect.stringMatching(UUID_V4),
      title: 'Read chapter 3',
      category: 'other',
      due_date: null,
      done_at: null,
      created_at: '2026-10-24T08:00:00.000Z',
      updated_at: '2026-10-24T08:00:00.000Z',
    })
    expect(await db.todos.get(todo.id)).toEqual(todo)
  })

  it('stores category and due date when given', async () => {
    const todo = await repo.create({ title: 'Gym', category: 'health', due_date: '2026-10-24' })
    expect(todo).toMatchObject({ category: 'health', due_date: '2026-10-24' })
  })

  it('gives every to-do a different id', async () => {
    const a = await repo.create({ title: 'A' })
    const b = await repo.create({ title: 'B' })
    expect(a.id).not.toBe(b.id)
  })

  it('lists the Today list for a date using the docs/08 rules', async () => {
    const tick = () => (clock = new Date(clock.getTime() + 1000))
    const today = await repo.create({ title: 'Today', due_date: '2026-10-24' })
    tick()
    const undated = await repo.create({ title: 'Undated' })
    tick()
    await repo.create({ title: 'Future', due_date: '2026-10-25' })
    tick()
    const late = await repo.create({ title: 'Late', due_date: '2026-10-20' })

    const list = await repo.listForDate('2026-10-24')
    expect(list.map((t) => [t.id, t.overdue])).toEqual([
      [late.id, true],
      [today.id, false],
      [undated.id, false],
    ])
  })

  it('updates title, category and due date and bumps updated_at', async () => {
    const todo = await repo.create({ title: 'Old title' })
    clock = new Date('2026-10-24T09:30:00.000Z')
    const updated = await repo.update(todo.id, {
      title: ' New title ',
      category: 'study',
      due_date: '2026-10-30',
    })
    expect(updated).toMatchObject({
      title: 'New title',
      category: 'study',
      due_date: '2026-10-30',
      created_at: '2026-10-24T08:00:00.000Z',
      updated_at: '2026-10-24T09:30:00.000Z',
    })
    expect(await db.todos.get(todo.id)).toEqual(updated)
  })

  it('can clear the due date', async () => {
    const todo = await repo.create({ title: 'X', due_date: '2026-10-24' })
    expect((await repo.update(todo.id, { due_date: null })).due_date).toBeNull()
  })

  it('leaves fields that are not in the patch alone', async () => {
    const todo = await repo.create({ title: 'Keep me', category: 'work', due_date: '2026-10-24' })
    const updated = await repo.update(todo.id, { category: 'life' })
    expect(updated).toMatchObject({ title: 'Keep me', category: 'life', due_date: '2026-10-24' })
  })

  it('sets and clears done_at (rule 7: tapping again undoes it)', async () => {
    const todo = await repo.create({ title: 'Check me' })
    clock = new Date('2026-10-24T10:00:00.000Z')
    const done = await repo.setDone(todo.id, true)
    expect(done.done_at).toBe('2026-10-24T10:00:00.000Z')
    const undone = await repo.setDone(todo.id, false)
    expect(undone.done_at).toBeNull()
    expect((await db.todos.get(todo.id))?.done_at).toBeNull()
  })

  it('soft-deletes and restores a to-do', async () => {
    const todo = await repo.create({ title: 'Delete me' })
    clock = new Date('2026-10-24T08:05:00.000Z')
    await repo.delete(todo.id)
    const inDb = await db.todos.get(todo.id)
    expect(inDb?.deleted_at).toBe('2026-10-24T08:05:00.000Z')
    expect(await repo.listForDate('2026-10-24')).toEqual([])
    expect(await repo.listAll()).toEqual([])

    clock = new Date('2026-10-24T08:06:00.000Z')
    const restored = await repo.restore(todo.id)
    expect(restored.deleted_at).toBeNull()
    expect(restored.updated_at).toBe('2026-10-24T08:06:00.000Z')
    expect((await repo.listForDate('2026-10-24')).map((t) => t.id)).toEqual([todo.id])
    expect((await repo.listAll()).map((t) => t.id)).toEqual([todo.id])
  })

  it('throws NotFoundError for unknown ids', async () => {
    await expect(repo.update('missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    await expect(repo.setDone('missing', true)).rejects.toBeInstanceOf(NotFoundError)
    await expect(repo.delete('missing')).rejects.toBeInstanceOf(NotFoundError)
    await expect(repo.restore('missing')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('keeps data across repository instances (reopen the app)', async () => {
    const todo = await repo.create({ title: 'Persist me', due_date: '2026-10-24' })
    db.close()
    const reopened = new GuestDatabase(db.name)
    const again = new GuestTodoRepository({ db: reopened })
    expect((await again.listForDate('2026-10-24')).map((t) => t.id)).toEqual([todo.id])
    reopened.close()
  })

  it.each(['low', 'normal', 'high'] as const)('persists %s priority', async (priority) => {
    const todo = await repo.create({ title: 'Read', priority })
    expect(await db.todos.get(todo.id)).toMatchObject({ priority })
  })

  it('creates, edits and clears notes, enforcing the character limit', async () => {
    const todo = await repo.create({ title: 'Read', notes: 'a'.repeat(2000) })
    expect(todo.notes).toHaveLength(2000)
    await expect(repo.update(todo.id, { notes: 'a'.repeat(2001) })).rejects.toMatchObject({
      field: 'notes',
    })
    await expect(repo.update(todo.id, { notes: 'New note' })).resolves.toMatchObject({
      notes: 'New note',
    })
    await expect(repo.update(todo.id, { notes: null })).resolves.toMatchObject({ notes: null })
  })

  it('nests only direct subtasks in creation order and checks off the unfinished ones', async () => {
    const parent = await repo.create({ title: 'Parent', category: 'work', due_date: '2026-10-24' })
    const first = await repo.create({ title: 'First', parent_id: parent.id })
    clock = new Date('2026-10-24T09:00:00.000Z')
    const second = await repo.create({ title: 'Second', parent_id: parent.id })
    const checked = await repo.setDone(first.id, true)
    clock = new Date('2026-10-24T10:00:00.000Z')
    await repo.setDone(parent.id, true)
    await repo.setDone(parent.id, false)
    expect(await repo.listForDate('2026-10-24')).toEqual([
      expect.objectContaining({
        id: parent.id,
        done_at: null,
        subtasks: [
          expect.objectContaining({
            id: first.id,
            category: 'work',
            due_date: null,
            done_at: checked.done_at,
            subtasks: [],
          }),
          expect.objectContaining({ id: second.id, done_at: clock.toISOString() }),
        ],
      }),
    ])
  })

  it('rejects invalid parents, subtask fields and attempts to reparent', async () => {
    const parent = await repo.create({ title: 'Parent' })
    const child = await repo.create({ title: 'Child', parent_id: parent.id })
    await expect(
      repo.create({ title: 'Missing', parent_id: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(NotFoundError)
    await expect(repo.create({ title: 'Nested', parent_id: child.id })).rejects.toMatchObject({
      field: 'parent_id',
    })
    await expect(
      repo.create({ title: 'Bad date', parent_id: parent.id, due_date: '2026-10-24' }),
    ).rejects.toMatchObject({ field: 'due_date' })
    await expect(repo.update(child.id, { due_date: '2026-10-24' })).rejects.toMatchObject({
      field: 'due_date',
    })
    await expect(repo.update(child.id, { parent_id: null } as never)).rejects.toMatchObject({
      field: 'parent_id',
    })
    await expect(
      repo.create({
        title: 'Repeat',
        parent_id: parent.id,
        repeat_rule: { type: 'daily' },
      } as never),
    ).rejects.toMatchObject({ field: 'repeat_rule' })
    await expect(
      repo.update(child.id, { remind_at: '2026-10-24T10:00:00Z' } as never),
    ).rejects.toMatchObject({ field: 'remind_at' })
    await expect(
      repo.create({ title: 'Bad priority', priority: 'urgent' as never }),
    ).rejects.toMatchObject({ field: 'priority' })
  })

  it('restores only children deleted with the parent, even at the same timestamp', async () => {
    const parent = await repo.create({ title: 'Parent' })
    const removed = await repo.create({ title: 'Removed separately', parent_id: parent.id })
    const child = await repo.create({ title: 'Child', parent_id: parent.id })
    await repo.delete(removed.id)
    await repo.delete(parent.id)
    expect(await repo.listAll()).toEqual([])
    await expect(repo.restore(child.id)).rejects.toMatchObject({ field: 'parent_id' })
    await repo.restore(parent.id)
    expect((await repo.listAll()).map(({ id }) => id).sort()).toEqual([parent.id, child.id].sort())
  })

  it('upgrades v3 rows in place and preserves soft-delete data', async () => {
    const old = new Dexie(db.name)
    old.version(3).stores({
      todos: 'id, due_date, created_at, deleted_at',
      schedule_items: 'id',
      schedule_exceptions: 'id, schedule_item_id, date, &[schedule_item_id+date]',
      schedule_checkins: 'id, schedule_item_id, date, &[schedule_item_id+date]',
    })
    const id = crypto.randomUUID()
    const stamp = clock.toISOString()
    await old.table('todos').add({
      id,
      title: 'Existing',
      category: 'study',
      due_date: null,
      done_at: stamp,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: stamp,
    })
    old.close()
    expect(await db.todos.get(id)).toEqual({
      id,
      title: 'Existing',
      category: 'study',
      due_date: null,
      done_at: stamp,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: stamp,
      priority: 'normal',
      notes: null,
      parent_id: null,
      repeat_rule: null,
      next_todo_id: null,
      remind_at: null,
      remind_dismissed_at: null,
    })
    expect(await repo.listAll()).toEqual([])
  })

  describe('repeating to-dos', () => {
    const daily = { type: 'daily' } as const

    it.each([
      ['daily after the original due date', '2026-10-27', daily, '2026-10-28'],
      ['weekly across Sunday', '2026-10-24', { type: 'weekly', days: [0] } as const, '2026-10-26'],
      ['daily after midnight in Phnom Penh', '2026-10-24', daily, '2026-10-26'],
    ] as const)('advances %s', async (_, due_date, rule, expected) => {
      clock = new Date('2026-10-24T17:01:00Z')
      repo = new GuestTodoRepository({ db, now: () => clock, timeZone: 'Asia/Phnom_Penh' })
      const repeat_rule = rule.type === 'daily' ? rule : { ...rule, days: [...rule.days] }
      const parent = await repo.create({ title: 'Repeat', due_date, repeat_rule })
      const saved = await repo.setDone(parent.id, true)
      expect(saved.next_todo_id).toMatch(UUID_V4)
      expect((await repo.listAll()).find(({ id }) => id === saved.next_todo_id)).toMatchObject({
        due_date: expected,
        repeat_rule,
      })
    })

    it('validates the effective date and rule, and can remove both in one update', async () => {
      await expect(repo.create({ title: 'Repeat', repeat_rule: daily })).rejects.toMatchObject({
        field: 'due_date',
      })
      const parent = await repo.create({
        title: 'Repeat',
        due_date: '2026-10-24',
        repeat_rule: daily,
      })
      await expect(repo.update(parent.id, { due_date: null })).rejects.toMatchObject({
        field: 'due_date',
      })
      await expect(
        repo.update(parent.id, { repeat_rule: { type: 'weekly', days: [] } }),
      ).rejects.toMatchObject({ field: 'repeat_rule' })
      await expect(
        repo.update(parent.id, { due_date: null, repeat_rule: null }),
      ).resolves.toMatchObject({ due_date: null, repeat_rule: null })
    })

    it('completes a repeat at capacity and copies its active subtasks and reminder only once', async () => {
      repo = new GuestTodoRepository({ db, now: () => clock, timeZone: 'Asia/Phnom_Penh' })
      const parent = await repo.create({
        title: 'Repeat',
        category: 'work',
        due_date: '2026-10-24',
        priority: 'high',
        notes: 'Parent notes',
        repeat_rule: daily,
        remind_at: '2026-10-24T07:00:00Z',
      })
      const child = await repo.create({
        title: 'First',
        parent_id: parent.id,
        priority: 'low',
        notes: 'Child notes',
      })
      clock = new Date('2026-10-24T09:00:00Z')
      const second = await repo.create({ title: 'Second', parent_id: parent.id })
      const deleted = await repo.create({ title: 'Deleted', parent_id: parent.id })
      await repo.delete(deleted.id)
      await repo.setDone(child.id, true)
      await repo.dismissReminder(parent.id)
      clock = new Date('2026-10-24T10:00:00Z')
      await db.todos.bulkAdd(
        Array.from({ length: MAX_TODOS - 3 }, (_, i) => ({
          ...child,
          id: `seed-${i}`,
          parent_id: null,
          due_date: '2026-10-26',
        })),
      )
      expect(await db.todos.filter((row) => !row.deleted_at).count()).toBe(MAX_TODOS)
      const [firstSave, concurrentSave] = await Promise.all([
        repo.setDone(parent.id, true),
        repo.setDone(parent.id, true),
      ])
      const nextId = firstSave.next_todo_id
      expect(nextId).toMatch(UUID_V4)
      expect(concurrentSave.next_todo_id).toBe(nextId)
      expect(firstSave).toMatchObject({
        done_at: clock.toISOString(),
        subtasks: [
          { id: child.id, done_at: '2026-10-24T09:00:00.000Z' },
          { id: second.id, done_at: clock.toISOString() },
        ],
      })
      await repo.setDone(parent.id, false)
      expect((await repo.setDone(parent.id, true)).next_todo_id).toBe(nextId)
      expect(await db.todos.count()).toBe(MAX_TODOS + 4)
      const [next] = await repo.listForDate('2026-10-25')
      expect(next).toMatchObject({
        id: nextId,
        title: parent.title,
        category: parent.category,
        priority: 'high',
        notes: 'Parent notes',
        repeat_rule: daily,
        done_at: null,
        next_todo_id: null,
        remind_at: '2026-10-25T07:00:00.000Z',
        remind_dismissed_at: null,
        subtasks: [
          {
            title: child.title,
            category: child.category,
            priority: 'low',
            notes: 'Child notes',
            done_at: null,
            parent_id: nextId,
          },
          { title: second.title, done_at: null, parent_id: nextId },
        ],
      })
      expect(next?.subtasks[0]?.id).not.toBe(child.id)
      expect(next?.subtasks[1]?.id).not.toBe(second.id)
    })

    it('rolls back the successor and subtask completion when saving the parent fails', async () => {
      const parent = await repo.create({
        title: 'Repeat',
        repeat_rule: daily,
        due_date: '2026-10-24',
      })
      const child = await repo.create({ title: 'Child', parent_id: parent.id })
      db.todos.hook('updating', (_changes, key) => {
        if (key === parent.id) throw new Error('Parent write failed')
      })
      await expect(repo.setDone(parent.id, true)).rejects.toThrow('Parent write failed')
      expect(await db.todos.get(parent.id)).toEqual(parent)
      expect(await db.todos.get(child.id)).toEqual(child)
      expect(await db.todos.count()).toBe(2)
    })

    it('migrates a v4 soft-deleted child in place, preserving parent, notes and priority', async () => {
      const old = new Dexie(db.name)
      old.version(4).stores({
        todos: 'id, due_date, created_at, deleted_at, parent_id',
        schedule_items: 'id',
        schedule_exceptions: 'id, schedule_item_id, date, &[schedule_item_id+date]',
        schedule_checkins: 'id, schedule_item_id, date, &[schedule_item_id+date]',
      })
      const row = {
        id: crypto.randomUUID(),
        parent_id: crypto.randomUUID(),
        title: 'Existing',
        priority: 'low',
        notes: 'saved',
        deleted_at: clock.toISOString(),
        deleted_with_parent: true,
      }
      await old.table('todos').add(row)
      old.close()
      expect(await db.todos.get(row.id)).toEqual({
        ...row,
        repeat_rule: null,
        next_todo_id: null,
        remind_at: null,
        remind_dismissed_at: null,
      })
    })
  })

  describe('validation (docs/08 rule 11)', () => {
    async function expectInvalid(promise: Promise<unknown>, field: string) {
      const error = await promise.catch((e: unknown) => e)
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).field).toBe(field)
    }

    it('requires a title of 1 to 200 characters', async () => {
      await expectInvalid(repo.create({ title: '' }), 'title')
      await expectInvalid(repo.create({ title: '    ' }), 'title')
      await expectInvalid(repo.create({ title: 'x'.repeat(TITLE_MAX_LENGTH + 1) }), 'title')
      expect((await repo.create({ title: 'x'.repeat(TITLE_MAX_LENGTH) })).title).toHaveLength(
        TITLE_MAX_LENGTH,
      )
    })

    it('checks the title on update too', async () => {
      const todo = await repo.create({ title: 'Fine' })
      await expectInvalid(repo.update(todo.id, { title: ' ' }), 'title')
      expect((await db.todos.get(todo.id))?.title).toBe('Fine')
    })

    it('rejects unknown categories and bad dates', async () => {
      await expectInvalid(repo.create({ title: 'x', category: 'faith' as never }), 'category')
      await expectInvalid(repo.create({ title: 'x', due_date: '24/10/2026' }), 'due_date')
      await expectInvalid(repo.create({ title: 'x', due_date: '2026-02-30' }), 'due_date')
    })

    it(`caps manual creation at ${MAX_TODOS} active to-dos and ignores soft-deleted rows`, async () => {
      const stamp = clock.toISOString()
      const rows: Todo[] = Array.from({ length: MAX_TODOS }, (_, i) => ({
        id: `seed-${i}`,
        title: `Seed ${i}`,
        category: 'other',
        priority: 'normal',
        notes: null,
        parent_id: null,
        repeat_rule: null,
        next_todo_id: null,
        remind_at: null,
        due_date: null,
        done_at: null,
        created_at: stamp,
        updated_at: stamp,
      }))
      await db.todos.bulkAdd(rows)
      await expectInvalid(repo.create({ title: 'One too many' }), 'title')
      expect(await db.todos.count()).toBe(MAX_TODOS)

      await repo.delete('seed-0')
      await expect(repo.create({ title: 'Replacement' })).resolves.toMatchObject({
        title: 'Replacement',
      })
      await expectInvalid(repo.create({ title: 'One too many again' }), 'title')
      expect(await repo.listAll()).toHaveLength(MAX_TODOS)
      expect(await repo.listAll({ includeDeleted: true })).toHaveLength(MAX_TODOS + 1)
    })
  })
})
