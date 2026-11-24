import { liveQuery } from 'dexie'
import { ApiError } from '@/lib/api/errors'
import type { GuestDatabase } from '@/lib/storage/db'
import { validateFocusSessionLink } from '@/lib/storage/focusSessionPayload'
import type { FocusSessionRepository } from '@/lib/storage/FocusSessionRepository'
import type { ServerFocusSessionRepository } from '@/lib/storage/ServerFocusSessionRepository'
import {
  checkpointDelay,
  readTimer,
  recoverLogin,
  startTimer,
  updateTimer,
  type FocusTimerSnapshot,
  type TimerClock,
  type TimerCommand,
  type TimerConfig,
} from './focusTimerState'
import type { CountdownSound } from './focusSound'
import type { FocusSessionInput } from './types'

export interface PendingFocusTimer {
  scope: string
  id: string
  payload: FocusSessionInput
  attempts: number
  blockedStatus?: number
}

export type PendingFocusSave = PendingFocusTimer & { missingSchedule?: true }

type Repository = FocusSessionRepository | ServerFocusSessionRepository
type TimerTransition = ReturnType<typeof updateTimer> & { phaseStartedAt?: number }

interface RuntimeOptions {
  db: () => Promise<GuestDatabase>
  scope: string
  login: string | null
  isCurrent: () => boolean
  repository: Repository
  clock: () => TimerClock
  lock: <T>(name: string, operation: () => Promise<T>) => Promise<T>
  onCountdownExpired?: (deadline: number) => void
  countdownSound?: CountdownSound
}

function checkedSnapshot(row: FocusTimerSnapshot | undefined): FocusTimerSnapshot | null {
  if (!row) return null
  if (row.version !== 1) throw new Error('Unsupported Focus timer snapshot')
  return row
}

/** Owns durable timer commands for one guest scope or authenticated account generation. */
export class FocusRuntime {
  constructor(private readonly options: RuntimeOptions) {}

  private assertCurrent() {
    if (!this.options.isCurrent()) throw new ApiError(401)
  }

  async read(): Promise<FocusTimerSnapshot | null> {
    this.assertCurrent()
    return this.readSnapshot(await this.options.db())
  }

  private readSnapshot(db: GuestDatabase) {
    this.assertCurrent()
    const { scope, login } = this.options
    return db.focus_timers.get(scope).then((row) => {
      this.assertCurrent()
      const timer = checkedSnapshot(row)
      return timer && timer.login !== login ? recoverLogin(timer, login) : timer
    })
  }

  readTime(snapshot: FocusTimerSnapshot) {
    this.assertCurrent()
    if (snapshot.scope !== this.options.scope || snapshot.login !== this.options.login) {
      throw new ApiError(401)
    }
    return readTimer(snapshot, this.options.clock())
  }

  async start(config: TimerConfig): Promise<FocusTimerSnapshot> {
    this.assertCurrent()
    const { db: open, scope, login, clock } = this.options
    const copy = structuredClone(config)
    validateFocusSessionLink(copy)
    const db = await open()
    const timer = await db.transaction('rw', db.focus_timers, async () => {
      this.assertCurrent()
      if (await db.focus_timers.get(scope)) throw new ApiError(409)
      const timer = startTimer(copy, scope, login, clock())
      await db.focus_timers.add(timer)
      this.assertCurrent()
      return timer
    })
    this.countdownSound?.phaseStarted(timer.checkpoint.mono)
    return timer
  }

  command(expected: Pick<FocusTimerSnapshot, 'id' | 'revision'>, command: TimerCommand) {
    return this.transition({ expected, command })
  }

  reconcile() {
    return this.transition()
  }

  get countdownSound() {
    return this.options.countdownSound
  }

  /** Called with the old account binding when authentication has already changed. */
  async suspend(atLastCheckpoint = false) {
    if (this.options.login !== null) {
      await this.transition({
        command: 'suspend',
        sample: atLastCheckpoint ? undefined : this.options.clock(),
      })
    }
  }

  private async transition(action?: {
    expected?: Pick<FocusTimerSnapshot, 'id' | 'revision'>
    command: TimerCommand | 'suspend'
    sample?: TimerClock
  }): Promise<FocusTimerSnapshot | null> {
    const suspending = action?.command === 'suspend'
    if (!suspending) this.assertCurrent()
    const { db: open, scope, login, clock } = this.options
    const db = await open()
    const { focus_timers: timers, focus_timer_pending: pending } = db
    const result = await db.transaction<TimerTransition>('rw', timers, pending, async () => {
      if (!suspending) this.assertCurrent()
      let previous = checkedSnapshot(await timers.get(scope))
      if (!previous) return { timer: null }
      if (suspending && previous.login !== login) return { timer: null }
      if (previous.login !== login) {
        const recovered = recoverLogin(previous, login)
        await timers.put(recovered)
        this.assertCurrent()
        if (!action?.expected) return { timer: recovered }
        previous = recovered
      }

      const { expected, command, sample } = action ?? {}
      if (expected && (previous.id !== expected.id || previous.revision !== expected.revision)) {
        this.assertCurrent()
        return { timer: previous }
      }

      const next = updateTimer(
        previous,
        sample ?? (suspending ? previous.checkpoint : clock()),
        command,
      )
      if (next.timer) {
        const { checkpoint } = next.timer
        const prior = previous.checkpoint
        if (
          next.timer.revision !== previous.revision ||
          checkpoint.source !== prior.source ||
          checkpoint.wall !== prior.wall ||
          checkpoint.mono !== prior.mono
        ) {
          await timers.put(next.timer)
        }
      } else {
        if (next.payload) {
          await pending.add({ id: previous.id, scope, payload: next.payload, attempts: 0 })
        }
        await timers.delete(scope)
      }
      if (!suspending) this.assertCurrent()
      const phaseStartedAt =
        command === 'next' &&
        previous.phase.status === 'waiting' &&
        next.timer?.phase.status === 'running'
          ? next.timer.checkpoint.mono
          : undefined
      return { ...next, phaseStartedAt }
    })

    if (!suspending) {
      this.assertCurrent()
      if (result.phaseStartedAt !== undefined) {
        this.countdownSound?.phaseStarted(result.phaseStartedAt)
      }
      if (result.countdownDeadline !== undefined) {
        this.options.onCountdownExpired?.(result.countdownDeadline)
      }
      if (result.payload && this.options.isCurrent()) await this.retryPending(result.payload.id)
      this.assertCurrent()
    }
    return result.timer
  }

  async pending(): Promise<PendingFocusTimer[]> {
    this.assertCurrent()
    return this.readPending(await this.options.db())
  }

  private readPending(db: GuestDatabase) {
    this.assertCurrent()
    return db.focus_timer_pending
      .where('scope')
      .equals(this.options.scope)
      .toArray()
      .then((rows) => {
        this.assertCurrent()
        return rows
      })
  }

  observePending(onChange: (rows: PendingFocusSave[]) => void, onError: (error: unknown) => void) {
    const { repository } = this.options
    return this.observeStorage(
      (db) =>
        this.readPending(db).then(async (rows) => {
          if (!('getLocalRecord' in repository)) return rows
          const saves = await Promise.all(
            rows.map(async (row): Promise<PendingFocusSave | undefined> => {
              if (row.blockedStatus !== 422) return row
              const draft = await repository.getLocalRecord(row.id)
              this.assertCurrent()
              if (draft?.status === 'saved') return
              if (draft?.status === 'missing_schedule') return { ...row, missingSchedule: true }
              // An interrupted delivery can leave the queue blocked after the replacement is staged.
              if (draft?.replacement && draft.status === 'pending') {
                return { ...row, blockedStatus: undefined }
              }
              return row
            }),
          )
          return saves.filter((save) => save !== undefined)
        }),
      onChange,
      onError,
    )
  }

  async saveWithoutSchedule(id: string) {
    const row = (await this.pending()).find(
      (pending) => pending.id === id && pending.blockedStatus === 422,
    )
    if (row) await this.deliver(row, 'withoutSchedule')
  }

  async retryPending(id?: string) {
    const rows = (await this.pending()).filter(
      (row) => (!row.blockedStatus || row.blockedStatus === 422) && (!id || row.id === id),
    )
    for (const row of rows) {
      if (!this.options.isCurrent()) return
      await this.deliver(row)
    }
  }

  private async deliver(
    observed: PendingFocusTimer,
    action: 'retry' | 'withoutSchedule' = 'retry',
  ) {
    const { db: open, scope, repository, lock, isCurrent } = this.options
    const db = await open()
    const table = db.focus_timer_pending
    const key: [string, string] = [scope, observed.id]
    await lock(`focus-timer:${db.name}:${observed.id}`, async () => {
      if (!isCurrent()) return
      const row = await table.get(key)
      if (!isCurrent() || !row || row.attempts !== observed.attempts) return
      if (row.blockedStatus && row.blockedStatus !== 422) return
      try {
        if ('getLocalRecord' in repository) {
          const draft = await repository.getLocalRecord(row.id)
          if (!isCurrent()) return
          if (action === 'withoutSchedule') {
            if (draft?.status !== 'missing_schedule') return
            await repository.saveWithoutSchedule(row.id)
          } else {
            // Only an explicit repository amendment may unblock a rejected payload.
            if (
              row.blockedStatus &&
              (!draft?.replacement || !['pending', 'saved'].includes(draft.status))
            )
              return
            if (draft) await repository.retry(row.id)
            else await repository.record(row.payload)
          }
        } else if (action === 'retry' && !row.blockedStatus) {
          await repository.record(row.payload)
        } else {
          return
        }
      } catch (error) {
        const status = error instanceof ApiError ? error.status : undefined
        const blockedStatus =
          status && status >= 400 && status < 500 && ![401, 408, 425, 429].includes(status)
            ? status
            : undefined
        await db.transaction('rw', table, async () => {
          const latest = await table.get(key)
          if (latest?.attempts === row.attempts) {
            await table.put({ ...latest, attempts: latest.attempts + 1, blockedStatus })
          }
        })
        return
      }
      await table.delete(key)
    })
  }

  observe(onChange: (state: FocusTimerSnapshot | null) => void, onError: (error: unknown) => void) {
    return this.observeStorage((db) => this.readSnapshot(db), onChange, onError)
  }

  private observeStorage<T>(
    read: (db: GuestDatabase) => Promise<T>,
    onChange: (value: T) => void,
    onError: (error: unknown) => void,
  ) {
    let active = true
    let subscription: { unsubscribe: () => void } | undefined
    // Resolve the lazy database first so Dexie tracks the reads in its live query context.
    void this.options
      .db()
      .then((db) => {
        if (active)
          subscription = liveQuery(() => read(db)).subscribe({ next: onChange, error: onError })
      })
      .catch((error) => {
        if (active) onError(error)
      })
    return {
      unsubscribe() {
        active = false
        subscription?.unsubscribe()
      },
    }
  }
}

/** Recheck persisted state at browser lifecycle boundaries and while a phase runs. */
export function observeFocusRuntime(runtime: FocusRuntime) {
  let timer: ReturnType<typeof setTimeout> | undefined
  let active = true
  const reconcile = () => {
    if (active) void runtime.reconcile().catch(() => undefined)
  }
  const retry = () => {
    if (active) void runtime.retryPending().catch(() => undefined)
  }
  const subscription = runtime.observe(
    (snapshot) => {
      clearTimeout(timer)
      const delay = snapshot ? checkpointDelay(snapshot) : undefined
      if (delay !== undefined && active) timer = setTimeout(reconcile, delay)
    },
    () => clearTimeout(timer),
  )

  document.addEventListener('visibilitychange', reconcile)
  window.addEventListener('pagehide', reconcile)
  window.addEventListener('pageshow', reconcile)
  window.addEventListener('focus', reconcile)
  window.addEventListener('online', retry)
  reconcile()
  retry()

  return () => {
    active = false
    subscription.unsubscribe()
    clearTimeout(timer)
    document.removeEventListener('visibilitychange', reconcile)
    window.removeEventListener('pagehide', reconcile)
    window.removeEventListener('pageshow', reconcile)
    window.removeEventListener('focus', reconcile)
    window.removeEventListener('online', retry)
  }
}
