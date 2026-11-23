import { afterEach, describe, expect, it, vi } from 'vitest'
import { FocusRuntime, observeFocusRuntime } from './focusRuntime'
import type { FocusSession, FocusSessionInput } from './types'
import { GuestDatabase } from '@/lib/storage/db'
import { GuestFocusSessionRepository } from '@/lib/storage/GuestFocusSessionRepository'
import { ServerFocusSessionRepository } from '@/lib/storage/ServerFocusSessionRepository'
import { ApiError } from '@/lib/api/errors'
import { useSession } from '@/lib/api/session'

const epoch = Date.parse('2026-11-24T02:00:00.000Z')
const databases: GuestDatabase[] = []

afterEach(async () => {
  for (const db of databases.splice(0)) await db.delete()
})

function setup() {
  const db = new GuestDatabase(crypto.randomUUID())
  databases.push(db)
  const guest = new GuestFocusSessionRepository({ db, timeZone: 'UTC' })
  let wall = epoch
  let mono = 0
  let seq = 0
  const locks = new Map<string, Promise<void>>()
  function lock<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const result = (locks.get(name) ?? Promise.resolve()).then(operation)
    locks.set(
      name,
      result.then(
        () => undefined,
        () => undefined,
      ),
    )
    return result
  }
  const runtime = (options: Partial<ConstructorParameters<typeof FocusRuntime>[0]> = {}) => {
    const source = String(++seq)
    return new FocusRuntime({
      db: async () => db,
      scope: 'guest',
      login: null,
      isCurrent: () => true,
      repository: guest,
      clock: () => ({ wall, mono, source }),
      lock,
      ...options,
    })
  }
  return {
    db,
    guest,
    runtime,
    elapse(ms: number) {
      wall += ms
      mono += ms
    },
    shiftWall(ms: number) {
      wall += ms
    },
  }
}

async function command(runtime: FocusRuntime, type: Parameters<FocusRuntime['command']>[1]) {
  const timer = await runtime.read()
  if (!timer) throw new Error('Expected an active timer')
  return runtime.command(timer, type)
}

describe('Focus timer runtime', () => {
  it.each([0, 241, 1.5, NaN])('rejects custom duration %s', async (minutes) => {
    const { runtime } = setup()
    const tab = runtime()
    await expect(tab.start({ mode: 'countdown', minutes })).rejects.toBeInstanceOf(RangeError)
    expect(await tab.read()).toBeNull()
  })

  it.each([1, 25, 50, 90, 240])('accepts %s whole minutes per Focus phase', async (minutes) => {
    const { runtime, elapse } = setup()
    const tab = runtime()
    await tab.start({ mode: 'countdown', minutes })
    elapse(minutes * 60_000)
    expect(await tab.reconcile()).toMatchObject({ phase: { index: 1, status: 'waiting' } })
  })

  it('reads the current phase without updating its persisted checkpoint', async () => {
    const { runtime, elapse } = setup()
    const tab = runtime()
    const initial = await tab.start({ mode: 'countdown', minutes: 1 })
    elapse(123)
    expect(tab.readTime(initial)).toEqual({
      phaseType: 'focus',
      elapsedMs: 123,
      remainingMs: 59_877,
    })
    expect(await tab.read()).toEqual(initial)
  })

  it('waits after delayed recovery and records exactly four Focus phases and four explicit breaks', async () => {
    const { runtime, elapse, guest } = setup()
    let tab = runtime()
    const { id } = await tab.start({ mode: 'countdown', minutes: 1 })
    elapse(90_000)
    tab = runtime()
    expect(await tab.reconcile()).toMatchObject({ phase: { index: 1, status: 'waiting' } })
    elapse(600_000)
    expect(await tab.reconcile()).toMatchObject({ phase: { index: 1, status: 'waiting' } })
    for (const duration of [300_000, 60_000, 300_000, 60_000, 300_000, 60_000, 900_000]) {
      await command(tab, 'next')
      elapse(duration)
      await tab.reconcile()
    }
    expect(await tab.read()).toBeNull()
    const session = await guest.get(id)
    expect(session).toMatchObject({
      end_reason: 'completed',
      planned_focus_ms: 60_000,
      focus_ms: 240_000,
      break_ms: 1_800_000,
      paused_ms: 630_000,
    })
    expect(session.segments.map((segment) => segment.type)).toEqual([
      'focus',
      'short_break',
      'focus',
      'short_break',
      'focus',
      'short_break',
      'focus',
      'long_break',
    ])
    expect(session.segments[0]?.ended_at).toBe('2026-11-24T02:01:00.000Z')
    expect(session.segments[1]?.started_at).toBe('2026-11-24T02:11:30.000Z')
  })

  it('saves a countdown stopped under one minute and excludes time in a paused interval', async () => {
    const { runtime, elapse, guest } = setup()
    const tab = runtime()
    const { id } = await tab.start({ mode: 'countdown', minutes: 25 })
    elapse(1200)
    await command(tab, 'pause')
    elapse(60_000)
    await command(tab, 'resume')
    elapse(345)
    await command(tab, 'endEarly')
    await expect(guest.get(id)).resolves.toMatchObject({
      end_reason: 'ended_early',
      focus_ms: 1545,
      paused_ms: 60_000,
      break_ms: 0,
    })
  })

  it('does not submit a session with zero Focus time', async () => {
    const { runtime, guest } = setup()
    const tab = runtime()
    const { id } = await tab.start({ mode: 'stopwatch' })
    await command(tab, 'endEarly')
    await expect(guest.get(id)).rejects.toMatchObject({ status: 404 })
    expect(await tab.pending()).toEqual([])
  })

  it('keeps exact stopwatch laps and ignores duplicate, paused and zero-length laps', async () => {
    const { runtime, elapse, guest } = setup()
    const tab = runtime()
    const { id } = await tab.start({ mode: 'stopwatch' })
    await command(tab, 'lap')
    elapse(123)
    await command(tab, 'lap')
    await command(tab, 'lap')
    elapse(1)
    await command(tab, 'pause')
    await command(tab, 'lap')
    await command(tab, 'resume')
    elapse(12)
    await command(tab, 'lap')
    elapse(1)
    await command(tab, 'finish')
    await expect(guest.get(id)).resolves.toMatchObject({
      end_reason: 'completed',
      laps: [123, 136],
      focus_ms: 137,
    })
  })

  it('does not turn a live wall-clock jump into a countdown expiry in a second tab', async () => {
    const { runtime, elapse, shiftWall } = setup()
    const first = runtime()
    await first.start({ mode: 'countdown', minutes: 1 })
    elapse(1000)
    await first.reconcile()
    elapse(60_000)
    shiftWall(3_600_000)
    const second = runtime()
    expect(await second.reconcile()).toMatchObject({
      phase: { index: 0, status: 'paused', timing: { accumulatedMs: 1000 } },
    })
    await command(second, 'resume')
    elapse(59_000)
    expect(await first.reconcile()).toMatchObject({ phase: { index: 1, status: 'waiting' } })
  })

  it('uses monotonic time in a live document despite wall-clock changes', async () => {
    const { runtime, elapse, shiftWall, guest } = setup()
    const tab = runtime()
    const { id } = await tab.start({ mode: 'stopwatch' })
    elapse(1234)
    shiftWall(-4_000_000)
    await tab.reconcile()
    elapse(17)
    shiftWall(8_000_000)
    await command(tab, 'finish')
    await expect(guest.get(id)).resolves.toMatchObject({
      focus_ms: 1251,
      ended_at: '2026-11-24T02:00:01.251Z',
    })
  })

  it('recovers a stopwatch across reload and preserves only verified time after a backward clock change', async () => {
    const { runtime, elapse, shiftWall, guest } = setup()
    let tab = runtime()
    const { id } = await tab.start({ mode: 'stopwatch' })
    elapse(1200)
    tab = runtime()
    await tab.reconcile()
    shiftWall(-20_000)
    tab = runtime()
    expect(await tab.reconcile()).toMatchObject({ phase: { status: 'paused' } })
    await command(tab, 'resume')
    elapse(100)
    await command(tab, 'finish')
    await expect(guest.get(id)).resolves.toMatchObject({ focus_ms: 1300 })
  })

  it('reconciles a delayed deadline on visibility and keeps the next phase waiting', async () => {
    const { runtime, elapse } = setup()
    const tab = runtime()
    const detach = observeFocusRuntime(tab)
    try {
      await tab.start({ mode: 'countdown', minutes: 1 })
      elapse(4_800_000)
      document.dispatchEvent(new Event('visibilitychange'))
      await vi.waitFor(async () => {
        expect(await tab.read()).toMatchObject({ phase: { index: 1, status: 'waiting' } })
      })
    } finally {
      detach()
    }
  })

  it('serializes concurrent starts and finalizes a shared revision once', async () => {
    const { runtime, elapse, guest, db } = setup()
    const a = runtime()
    const reopened = new GuestDatabase(db.name)
    try {
      const record = vi.spyOn(guest, 'record')
      const b = runtime({ db: async () => reopened, repository: guest })
      const starts = await Promise.allSettled([
        a.start({ mode: 'stopwatch' }),
        b.start({ mode: 'stopwatch' }),
      ])
      expect(starts.filter(({ status }) => status === 'fulfilled')).toHaveLength(1)
      const snapshot = await a.read()
      if (!snapshot) throw new Error('Expected a shared timer')
      elapse(500)
      await Promise.all([a.command(snapshot, 'finish'), b.command(snapshot, 'finish')])
      expect(record).toHaveBeenCalledTimes(1)
      await expect(guest.get(snapshot.id)).resolves.toMatchObject({ focus_ms: 500 })
    } finally {
      reopened.close()
    }
  })

  it('rejects an outdated command even when the timer UUID is still the same', async () => {
    const { runtime, elapse } = setup()
    const a = runtime()
    const b = runtime()
    const stale = await a.start({ mode: 'countdown', minutes: 25 })
    elapse(500)
    await command(b, 'pause')
    await a.command(stale, 'endEarly')
    expect(await b.read()).toMatchObject({ phase: { status: 'paused' } })
  })

  it('retains an exact B-043 outbox payload on offline and server failure and retries once across tabs', async () => {
    const { runtime, elapse, db } = setup()
    useSession.setState({
      token: 'test-token',
      user: { id: 'owner' } as NonNullable<ReturnType<typeof useSession.getState>['user']>,
    })
    const received: FocusSessionInput[] = []
    const repository = new ServerFocusSessionRepository(
      {
        record: async (payload) => {
          received.push(structuredClone(payload))
          if (received.length === 1) throw new TypeError('Offline')
          if (received.length === 2) throw new ApiError(503)
          return { id: payload.id } as FocusSession
        },
        get: () => Promise.reject(new ApiError(404)),
        listForDate: () => Promise.resolve([]),
      },
      db,
    )
    const options = { scope: 'account:owner', login: 'sign-in', repository }
    const tab = runtime(options)
    const { id } = await tab.start({ mode: 'stopwatch' })
    elapse(781)
    await command(tab, 'finish')
    expect((await tab.pending()).map((row) => row.payload)).toEqual(received)
    expect((await repository.listPending()).map((row) => row.original)).toEqual(received)
    await runtime(options).retryPending()
    expect(await tab.pending()).toHaveLength(1)
    await Promise.all([runtime(options).retryPending(), runtime(options).retryPending()])
    expect(received).toHaveLength(3)
    expect(received).toEqual([received[0], received[0], received[0]])
    expect(received[0]).toMatchObject({ id, segments: [{ active_ms: 781 }] })
    expect(await tab.pending()).toEqual([])
    expect(await repository.listPending()).toEqual([])
  })

  it('rejects a link or label that cannot be saved before starting', async () => {
    const { runtime } = setup()
    const tab = runtime()
    await expect(tab.start({ mode: 'stopwatch', label: 'a'.repeat(121) })).rejects.toMatchObject({
      status: 422,
    })
    await expect(tab.start({ mode: 'stopwatch', todo_id: 'bad-id' })).rejects.toMatchObject({
      status: 422,
    })
    await expect(
      tab.start({
        mode: 'stopwatch',
        todo_id: crypto.randomUUID(),
        schedule_item_id: crypto.randomUUID(),
      }),
    ).rejects.toMatchObject({ status: 422 })
    expect(await tab.read()).toBeNull()
  })

  it('recovers an explicitly amended schedule payload after a failed save', async () => {
    const { runtime, elapse, db } = setup()
    useSession.setState({
      token: 'test-token',
      user: { id: 'owner' } as NonNullable<ReturnType<typeof useSession.getState>['user']>,
    })
    const received: FocusSessionInput[] = []
    const repository = new ServerFocusSessionRepository(
      {
        record: async (payload) => {
          received.push(structuredClone(payload))
          if (payload.schedule_item_id) {
            throw new ApiError(422, {
              message: 'Invalid schedule',
              errors: { schedule_item_id: ['The selected item was not found.'] },
            })
          }
          if (received.length === 2) throw new ApiError(503)
          return { id: payload.id } as FocusSession
        },
        get: () => Promise.reject(new ApiError(404)),
        listForDate: () => Promise.resolve([]),
      },
      db,
    )
    const options = { scope: 'account:owner', login: 'sign-in', repository }
    const tab = runtime(options)
    const { id } = await tab.start({ mode: 'stopwatch', schedule_item_id: crypto.randomUUID() })
    elapse(145)
    await command(tab, 'finish')

    await tab.retryPending()
    expect(received).toHaveLength(1)
    expect(await tab.pending()).toMatchObject([{ id, blockedStatus: 422 }])

    await expect(repository.saveWithoutSchedule(id)).rejects.toMatchObject({ status: 503 })
    await runtime(options).retryPending()
    expect(received).toHaveLength(3)
    expect(received[2]).toEqual({ ...received[0], schedule_item_id: null })
    expect(await tab.pending()).toEqual([])
    expect(await repository.getLocalRecord(id)).toMatchObject({
      status: 'saved',
      original: received[0],
    })
  })

  it('suspends at sign-out and only recovers for the original account', async () => {
    const { runtime, elapse } = setup()
    let current = true
    const first = runtime({ scope: 'account:a', login: 'old', isCurrent: () => current })
    const userB = runtime({ scope: 'account:b', login: 'b' })
    const guest = runtime()
    const started = await first.start({ mode: 'stopwatch' })
    elapse(500)
    current = false
    await first.suspend()
    await expect(first.read()).rejects.toMatchObject({ status: 401 })
    await expect(first.command(started, 'finish')).rejects.toMatchObject({ status: 401 })
    expect(await userB.read()).toBeNull()
    expect(await userB.pending()).toEqual([])
    expect(await guest.read()).toBeNull()
    elapse(8000)
    const returning = runtime({ scope: 'account:a', login: 'new' })
    expect(await returning.reconcile()).toMatchObject({
      id: started.id,
      phase: { status: 'paused', timing: { accumulatedMs: 500 } },
    })
  })

  it('suspends at the last checkpoint if sign-out happened while all documents were closed', async () => {
    const { runtime, elapse } = setup()
    const first = runtime({ scope: 'account:a', login: 'old' })
    const started = await first.start({ mode: 'stopwatch' })
    elapse(500)
    await first.reconcile()
    elapse(8000)
    const returning = runtime({ scope: 'account:a', login: 'new' })
    expect(await returning.reconcile()).toMatchObject({
      id: started.id,
      phase: { status: 'paused', timing: { accumulatedMs: 500 } },
    })
  })
})
