import type { FocusSessionInput } from '@/features/focus/types'
import { accountDataApi, useSession, type ImportBody } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { importBackend } from '@/test/importBackend'
import { GuestDatabase, type StoredFocusSession } from './db'
import { canonicalFocusPayload } from './focusSessionPayload'
import { GuestDailyIntentionRepository } from './GuestDailyIntentionRepository'
import { GuestFocusSessionRepository } from './GuestFocusSessionRepository'
import { GuestScheduleRepository } from './GuestScheduleRepository'
import { GuestTodoRepository } from './GuestTodoRepository'
import { isEmptyPlan, readGuestPlan, saveGuestPlan, type GuestStorage } from './saveGuestPlan'

let dbName: string
let db: GuestDatabase
let guest: GuestStorage

function openGuest() {
  db = new GuestDatabase(dbName)
  guest = {
    todos: new GuestTodoRepository({ db }),
    schedule: new GuestScheduleRepository({ db }),
    intentions: new GuestDailyIntentionRepository(db),
    focusSessions: new GuestFocusSessionRepository({ db, timeZone: 'UTC' }),
  }
}

function makeCountdownInput(
  index: number,
  overrides: Partial<FocusSessionInput> = {},
): FocusSessionInput {
  const startMs = Date.parse('2026-10-26T08:00:00.000Z') + index * 60_000
  const startedAt = new Date(startMs).toISOString()
  const endedAt = new Date(startMs + 25_000).toISOString()
  return {
    id: crypto.randomUUID(),
    mode: 'countdown',
    started_at: startedAt,
    ended_at: endedAt,
    end_reason: 'completed',
    planned_focus_ms: 25_000,
    todo_id: null,
    schedule_item_id: null,
    label: `Session ${index}`,
    segments: [{ type: 'focus', started_at: startedAt, ended_at: endedAt, active_ms: 25_000 }],
    laps: null,
    ...overrides,
  }
}

function makeStoredSessions(count: number): StoredFocusSession[] {
  return Array.from({ length: count }, (_, index) => {
    const input = makeCountdownInput(index)
    const canonical = canonicalFocusPayload(input)
    return {
      ...canonical,
      local_date: '2026-10-26',
      focus_ms: 25_000,
      break_ms: 0,
      paused_ms: 0,
      created_at: canonical.ended_at,
    }
  })
}

beforeEach(() => {
  dbName = `focus-import-${crypto.randomUUID()}`
  openGuest()
  useSession.getState().signIn(makeTokenResponse())
})

afterEach(() => db.delete())

describe('F-R3-15 guest Focus history import (B-049)', () => {
  it.each([
    { count: 499, chunks: [499] },
    { count: 500, chunks: [500] },
    { count: 501, chunks: [500, 1] },
  ])(
    'imports $count active guest Focus sessions in chunks of $chunks',
    async ({ count, chunks }) => {
      const rows = makeStoredSessions(count)
      await db.focus_sessions.bulkAdd(rows)
      const { accountFocus, calls } = importBackend()

      expect(isEmptyPlan(await readGuestPlan(guest))).toBe(false)
      await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

      expect(calls.map(({ focus_sessions }) => focus_sessions.length)).toEqual(chunks)
      expect(accountFocus.size).toBe(count)
      for (const row of rows) {
        expect(accountFocus.get(row.id)?.payload).toEqual(canonicalFocusPayload(row))
      }
      expect(await db.focus_sessions.count()).toBe(0)
    },
  )

  it('imports linked to-do, linked schedule item, and stopwatch laps with canonical payloads', async () => {
    const todo = await guest.todos.create({ title: 'Study physics', due_date: '2026-10-26' })
    const item = await guest.schedule.create({
      title: 'Deep work',
      start_time: '09:00',
      end_time: '10:00',
      days: [0],
      starts_on: '2026-10-01',
    })
    const todoSession = await guest.focusSessions.record(
      makeCountdownInput(0, { todo_id: todo.id, label: '  Study physics  ' }),
    )
    const scheduleSession = await guest.focusSessions.record(
      makeCountdownInput(1, { schedule_item_id: item.id, label: 'Deep work' }),
    )
    const stopwatchSession = await guest.focusSessions.record({
      id: crypto.randomUUID(),
      mode: 'stopwatch',
      started_at: '2026-10-26T10:00:00.000Z',
      ended_at: '2026-10-26T10:05:00.000Z',
      end_reason: 'ended_early',
      planned_focus_ms: null,
      todo_id: null,
      schedule_item_id: null,
      label: 'Stopwatch run',
      segments: [
        {
          type: 'focus',
          started_at: '2026-10-26T10:00:00.000Z',
          ended_at: '2026-10-26T10:05:00.000Z',
          active_ms: 300_000,
        },
      ],
      laps: [60_000, 180_000],
    })
    const { accountFocus, calls } = importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.focus_sessions).toEqual([
      canonicalFocusPayload(todoSession),
      canonicalFocusPayload(scheduleSession),
      canonicalFocusPayload(stopwatchSession),
    ])
    expect(accountFocus.get(todoSession.id)?.payload).toMatchObject({
      id: todoSession.id,
      todo_id: todo.id,
      label: 'Study physics',
    })
    expect(accountFocus.get(scheduleSession.id)?.payload).toMatchObject({
      id: scheduleSession.id,
      schedule_item_id: item.id,
    })
    expect(accountFocus.get(stopwatchSession.id)?.payload).toMatchObject({
      id: stopwatchSession.id,
      mode: 'stopwatch',
      end_reason: 'ended_early',
      laps: [60_000, 180_000],
    })
    expect(await db.focus_sessions.count()).toBe(0)
  })

  it('sends Focus sessions in or after the chunk carrying their linked to-do', async () => {
    const original = await guest.todos.create({
      title: 'Daily',
      due_date: '2026-10-01',
      repeat_rule: { type: 'daily' },
    })
    const done = await guest.todos.setDone(original.id, true)
    const successorId = done.next_todo_id ?? ''
    const stamp = '2026-10-01T00:00:00.000Z'
    await db.todos.bulkAdd(
      Array.from({ length: 499 }, (_, index) => ({
        id: crypto.randomUUID(),
        title: `Task ${index}`,
        category: 'other' as const,
        priority: 'normal' as const,
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
      })),
    )
    const linkedToChunkZero = await guest.focusSessions.record(
      makeCountdownInput(0, { todo_id: successorId, label: 'Successor' }),
    )
    const linkedToLaterChunk = await guest.focusSessions.record(
      makeCountdownInput(1, { todo_id: original.id, label: 'Original' }),
    )
    const { accountFocus, calls } = importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls).toHaveLength(2)
    expect(calls.map(({ todos }) => todos.length)).toEqual([500, 1])
    const originalChunk = calls.findIndex(({ todos }) => todos.some(({ id }) => id === original.id))
    const sessionChunk = calls.findIndex(({ focus_sessions }) =>
      focus_sessions.some(({ id }) => id === linkedToLaterChunk.id),
    )
    expect(sessionChunk).toBeGreaterThanOrEqual(originalChunk)
    expect(accountFocus.has(linkedToChunkZero.id)).toBe(true)
    expect(accountFocus.has(linkedToLaterChunk.id)).toBe(true)
  })

  it('excludes soft-deleted guest Focus sessions and clears them after a successful import', async () => {
    const active = await guest.focusSessions.record(makeCountdownInput(0, { label: 'Keep me' }))
    const deleted = await guest.focusSessions.record(makeCountdownInput(1, { label: 'Deleted me' }))
    await guest.focusSessions.delete(deleted.id)
    const { accountFocus, calls } = importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls).toHaveLength(1)
    expect(calls[0]?.focus_sessions.map(({ id }) => id)).toEqual([active.id])
    expect(accountFocus.has(active.id)).toBe(true)
    expect(accountFocus.has(deleted.id)).toBe(false)
    expect(await db.focus_sessions.count()).toBe(0)
  })

  it('does not call POST /import when only soft-deleted Focus sessions exist locally', async () => {
    const deleted = await guest.focusSessions.record(makeCountdownInput(0))
    await guest.focusSessions.delete(deleted.id)

    expect(isEmptyPlan(await readGuestPlan(guest))).toBe(true)
    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(false)
    expect(await db.focus_sessions.count()).toBe(1)
  })

  it('clears stale links to deleted guest to-dos and schedule items without losing the session', async () => {
    const todo = await guest.todos.create({ title: 'Removed task' })
    const item = await guest.schedule.create({
      title: 'Removed class',
      start_time: '08:00',
      end_time: '09:00',
      days: [0],
      starts_on: '2026-10-01',
    })
    const todoSession = await guest.focusSessions.record(
      makeCountdownInput(0, { todo_id: todo.id, label: 'Removed task' }),
    )
    const itemSession = await guest.focusSessions.record(
      makeCountdownInput(1, { schedule_item_id: item.id, label: 'Removed class' }),
    )
    await guest.todos.delete(todo.id)
    await guest.schedule.delete(item.id)
    const { accountFocus, calls } = importBackend()

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls).toHaveLength(1)
    expect(accountFocus.get(todoSession.id)?.payload).toMatchObject({
      id: todoSession.id,
      todo_id: null,
      label: 'Removed task',
    })
    expect(accountFocus.get(itemSession.id)?.payload).toMatchObject({
      id: itemSession.id,
      schedule_item_id: null,
      label: 'Removed class',
    })
  })

  it('retains all local records when batch 2 fails and replays idempotently after reload', async () => {
    const rows = makeStoredSessions(501)
    await db.focus_sessions.bulkAdd(rows)
    const boom = () => HttpResponse.json({ message: 'Server error' }, { status: 500 })
    const { accountFocus, calls } = importBackend({
      fail: (call) => (call === 2 ? boom() : undefined),
    })

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 500 })
    expect(accountFocus.size).toBe(500)
    expect(await db.focus_sessions.count()).toBe(501)

    // Simulate reload before retry.
    db.close()
    openGuest()
    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(calls.map(({ focus_sessions }) => focus_sessions.length)).toEqual([500, 1, 500, 1])
    expect(calls.slice(2, 4)).toEqual(calls.slice(0, 2))
    expect(accountFocus.size).toBe(501)
    expect(await db.focus_sessions.count()).toBe(0)
  })

  it('handles idempotent replay of an already-imported or account-deleted Focus session', async () => {
    const existing = await guest.focusSessions.record(makeCountdownInput(0, { label: 'Existing' }))
    const accountDeleted = await guest.focusSessions.record(
      makeCountdownInput(1, { label: 'Deleted on account' }),
    )
    const { accountFocus } = importBackend({
      focusSessions: [
        { payload: canonicalFocusPayload(existing) },
        { payload: canonicalFocusPayload(accountDeleted), deleted: true },
      ],
    })

    await expect(saveGuestPlan(guest, accountDataApi)).resolves.toBe(true)

    expect(accountFocus.get(existing.id)?.deleted).toBeUndefined()
    expect(accountFocus.get(accountDeleted.id)?.deleted).toBe(true)
    expect(await db.focus_sessions.count()).toBe(0)
  })

  it('retains all local data on a 409 Focus session conflict (foreign UUID or payload mismatch)', async () => {
    const todo = await guest.todos.create({ title: 'Keep me local' })
    const session = await guest.focusSessions.record(makeCountdownInput(0, { todo_id: todo.id }))
    importBackend({ foreignFocusIds: [session.id] })

    await expect(saveGuestPlan(guest, accountDataApi)).rejects.toMatchObject({ status: 409 })
    expect(await guest.todos.listAll()).toHaveLength(1)
    expect(await db.focus_sessions.count()).toBe(1)
  })

  it('preserves Focus sessions added or deleted concurrently during an in-flight import', async () => {
    const imported = await guest.focusSessions.record(makeCountdownInput(0, { label: 'Imported' }))
    const deletedDuring = await guest.focusSessions.record(
      makeCountdownInput(1, { label: 'Delete during import' }),
    )
    const obsolete = await guest.focusSessions.record(
      makeCountdownInput(2, { label: 'Already deleted' }),
    )
    await guest.focusSessions.delete(obsolete.id)
    let start!: () => void
    let finish!: () => void
    const started = new Promise<void>((resolve) => {
      start = resolve
    })
    const pending = new Promise<void>((resolve) => {
      finish = resolve
    })
    server.use(
      http.post(`${API}/import`, async ({ request }) => {
        const body = (await request.json()) as ImportBody
        expect(body.focus_sessions.map(({ id }) => id)).toEqual([imported.id, deletedDuring.id])
        start()
        await pending
        return HttpResponse.json({
          data: {
            todos: { created: 0, skipped: 0 },
            schedule_items: { created: 0, skipped: 0 },
            exceptions: { created: 0, skipped: 0 },
            checkins: { created: 0, skipped: 0 },
            focus_sessions: { created: 2, skipped: 0 },
            daily_intentions: { created: 0, skipped: 0 },
          },
        })
      }),
    )

    const running = saveGuestPlan(guest, accountDataApi)
    await started
    await guest.focusSessions.delete(deletedDuring.id)
    const addedDuring = await guest.focusSessions.record(
      makeCountdownInput(3, { label: 'Added during import' }),
    )
    finish()
    await expect(running).resolves.toBe(true)

    const remaining = await db.focus_sessions.toArray()
    expect(remaining.map(({ id }) => id).sort()).toEqual([addedDuring.id, deletedDuring.id].sort())
    expect(remaining.find(({ id }) => id === deletedDuring.id)?.deleted_at).toEqual(
      expect.any(String),
    )
  })

  it('aborts and retains local Focus sessions when session ownership changes mid-import', async () => {
    const rows = makeStoredSessions(501)
    await db.focus_sessions.bulkAdd(rows)
    const { calls } = importBackend()
    let allowed = true
    let checks = 0

    await expect(
      saveGuestPlan(guest, accountDataApi, () => {
        checks += 1
        if (checks === 2) allowed = false
        if (!allowed) throw new Error('Session changed')
      }),
    ).rejects.toThrow('Session changed')

    expect(calls).toHaveLength(1)
    expect(await db.focus_sessions.count()).toBe(501)
  })
})
