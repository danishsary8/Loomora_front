import { accountDataApi, useSession, type ImportBody } from '@/lib/api'
import { MAX_TODOS } from '@/features/todos/types'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { acknowledgeImport, importBackend } from '@/test/importBackend'
import { GuestDatabase } from './db'
import { GuestDailyIntentionRepository } from './GuestDailyIntentionRepository'
import { GuestFocusSessionRepository } from './GuestFocusSessionRepository'
import type { GuestStorage } from './saveGuestPlan'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { GuestTodoRepository } from './GuestTodoRepository'
import {
  checkOffCount,
  hadFullDay,
  isEmptyPlan,
  readGuestPlan,
  saveGuestPlan,
} from './saveGuestPlan'

let db: GuestDatabase
let guest: GuestStorage

async function fillGuest() {
  const todo = await guest.todos.create({ title: 'Read', due_date: '2026-10-26' })
  await guest.todos.setDone(todo.id, true)
  const item = await guest.schedule.create({
    title: 'Math',
    start_time: '08:00',
    end_time: '09:00',
    days: [0],
    starts_on: '2026-10-01',
  })
  await guest.schedule.setException(item.id, '2026-10-26', { type: 'override', title: 'Lab' })
  await guest.schedule.setCheckin(item.id, '2026-10-26', true)
  return { todo, item }
}

beforeEach(() => {
  db = new GuestDatabase(`test-${crypto.randomUUID()}`)
  guest = {
    todos: new GuestTodoRepository({ db }),
    schedule: new GuestScheduleRepository({ db }),
    intentions: new GuestDailyIntentionRepository(db),
    focusSessions: new GuestFocusSessionRepository({ db }),
  }
  useSession.getState().signIn(makeTokenResponse())
})

afterEach(() => db.delete())

describe('saveGuestPlan (docs/08 rule 9)', () => {
  // The plan has one repeat successor, which does not count toward the 500 (DECISIONS I9).
  it.each([
    { active: 499, account: 0, accepted: true },
    { active: 499, account: 2, accepted: true },
    { active: 500, account: 1, accepted: true },
    { active: 500, account: 2, accepted: false },
    { active: 501, account: 0, accepted: true },
    { active: 501, account: 1, accepted: false },
  ])(
    'imports $active active rows into an account with $account existing rows (accepted: $accepted)',
    async ({ active, account, accepted }) => {
      const parent = await guest.todos.create({
        title: 'Daily',
        due_date: '2026-10-26',
        repeat_rule: { type: 'daily' },
      })
      const deleted = await guest.todos.create({ title: 'Soft-deleted' })
      await guest.todos.delete(deleted.id)
      await db.todos.bulkAdd(
        Array.from({ length: active - 2 }, () => ({
          ...deleted,
          id: crypto.randomUUID(),
          deleted_at: null,
        })),
      )
      const completed = await guest.todos.setDone(parent.id, true)
      const before = await guest.todos.listAll({ includeDeleted: true })
      expect(before).toHaveLength(active + 1)
      if (active >= MAX_TODOS) {
        await expect(guest.todos.create({ title: 'Over limit' })).rejects.toMatchObject({
          field: 'title',
        })
      }

      const { calls } = importBackend({
        todos: Array.from({ length: account }, () => ({
          id: crypto.randomUUID(),
          parent_id: null,
          next_todo_id: null,
        })),
      })

      if (!accepted) {
        await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 422 })
        expect(await guest.todos.listAll({ includeDeleted: true })).toEqual(before)
        return
      }
      await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)
      expect(await guest.todos.listAll({ includeDeleted: true })).toEqual([])
      expect(calls).toHaveLength(Math.ceil(active / MAX_TODOS))
      const sent = calls.flatMap(({ todos }) => todos)
      expect(sent).toHaveLength(active)
      expect(sent).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: parent.id, next_todo_id: completed.next_todo_id }),
          expect.objectContaining({ id: completed.next_todo_id, done_at: null }),
        ]),
      )
      expect(sent.some(({ id }) => id === deleted.id)).toBe(false)
    },
  )

  it('imports parents and subtasks together with their original UUIDs and keeps them after rejection', async () => {
    const parent = await guest.todos.create({ title: 'Parent', priority: 'high', notes: 'Book' })
    const child = await guest.todos.create({
      title: 'Child',
      parent_id: parent.id,
      priority: 'low',
      notes: 'Pencil',
    })
    const calls: ImportBody[] = []
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        const body = (await request.json()) as ImportBody
        calls.push(body)
        if (calls.length === 1) return HttpResponse.json({ message: 'Invalid' }, { status: 422 })
        return HttpResponse.json({ data: acknowledgeImport(body) })
      }),
    )
    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 422 })
    expect((await guest.todos.listAll()).map(({ id }) => id).sort()).toEqual(
      [parent.id, child.id].sort(),
    )
    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)
    expect(calls[0]?.todos).toEqual([
      expect.objectContaining({ id: parent.id, parent_id: null, priority: 'high', notes: 'Book' }),
      expect.objectContaining({
        id: child.id,
        parent_id: parent.id,
        priority: 'low',
        notes: 'Pencil',
      }),
    ])
    expect(calls[1]).toEqual(calls[0])
    expect(await guest.todos.listAll()).toEqual([])
  })

  it('sends every row with its client id, then clears the device', async () => {
    const { todo, item } = await fillGuest()
    let body: ImportBody | undefined
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        body = (await request.json()) as ImportBody
        return HttpResponse.json({ data: acknowledgeImport(body) })
      }),
    )

    expect(await saveGuestPlan(guest, accountDataApi)).toBe(true)

    expect(body?.todos).toEqual([
      expect.objectContaining({ id: todo.id, title: 'Read', done_at: expect.any(String) }),
    ])
    expect(body?.schedule_items).toEqual([
      expect.objectContaining({ id: item.id, days: [0], starts_on: '2026-10-01' }),
    ])
    expect(body?.exceptions).toEqual([
      expect.objectContaining({ schedule_item_id: item.id, date: '2026-10-26', title: 'Lab' }),
    ])
    expect(body?.checkins).toEqual([
      expect.objectContaining({ schedule_item_id: item.id, date: '2026-10-26' }),
    ])
    expect(isEmptyPlan(await readGuestPlan(guest))).toBe(true)
    expect(await db.schedule_exceptions.count()).toBe(0)
    expect(await db.schedule_checkins.count()).toBe(0)
  })

  it.each([
    ['a server error', () => HttpResponse.json({ message: 'Boom' }, { status: 500 })],
    [
      'a rejected row',
      () =>
        HttpResponse.json(
          { message: 'Invalid', errors: { 'todos.0.title': ['Too long.'] } },
          { status: 422 },
        ),
    ],
    ['no connection', () => HttpResponse.error()],
  ])('keeps the guest data after %s', async (_name, answer) => {
    await fillGuest()
    server.use(http.post(`${API}/import`, answer))

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toBeDefined()

    const plan = await readGuestPlan(guest)
    expect(plan.todos).toHaveLength(1)
    expect(plan.items).toHaveLength(1)
    expect(plan.exceptions).toHaveLength(1)
    expect(plan.checkins).toHaveLength(1)
  })

  it('is safe to retry: the same ids are sent again and the server skips what it has', async () => {
    await fillGuest()
    const bodies: ImportBody[] = []
    let calls = 0
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        const body = (await request.json()) as ImportBody
        bodies.push(body)
        calls += 1
        if (calls === 1) return HttpResponse.json({ message: 'Boom' }, { status: 500 })
        const result = acknowledgeImport(body)
        return HttpResponse.json({
          data: Object.fromEntries(
            Object.entries(result).map(([key, count]) => [
              key,
              { created: 0, skipped: count.created },
            ]),
          ),
        })
      }),
    )

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toBeDefined()
    expect(await saveGuestPlan(guest, accountDataApi)).toBe(true)

    expect(bodies).toHaveLength(2)
    expect(bodies[1]).toEqual(bodies[0])
    expect(isEmptyPlan(await readGuestPlan(guest))).toBe(true)
  })

  it('clears a soft-deleted to-do after an intention-only import succeeds', async () => {
    const todo = await guest.todos.create({ title: 'Old task' })
    await guest.todos.delete(todo.id)
    expect((await db.todos.get(todo.id))?.deleted_at).toEqual(expect.any(String))
    await db.dailyIntentions.put({ date: '2026-11-19', text: 'One intention' })
    let payload: ImportBody | undefined
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        payload = (await request.json()) as ImportBody
        return HttpResponse.json({ data: acknowledgeImport(payload) })
      }),
    )

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)
    expect(payload?.todos).toEqual([])
    expect(await db.todos.get(todo.id)).toBeUndefined()
  })

  it.each([200, 422])(
    'preserves concurrent edits, deletes and restores when import returns %i',
    async (status) => {
      const original = await guest.todos.create({ title: 'Original' })
      const toDelete = await guest.todos.create({ title: 'Delete during import' })
      const toRestore = await guest.todos.create({ title: 'Restore during import' })
      const obsolete = await guest.todos.create({ title: 'Already deleted' })
      await guest.todos.delete(toRestore.id)
      await guest.todos.delete(obsolete.id)
      let finish!: () => void
      let start!: () => void
      const pending = new Promise<void>((resolve) => {
        finish = resolve
      })
      const started = new Promise<void>((resolve) => {
        start = resolve
      })
      server.use(
        http.post(`${API}/import`, async ({ request }) => {
          const body = (await request.json()) as ImportBody
          start()
          await pending
          return HttpResponse.json(
            status === 200 ? { data: acknowledgeImport(body) } : { message: 'Invalid' },
            {
              status,
            },
          )
        }),
      )

      const result = saveGuestPlan(guest, accountDataApi)
      await started
      await guest.todos.update(original.id, { title: 'Edited during import' })
      await guest.todos.delete(toDelete.id)
      await guest.todos.restore(toRestore.id)
      await guest.todos.create({ title: 'Added during import' })
      const afterEdits = await db.todos.toArray()
      finish()
      if (status === 200) await expect(result).resolves.toBe(true)
      else await expect(result).rejects.toMatchObject({ status })

      expect(await db.todos.toArray()).toEqual(
        status === 200 ? afterEdits.filter(({ id }) => id !== obsolete.id) : afterEdits,
      )
    },
  )

  it('does not call the API when there is nothing to move', async () => {
    // No handler for POST /import: MSW fails the test on an unhandled request.
    expect(await saveGuestPlan(guest, accountDataApi)).toBe(false)
  })
})

describe('saveGuestPlan in chunks', () => {
  async function fillManyCheckins(count: number) {
    const item = await guest.schedule.create({
      title: 'Math',
      start_time: '08:00',
      end_time: '09:00',
      days: [0],
      starts_on: '2026-01-01',
    })
    await db.schedule_checkins.bulkAdd(
      Array.from({ length: count }, (_, i) => ({
        id: crypto.randomUUID(),
        schedule_item_id: item.id,
        date: `d${i}`,
        done_at: '2026-10-26T03:00:00Z',
      })),
    )
  }

  it('sends 12000 check-ins in 2 calls, items first, then clears the device', async () => {
    await fillManyCheckins(12000)
    const bodies: ImportBody[] = []
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        const body = (await request.json()) as ImportBody
        bodies.push(body)
        return HttpResponse.json({ data: acknowledgeImport(body) })
      }),
    )

    expect(await saveGuestPlan(guest, accountDataApi)).toBe(true)

    expect(bodies.map((b) => b.checkins.length)).toEqual([10000, 2000])
    expect(bodies.map((b) => b.schedule_items.length)).toEqual([1, 0])
    expect(await db.schedule_checkins.count()).toBe(0)
  })

  it('keeps all local data when the second call fails, and a retry sends no duplicates', async () => {
    await fillManyCheckins(12000)
    const parent = await guest.todos.create({
      title: 'Daily',
      due_date: '2026-10-26',
      repeat_rule: { type: 'daily' },
    })
    const reminder = await guest.todos.create({ title: 'Call', remind_at: '2026-10-26T03:00:00Z' })
    const dismissed = await guest.todos.dismissReminder(reminder.id)
    const child = await guest.todos.create({ title: 'Child', parent_id: parent.id })
    const completed = await guest.todos.setDone(parent.id, true)
    const nextId = completed.next_todo_id
    expect(nextId).toBeTruthy()
    const seenTodos: ImportBody['todos'][] = []
    const sent = new Set<string>()
    let calls = 0
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        calls += 1
        if (calls === 2) return HttpResponse.json({ message: 'Boom' }, { status: 500 })
        const body = (await request.json()) as ImportBody
        seenTodos.push(body.todos)
        body.checkins.forEach((c) => sent.add(c.id))
        return HttpResponse.json({ data: acknowledgeImport(body) })
      }),
    )

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toBeDefined()
    expect(await db.schedule_checkins.count()).toBe(12000)
    expect((await readGuestPlan(guest)).items).toHaveLength(1)
    expect((await readGuestPlan(guest)).todos).toHaveLength(5)
    expect(seenTodos[0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: parent.id,
          repeat_rule: { type: 'daily' },
          next_todo_id: nextId,
        }),
        expect.objectContaining({ id: nextId, repeat_rule: { type: 'daily' }, next_todo_id: null }),
        expect.objectContaining({ id: child.id, parent_id: parent.id }),
        expect.objectContaining({
          id: reminder.id,
          remind_at: '2026-10-26T03:00:00.000Z',
          remind_dismissed_at: dismissed.remind_dismissed_at,
        }),
        expect.objectContaining({ parent_id: nextId, done_at: null }),
      ]),
    )

    expect(await saveGuestPlan(guest, accountDataApi)).toBe(true)
    // The server skips ids it has; every id reached it, and none is outside the plan.
    expect(sent.size).toBe(12000)
    expect(seenTodos[1]).toEqual(seenTodos[0])
    expect(await guest.todos.listAll()).toEqual([])
    expect(await db.schedule_checkins.count()).toBe(0)
  })
})

describe('checkOffCount', () => {
  it('counts done to-dos and schedule check-ins', async () => {
    await fillGuest()
    await guest.todos.create({ title: 'Open' })
    expect(checkOffCount(await readGuestPlan(guest))).toBe(2)
  })
})

describe('hadFullDay', () => {
  it('needs a past day whose to-dos are all done', async () => {
    const done = await guest.todos.create({ title: 'a', due_date: '2026-10-20' })
    await guest.todos.setDone(done.id, true)
    await guest.todos.create({ title: 'b', due_date: '2026-10-21' })
    expect(hadFullDay(await readGuestPlan(guest), '2026-10-26')).toBe(true)
    expect(hadFullDay(await readGuestPlan(guest), '2026-10-20')).toBe(false)
  })

  it('is false when every past day has an open to-do or only undated and future to-dos exist', async () => {
    const half = await guest.todos.create({ title: 'a', due_date: '2026-10-20' })
    await guest.todos.setDone(half.id, true)
    await guest.todos.create({ title: 'b', due_date: '2026-10-20' })
    const today = await guest.todos.create({ title: 'c', due_date: '2026-10-26' })
    await guest.todos.setDone(today.id, true)
    const undated = await guest.todos.create({ title: 'd' })
    await guest.todos.setDone(undated.id, true)
    expect(hadFullDay(await readGuestPlan(guest), '2026-10-26')).toBe(false)
  })
})
