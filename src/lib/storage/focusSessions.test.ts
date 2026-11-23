import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import {
  newFocusSessionId,
  type FocusSession,
  type FocusSessionInput,
} from '@/features/focus/types'
import { focusSessionsApi, useSession } from '@/lib/api'
import { newId } from '@/lib/id'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { GuestDatabase } from './db'
import { GuestFocusSessionRepository } from './GuestFocusSessionRepository'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { ServerFocusSessionRepository } from './ServerFocusSessionRepository'
import type { FocusSessionRepository } from './FocusSessionRepository'

const endpoint = `${API}/focus-sessions`
const date = '2026-11-23'
const createdAt = '2026-11-24T08:00:00.000Z'
const scheduleId = '1a2b3c4d-0000-4000-8000-000000000001'
const input = (): FocusSessionInput => ({
  id: newFocusSessionId(),
  mode: 'stopwatch',
  started_at: '2026-11-23T23:59:59.999+07:00',
  ended_at: '2026-11-24T00:00:00.019+07:00',
  end_reason: 'ended_early',
  label: 'Read chapter 4',
  segments: [
    {
      type: 'focus',
      started_at: '2026-11-23T23:59:59.999+07:00',
      ended_at: '2026-11-24T00:00:00.019+07:00',
      active_ms: 17,
    },
  ],
  laps: [1, 17],
})
function response(payload: FocusSessionInput): FocusSession {
  return {
    ...payload,
    started_at: '2026-11-23T16:59:59.999Z',
    ended_at: '2026-11-23T17:00:00.019Z',
    local_date: date,
    planned_focus_ms: null,
    todo_id: null,
    schedule_item_id: payload.schedule_item_id ?? null,
    label: 'Read chapter 4',
    segments: [
      {
        type: 'focus',
        started_at: '2026-11-23T16:59:59.999Z',
        ended_at: '2026-11-23T17:00:00.019Z',
        active_ms: 17,
      },
    ],
    laps: [1, 17],
    focus_ms: 17,
    break_ms: 0,
    paused_ms: 3,
    created_at: createdAt,
  }
}

let db: GuestDatabase
const guestRepo = () =>
  new GuestFocusSessionRepository({
    db,
    timeZone: 'Asia/Phnom_Penh',
    now: () => new Date(createdAt),
  })
const accountRepo = () => new ServerFocusSessionRepository(focusSessionsApi, db)
function reload() {
  db.close()
  db = new GuestDatabase(db.name)
}

beforeEach(() => {
  db = new GuestDatabase(`focus-${newId()}`)
  useSession.getState().signIn(makeTokenResponse())
})
afterEach(async () => {
  await db.delete()
})

describe.each(['guest', 'account'] as const)('%s Focus repository', (mode) => {
  it('records and reads exact milliseconds by UUID and starting local date', async () => {
    const payload = input()
    const expected = response(payload)
    if (mode === 'account') {
      server.use(
        http.post(endpoint, async ({ request }) => {
          expect(request.headers.get('Authorization')).toBe('Bearer 1|test-token')
          expect(await request.json()).toEqual(payload)
          return HttpResponse.json({ data: expected }, { status: 201 })
        }),
        http.get(`${endpoint}/:id`, ({ params }) =>
          params.id === payload.id
            ? HttpResponse.json({ data: expected })
            : new HttpResponse(null, { status: 404 }),
        ),
        http.get(endpoint, ({ request }) =>
          HttpResponse.json({
            data: new URL(request.url).searchParams.get('date') === date ? [expected] : [],
          }),
        ),
      )
    }
    const open = (): FocusSessionRepository => (mode === 'guest' ? guestRepo() : accountRepo())
    await expect(open().record(payload)).resolves.toEqual(expected)
    reload()
    const repo = open()
    await expect(repo.get(payload.id)).resolves.toEqual(expected)
    await expect(repo.get(newId())).rejects.toMatchObject({ status: 404 })
    await expect(repo.listForDate(date)).resolves.toEqual([expected])
    await expect(repo.listForDate('2026-11-24')).resolves.toEqual([])
  })
})

it('keeps guest history immutable on duplicate IDs and after a linked schedule is deleted', async () => {
  const schedule = new GuestScheduleRepository({ db })
  const item = await schedule.create({
    title: 'Read chapter 4',
    start_time: '09:00',
    end_time: '10:00',
    days: [1],
  })
  const payload = { ...input(), schedule_item_id: item.id, label: '\u00a0Read chapter 4\u00a0' }
  const repo = guestRepo()
  const original = await repo.record(payload)
  await schedule.delete(item.id)
  await expect(
    repo.record({ ...payload, label: item.title, ended_at: '2026-11-23T17:00:00.019Z' }),
  ).resolves.toEqual(original)
  await expect(repo.record({ ...payload, label: 'Changed' })).rejects.toMatchObject({ status: 409 })
  await expect(repo.get(payload.id)).resolves.toEqual(original)
})

it('preserves pre-existing IndexedDB stores and records while upgrading v8', async () => {
  const old = new Dexie(db.name)
  old.version(8).stores({
    todos: 'id, due_date, created_at, deleted_at, parent_id',
    schedule_items: 'id',
    schedule_exceptions: 'id, schedule_item_id, date, &[schedule_item_id+date]',
    schedule_checkins: 'id, schedule_item_id, date, &[schedule_item_id+date]',
    meta: 'key',
    dailyIntentions: 'date',
  })
  const rows = [
    ['todos', { id: newId(), title: 'Keep to-do' }],
    ['schedule_items', { id: scheduleId, title: 'Keep schedule' }],
    ['schedule_exceptions', { id: newId(), schedule_item_id: scheduleId, date }],
    ['schedule_checkins', { id: newId(), schedule_item_id: scheduleId, date }],
    ['meta', { key: 'preferences', value: { timeFormat: '24h' } }],
    ['dailyIntentions', { date, intention: 'Keep intention' }],
  ] as const
  for (const [table, row] of rows) await old.table(table).add(row)
  old.close()
  await guestRepo().record(input())
  for (const [table, row] of rows) await expect(db.table(table).toArray()).resolves.toEqual([row])
})

it('rejects inconsistent guest segment data without persisting a finished session', async () => {
  const payload = input()
  const repo = guestRepo()
  payload.segments = payload.segments.map((segment) => ({ ...segment, active_ms: 21 }))
  await expect(repo.record(payload)).rejects.toMatchObject({ status: 422 })
  await expect(repo.listForDate(date)).resolves.toEqual([])
})

it('replays the same finished payload after network and 5xx failures across reloads', async () => {
  const payload = { ...input(), schedule_item_id: scheduleId }
  const requests: unknown[] = []
  server.use(
    http.post(endpoint, async ({ request }) => {
      requests.push(await request.json())
      if (requests.length === 1) return HttpResponse.error()
      if (requests.length === 2) return new HttpResponse(null, { status: 503 })
      return HttpResponse.json(
        { data: response({ ...payload, schedule_item_id: null }) },
        { status: 200 },
      )
    }),
  )
  await expect(accountRepo().record(payload)).rejects.toMatchObject({ status: 0 })
  reload()
  await expect(accountRepo().retry(payload.id)).rejects.toMatchObject({ status: 503 })
  reload()
  await expect(accountRepo().listPending()).resolves.toMatchObject([
    { original: payload, status: 'pending' },
  ])
  await expect(accountRepo().retry(payload.id)).resolves.toEqual(
    response({ ...payload, schedule_item_id: null }),
  )
  expect(requests).toEqual([payload, payload, payload])
  await expect(accountRepo().listPending()).resolves.toEqual([])
  await expect(accountRepo().getLocalRecord(payload.id)).resolves.toBeUndefined()
})

it('retains a conflict without resending it', async () => {
  const payload = input()
  let posts = 0
  server.use(
    http.post(endpoint, () => {
      posts++
      return new HttpResponse(null, { status: 409 })
    }),
  )
  await expect(accountRepo().record(payload)).rejects.toMatchObject({ status: 409 })
  reload()
  const repo = accountRepo()
  await expect(repo.retry(payload.id)).rejects.toMatchObject({ status: 409 })
  await expect(repo.record(payload)).rejects.toMatchObject({ status: 409 })
  await expect(repo.listPending()).resolves.toMatchObject([
    { original: payload, status: 'conflict' },
  ])
  expect(posts).toBe(1)
})

it('retains the original after an explicit missing-schedule recovery and retries only the amended request', async () => {
  const payload = { ...input(), schedule_item_id: scheduleId }
  const unlinked = { ...payload, schedule_item_id: null }
  const requests: unknown[] = []
  server.use(
    http.post(endpoint, async ({ request }) => {
      requests.push(await request.json())
      if (requests.length === 1)
        return HttpResponse.json(
          {
            errors: { schedule_item_id: ['The selected item was not found.'] },
          },
          { status: 422 },
        )
      if (requests.length === 2) return HttpResponse.error()
      return HttpResponse.json({ data: response(unlinked) }, { status: 200 })
    }),
  )
  const repo = accountRepo()
  await expect(repo.record(payload)).rejects.toMatchObject({ status: 422 })
  await expect(repo.retry(payload.id)).rejects.toMatchObject({ status: 422 })
  await expect(repo.saveWithoutSchedule(payload.id)).rejects.toMatchObject({ status: 0 })
  reload()
  await expect(accountRepo().listPending()).resolves.toMatchObject([{ original: payload }])
  await expect(accountRepo().retry(payload.id)).resolves.toEqual(response(unlinked))
  await expect(accountRepo().saveWithoutSchedule(payload.id)).rejects.toMatchObject({ status: 422 })
  await expect(accountRepo().getLocalRecord(payload.id)).resolves.toMatchObject({
    original: payload,
    status: 'saved',
  })
  expect(requests).toEqual([payload, unlinked, unlinked])
})

it('does not offer missing-link recovery for other schedule validation errors', async () => {
  const payload = { ...input(), schedule_item_id: scheduleId }
  server.use(
    http.post(endpoint, () =>
      HttpResponse.json(
        {
          errors: { schedule_item_id: ['The schedule item field must be a valid UUID.'] },
        },
        { status: 422 },
      ),
    ),
  )
  const repo = accountRepo()
  await expect(repo.record(payload)).rejects.toMatchObject({ status: 422 })
  await expect(repo.listPending()).resolves.toMatchObject([{ status: 'invalid' }])
  await expect(repo.saveWithoutSchedule(payload.id)).rejects.toMatchObject({ status: 422 })
})

it('isolates the outbox from guests, other accounts, and retired repositories', async () => {
  const payload = input()
  let posts = 0
  server.use(
    http.post(endpoint, () => {
      posts++
      return new HttpResponse(null, { status: 401 })
    }),
  )
  const owner = makeTokenResponse()
  const repo = accountRepo()
  await expect(repo.record(payload)).rejects.toMatchObject({ status: 401 })
  expect(useSession.getState().token).toBeNull()
  await expect(accountRepo().record(payload)).rejects.toMatchObject({ status: 401 })
  await expect(guestRepo().listForDate(date)).resolves.toEqual([])
  useSession.getState().signIn({ ...owner, token: 'other', user: { ...owner.user, id: newId() } })
  await expect(accountRepo().listPending()).resolves.toEqual([])
  await expect(accountRepo().retry(payload.id)).rejects.toMatchObject({ status: 404 })
  await expect(repo.listForDate(date)).rejects.toMatchObject({ status: 401 })
  useSession.getState().signIn(owner)
  await expect(accountRepo().listPending()).resolves.toMatchObject([{ original: payload }])
  expect(posts).toBe(1)
})

it.each([200, 202])(
  'keeps unconfirmed HTTP %i responses pending for an exact replay',
  async (status) => {
    const payload = input()
    server.use(
      http.post(endpoint, () =>
        HttpResponse.json(status === 200 ? {} : { data: response(payload) }, { status }),
      ),
    )
    const repo = accountRepo()
    await expect(repo.record(payload)).rejects.toMatchObject({ status: status === 200 ? 502 : 202 })
    await expect(repo.listPending()).resolves.toMatchObject([
      { original: payload, status: 'pending' },
    ])
  },
)

function signal() {
  let resolve: () => void = () => {
    throw new Error('Promise not initialized')
  }
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

it('keeps a late successful save with its original owner after an account switch', async () => {
  const payload = input()
  const original = makeTokenResponse()
  const requestStarted = signal()
  const respond = signal()
  server.use(
    http.post(endpoint, async ({ request }) => {
      expect(request.headers.get('Authorization')).toBe('Bearer 1|test-token')
      requestStarted.resolve()
      await respond.promise
      return HttpResponse.json({ data: response(payload) }, { status: 201 })
    }),
  )
  const saved = expect(accountRepo().record(payload)).rejects.toMatchObject({ status: 401 })
  await requestStarted.promise
  useSession
    .getState()
    .signIn({ ...original, token: 'other', user: { ...original.user, id: newId() } })
  respond.resolve()
  await saved
  await expect(accountRepo().getLocalRecord(payload.id)).resolves.toBeUndefined()
  useSession.getState().signIn(original)
  await expect(accountRepo().getLocalRecord(payload.id)).resolves.toBeUndefined()
})

it('keeps the same UUID when explicitly correcting a definitive validation rejection', async () => {
  const payload = { ...input(), todo_id: newId() }
  const corrected = { ...payload, todo_id: null }
  const sent: unknown[] = []
  server.use(
    http.post(endpoint, async ({ request }) => {
      sent.push(await request.json())
      if (sent.length === 1)
        return HttpResponse.json(
          {
            errors: { todo_id: ['The selected item was not found.'] },
          },
          { status: 422 },
        )
      return HttpResponse.json({ data: response(corrected) }, { status: 201 })
    }),
  )
  await expect(accountRepo().record(payload)).rejects.toMatchObject({ status: 422 })
  reload()
  await expect(accountRepo().record(corrected)).resolves.toEqual(response(corrected))
  await expect(accountRepo().getLocalRecord(payload.id)).resolves.toMatchObject({
    original: payload,
    status: 'saved',
  })
  expect(sent).toEqual([payload, corrected])
})

it('does not stage or send an account session with no active Focus time', async () => {
  const payload = input()
  payload.segments = payload.segments.map((segment) => ({ ...segment, active_ms: 0 }))
  let posts = 0
  server.use(
    http.post(endpoint, () => {
      posts++
      return new HttpResponse(null, { status: 422 })
    }),
  )
  const repo = accountRepo()
  await expect(repo.record(payload)).rejects.toMatchObject({
    status: 422,
    errors: { segments: expect.any(Array) },
  })
  await expect(repo.listPending()).resolves.toEqual([])
  expect(posts).toBe(0)
})

it('uses the staged original when retry input differs only in backend-trimmed label whitespace', async () => {
  const payload = { ...input(), label: '\u00a0Read chapter 4\u00a0' }
  const sent: unknown[] = []
  server.use(
    http.post(endpoint, async ({ request }) => {
      sent.push(await request.json())
      if (sent.length === 1) return HttpResponse.error()
      return HttpResponse.json({ data: response(payload) }, { status: 200 })
    }),
  )
  await expect(accountRepo().record(payload)).rejects.toMatchObject({ status: 0 })
  await expect(accountRepo().record({ ...payload, label: 'Read chapter 4' })).resolves.toEqual(
    response(payload),
  )
  expect(sent).toEqual([payload, payload])
})
