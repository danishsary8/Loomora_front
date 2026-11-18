import { accountDataApi, useSession, type ImportBody } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { GuestDatabase } from './db'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { GuestTodoRepository } from './GuestTodoRepository'
import {
  checkOffCount,
  hadFullDay,
  isEmptyPlan,
  readGuestPlan,
  saveGuestPlan,
} from './saveGuestPlan'

const COUNTS = { created: 1, skipped: 0 }
const RESULT = { todos: COUNTS, schedule_items: COUNTS, exceptions: COUNTS, checkins: COUNTS }

let db: GuestDatabase
let guest: { todos: GuestTodoRepository; schedule: GuestScheduleRepository }

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
  guest = { todos: new GuestTodoRepository({ db }), schedule: new GuestScheduleRepository({ db }) }
  useSession.getState().signIn(makeTokenResponse())
})

afterEach(() => db.delete())

describe('saveGuestPlan (docs/08 rule 9)', () => {
  it('sends every row with its client id, then clears the device', async () => {
    const { todo, item } = await fillGuest()
    let body: ImportBody | undefined
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        body = (await request.json()) as ImportBody
        return HttpResponse.json({ data: RESULT })
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
        bodies.push((await request.json()) as ImportBody)
        calls += 1
        if (calls === 1) return HttpResponse.json({ message: 'Boom' }, { status: 500 })
        const skipped = { created: 0, skipped: 1 }
        return HttpResponse.json({
          data: { todos: skipped, schedule_items: skipped, exceptions: skipped, checkins: skipped },
        })
      }),
    )

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toBeDefined()
    expect(await saveGuestPlan(guest, accountDataApi)).toBe(true)

    expect(bodies).toHaveLength(2)
    expect(bodies[1]).toEqual(bodies[0])
    expect(isEmptyPlan(await readGuestPlan(guest))).toBe(true)
  })

  it('does not call the API when there is nothing to move', async () => {
    // No handler for POST /import: MSW fails the test on an unhandled request.
    expect(await saveGuestPlan(guest, accountDataApi)).toBe(false)
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
