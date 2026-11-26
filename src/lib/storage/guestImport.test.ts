import { accountDataApi, useSession, type ImportBody } from '@/lib/api'
import type { Todo } from '@/features/todos/types'
import { HttpResponse, makeTokenResponse } from '@/test/apiMocks'
import { importBackend, type AccountTodo } from '@/test/importBackend'
import { GuestDatabase } from './db'
import { GuestDailyIntentionRepository } from './GuestDailyIntentionRepository'
import { GuestFocusSessionRepository } from './GuestFocusSessionRepository'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { GuestTodoRepository } from './GuestTodoRepository'
import { saveGuestPlan, type GuestStorage } from './saveGuestPlan'

let name: string
let db: GuestDatabase
let guest: GuestStorage

function openGuest() {
  db = new GuestDatabase(name)
  guest = {
    todos: new GuestTodoRepository({ db }),
    schedule: new GuestScheduleRepository({ db }),
    intentions: new GuestDailyIntentionRepository(db),
    focusSessions: new GuestFocusSessionRepository({ db }),
  }
}

beforeEach(() => {
  name = `import-${crypto.randomUUID()}`
  openGuest()
  useSession.getState().signIn(makeTokenResponse())
})

afterEach(() => db.delete())

/** Plain to-dos written straight to IndexedDB, past the manual-creation limit when a test needs it. */
async function addManual(count: number): Promise<Todo[]> {
  const stamp = '2026-10-01T00:00:00.000Z'
  const rows = Array.from({ length: count }, (_, i): Todo => ({
    id: crypto.randomUUID(),
    title: `Task ${i}`,
    category: 'other',
    priority: 'normal',
    notes: null,
    parent_id: null,
    repeat_rule: null,
    next_todo_id: null,
    remind_at: null,
    remind_dismissed_at: null,
    due_date: null,
    done_at: null,
    created_at: stamp,
    updated_at: stamp,
  }))
  await db.todos.bulkAdd(rows)
  return rows
}

/** A daily to-do with `subtasks` subtasks, checked off `checkOffs` times through the repository. */
async function repeatChain(checkOffs: number, subtasks = 0): Promise<string[]> {
  const original = await guest.todos.create({
    title: 'Daily',
    due_date: '2026-10-01',
    repeat_rule: { type: 'daily' },
  })
  for (let i = 0; i < subtasks; i += 1) {
    await guest.todos.create({ title: `Step ${i}`, parent_id: original.id })
  }
  const occurrences = [original.id]
  for (let i = 0; i < checkOffs; i += 1) {
    const done = await guest.todos.setDone(occurrences[i] ?? '', true)
    occurrences.push(done.next_todo_id ?? '')
  }
  return occurrences
}

/** Every active guest to-do is on the account exactly once, with its fields and links. */
async function expectImported(account: Map<string, AccountTodo>, active: Todo[]) {
  expect(account.size).toBe(active.length)
  for (const todo of active) {
    expect(account.get(todo.id)?.row).toEqual(
      expect.objectContaining({
        id: todo.id,
        title: todo.title,
        parent_id: todo.parent_id,
        next_todo_id: todo.next_todo_id,
        repeat_rule: todo.repeat_rule,
        due_date: todo.due_date,
        done_at: todo.done_at,
      }),
    )
  }
  expect(await db.todos.count()).toBe(0)
}

/** Ids sent in an earlier call than `index`. */
const sentBefore = (calls: ImportBody[], index: number) =>
  new Set(calls.slice(0, index).flatMap(({ todos }) => todos.map(({ id }) => id)))

// Building long repeat chains through IndexedDB takes a few seconds.
describe('guest import of repeat-generated to-dos (DECISIONS I9)', { timeout: 30_000 }, () => {
  it.each([
    { manual: 499, generated: 0, sizes: [499] },
    { manual: 499, generated: 1, sizes: [500] },
    { manual: 499, generated: 2, sizes: [500, 1] },
    { manual: 500, generated: 1, sizes: [500, 1] },
  ])(
    'imports $manual manual and $generated generated to-dos in calls of $sizes',
    async ({ manual, generated, sizes }) => {
      await repeatChain(generated)
      await addManual(manual - 1)
      const active = await guest.todos.listAll()
      const { account, calls } = importBackend()

      await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

      expect(calls.map(({ todos }) => todos.length)).toEqual(sizes)
      await expectImported(account, active)
    },
  )

  it('imports 500 manual to-dos and 600 generated occurrences with subtasks', async () => {
    await repeatChain(150, 1)
    await repeatChain(150, 1)
    await addManual(496)
    const active = await guest.todos.listAll()
    expect(active).toHaveLength(1100)
    const { account, calls } = importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls.map(({ todos }) => todos.length)).toEqual([500, 500, 100])
    await expectImported(account, active)
  })

  it('links calls only to rows sent earlier, so a chain and its subtasks can cross calls', async () => {
    const chains = [await repeatChain(120, 1), await repeatChain(200, 2)]
    await addManual(50)
    const active = await guest.todos.listAll()
    const { account, calls } = importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls).toHaveLength(2)
    const crossing = calls.flatMap(({ todos }, index) => {
      const earlier = sentBefore(calls, index)
      return todos.filter(
        ({ parent_id, next_todo_id }) =>
          (parent_id && earlier.has(parent_id)) || (next_todo_id && earlier.has(next_todo_id)),
      )
    })
    expect(crossing.length).toBeGreaterThan(0)
    for (const occurrences of chains) {
      const order = calls.flatMap(({ todos }) => todos.map(({ id }) => id))
      const positions = occurrences.map((id) => order.indexOf(id))
      // Newest occurrence first, the original last.
      expect(positions).toEqual([...positions].sort((a, b) => b - a))
    }
    await expectImported(account, active)
  })

  it('fits an almost full account when the final manual count is exactly 500', async () => {
    await repeatChain(300, 2)
    await addManual(196)
    const active = await guest.todos.listAll()
    const existing = Array.from({ length: 301 }, () => ({
      id: crypto.randomUUID(),
      parent_id: null,
      next_todo_id: null,
    }))
    const { account, calls } = importBackend({ todos: existing })

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls.map(({ todos }) => todos.length)).toEqual([500, 500, 99])
    expect(account.size).toBe(301 + active.length)
    for (const { id, parent_id, next_todo_id } of active) {
      expect(account.get(id)).toMatchObject({ parent_id, next_todo_id })
    }
  })

  it('fits an almost full account when a later occurrence has more subtasks than the original', async () => {
    const [, first] = await repeatChain(1)
    for (let i = 0; i < 300; i += 1) {
      await guest.todos.create({ title: `Added ${i}`, parent_id: first ?? '' })
    }
    await guest.todos.setDone(first ?? '', true)
    const active = await guest.todos.listAll()
    expect(active).toHaveLength(603)
    const existing = Array.from({ length: 499 }, () => ({
      id: crypto.randomUUID(),
      parent_id: null,
      next_todo_id: null,
    }))
    // Sending a waiting occurrence with its own subtasks would count them as manual too.
    const { account, calls } = importBackend({ todos: existing })

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls.map(({ todos }) => todos.length)).toEqual([500, 103])
    expect(account.size).toBe(499 + 603)
  })

  it('keeps the whole plan when the account has one manual to-do too many', async () => {
    await repeatChain(300, 2)
    await addManual(196)
    const before = await db.todos.toArray()
    const existing = Array.from({ length: 302 }, () => ({
      id: crypto.randomUUID(),
      parent_id: null,
      next_todo_id: null,
    }))
    importBackend({ todos: existing })

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({
      status: 422,
      errors: { todos: ['No'] },
    })

    expect(await db.todos.toArray()).toEqual(before)
  })

  it('keeps everything after a later call fails, then a replay after reload finishes without duplicates', async () => {
    await repeatChain(400, 1)
    await addManual(298)
    const item = await guest.schedule.create({
      title: 'Math',
      start_time: '08:00',
      end_time: '09:00',
      days: [0],
      starts_on: '2026-01-01',
    })
    await db.schedule_checkins.bulkAdd(
      Array.from({ length: 12000 }, (_, i) => ({
        id: crypto.randomUUID(),
        schedule_item_id: item.id,
        date: `d${i}`,
        done_at: '2026-10-26T03:00:00Z',
      })),
    )
    await db.dailyIntentions.put({ date: '2026-10-26', text: 'Finish the plan' })
    const before = await db.todos.toArray()
    const active = await guest.todos.listAll()
    const boom = () => HttpResponse.json({ message: 'Boom' }, { status: 500 })
    const { account, calls, checkins } = importBackend({
      fail: (call) => (call === 2 ? boom() : undefined),
    })

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 500 })
    expect(account.size).toBe(500)
    expect(await db.todos.toArray()).toEqual(before)
    expect(await db.schedule_checkins.count()).toBe(12000)
    expect(await db.dailyIntentions.count()).toBe(1)
    expect(await guest.schedule.listItems()).toHaveLength(1)

    db.close()
    openGuest()
    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    // Failed call 2, then the replay: calls 3 to 5.
    expect(calls.map(({ todos }) => todos.length)).toEqual([500, 500, 500, 500, 100])
    expect(calls.map(({ checkins: rows }) => rows.length)).toEqual([10000, 2000, 10000, 2000, 0])
    expect(calls.map(({ schedule_items }) => schedule_items.length)).toEqual([1, 0, 1, 0, 0])
    expect(calls.map(({ daily_intentions }) => daily_intentions.length)).toEqual([1, 0, 1, 0, 0])
    expect(calls.slice(2, 4)).toEqual(calls.slice(0, 2))
    expect(checkins.size).toBe(12000)
    await expectImported(account, active)
    expect(await db.schedule_checkins.count()).toBe(0)
  })

  it('refuses an id that belongs to another account and keeps the plan', async () => {
    await repeatChain(3, 1)
    const [taken] = await addManual(495)
    const before = await db.todos.toArray()
    const { account, calls } = importBackend({ foreignIds: [taken?.id ?? ''] })

    const error: unknown = await saveGuestPlan(guest, accountDataApi).catch((e: unknown) => e)

    const index = calls.at(-1)?.todos.findIndex(({ id }) => id === taken?.id)
    expect(error).toMatchObject({ status: 422, errors: { [`todos.${index}.id`]: ['No'] } })
    expect(account.has(taken?.id ?? '')).toBe(false)
    expect(await db.todos.toArray()).toEqual(before)
  })

  it('sends a small plan in one call, each to-do followed by its subtasks', async () => {
    const parent = await guest.todos.create({ title: 'Pack' })
    const child = await guest.todos.create({ title: 'Socks', parent_id: parent.id })
    const plain = await guest.todos.create({ title: 'Read' })
    const { calls } = importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls).toHaveLength(1)
    const ids = calls[0]?.todos.map(({ id }) => id) ?? []
    expect(ids).toHaveLength(3)
    expect(ids.indexOf(child.id)).toBe(ids.indexOf(parent.id) + 1)
    expect(ids).toContain(plain.id)
  })

  it('sends nothing and keeps the plan when links form a loop the import cannot order', async () => {
    const [a, b] = await addManual(2)
    await db.todos.update(a?.id ?? '', { next_todo_id: b?.id })
    await db.todos.update(b?.id ?? '', { next_todo_id: a?.id })
    const before = await db.todos.toArray()
    const { calls } = importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toThrow(/cannot represent/)

    expect(calls).toEqual([])
    expect(await db.todos.toArray()).toEqual(before)
  })

  // Recorded limit (QA-024): a guest's deleted occurrence cannot be imported, so the next
  // occurrence loses the link that proves it was generated. See docs/PROGRESS.md.
  it('keeps the plan when a deleted middle occurrence leaves its successor counted as manual', async () => {
    const [, middle] = await repeatChain(2)
    await addManual(499)
    await guest.todos.delete(middle ?? '')
    const before = await db.todos.toArray()
    importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({
      status: 422,
      errors: { todos: ['No'] },
    })

    expect(await db.todos.toArray()).toEqual(before)
  })
})
