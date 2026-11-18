import 'fake-indexeddb/auto'
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

  it('deletes a to-do', async () => {
    const todo = await repo.create({ title: 'Delete me' })
    await repo.delete(todo.id)
    expect(await db.todos.get(todo.id)).toBeUndefined()
    expect(await repo.listForDate('2026-10-24')).toEqual([])
  })

  it('throws NotFoundError for unknown ids', async () => {
    await expect(repo.update('missing', { title: 'x' })).rejects.toBeInstanceOf(NotFoundError)
    await expect(repo.setDone('missing', true)).rejects.toBeInstanceOf(NotFoundError)
  })

  it('keeps data across repository instances (reopen the app)', async () => {
    const todo = await repo.create({ title: 'Persist me', due_date: '2026-10-24' })
    db.close()
    const reopened = new GuestDatabase(db.name)
    const again = new GuestTodoRepository({ db: reopened })
    expect((await again.listForDate('2026-10-24')).map((t) => t.id)).toEqual([todo.id])
    reopened.close()
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

    it(`allows at most ${MAX_TODOS} to-dos`, async () => {
      const stamp = clock.toISOString()
      const rows: Todo[] = Array.from({ length: MAX_TODOS }, (_, i) => ({
        id: `seed-${i}`,
        title: `Seed ${i}`,
        category: 'other',
        due_date: null,
        done_at: null,
        created_at: stamp,
        updated_at: stamp,
      }))
      await db.todos.bulkAdd(rows)
      await expectInvalid(repo.create({ title: 'One too many' }), 'title')
      expect(await db.todos.count()).toBe(MAX_TODOS)
    })
  })
})
