import type { FocusSession, FocusSessionInput } from '@/features/focus/types'
import type { LocalDate } from '@/features/todos/types'
import { ApiError, type ApiErrorBody } from '@/lib/api/errors'
import type { FocusSessionsApi } from '@/lib/api/focusSessions'
import { useSession } from '@/lib/api/session'
import { newId } from '@/lib/id'
import type { GuestDatabase } from './db'
import type { FocusSessionRepository } from './FocusSessionRepository'
import { focusDurations, invalidFocusSession, sameFocusPayload } from './focusSessionPayload'
import { openGuestDatabase } from './openGuestDatabase'

type BlockedStatus = 'conflict' | 'missing_schedule' | 'invalid'
type OutboxState =
  | { status: 'pending' }
  | { status: BlockedStatus; error: ApiErrorBody }
  | { status: 'saved'; session: FocusSession }

export type FocusOutboxRecord = {
  ownerId: string
  id: string
  original: FocusSessionInput
  /** Distinguishes local drafts and amendments while a response is in flight. */
  attemptId: string
  replacement?: FocusSessionInput
} & OutboxState

function blockedState(error: unknown, payload: FocusSessionInput): OutboxState | undefined {
  if (!(error instanceof ApiError)) return
  const body = { message: error.message, errors: error.errors }
  if (error.status === 409) return { status: 'conflict', error: body }
  if (error.status !== 422) return
  const fields = Object.keys(error.errors)
  const missingSchedule =
    payload.schedule_item_id &&
    fields.length === 1 &&
    error.errors.schedule_item_id?.includes('The selected item was not found.')
  return { status: missingSchedule ? 'missing_schedule' : 'invalid', error: body }
}

function payloadFor(row: FocusOutboxRecord): FocusSessionInput {
  return row.replacement ?? row.original
}

function matchesDraft(row: FocusOutboxRecord, input: FocusSessionInput): boolean {
  return sameFocusPayload(row.original, input) || sameFocusPayload(payloadFor(row), input)
}

function amend(row: FocusOutboxRecord, replacement: FocusSessionInput): FocusOutboxRecord {
  const { ownerId, id, original } = row
  return { ownerId, id, original, attemptId: newId(), replacement, status: 'pending' }
}

export class ServerFocusSessionRepository implements FocusSessionRepository {
  readonly mode = 'account'

  constructor(
    private readonly api: FocusSessionsApi,
    private readonly database?: GuestDatabase,
    private readonly generation = useSession.getState().generation,
  ) {}

  private owner(): string {
    const current = useSession.getState()
    if (!current.token || !current.user || current.generation !== this.generation) {
      throw new ApiError(401)
    }
    return current.user.id
  }

  private open() {
    return this.database ?? openGuestDatabase()
  }

  async get(id: string): Promise<FocusSession> {
    this.owner()
    const session = await this.api.get(id)
    this.owner()
    return session
  }

  async listForDate(date: LocalDate): Promise<FocusSession[]> {
    this.owner()
    const sessions = await this.api.listForDate(date)
    this.owner()
    return sessions
  }

  async getLocalRecord(id: string): Promise<FocusOutboxRecord | undefined> {
    const owner = this.owner()
    const record = await (await this.open()).focus_outbox.get([owner, id.toLowerCase()])
    this.owner()
    return record
  }

  async listPending(): Promise<FocusOutboxRecord[]> {
    const owner = this.owner()
    const rows = await (await this.open()).focus_outbox.where('ownerId').equals(owner).toArray()
    this.owner()
    return rows.filter((row) => row.status !== 'saved')
  }

  async record(input: FocusSessionInput): Promise<FocusSession> {
    const ownerId = this.owner()
    const original = structuredClone(input)
    focusDurations(original)
    const id = original.id.toLowerCase()
    const db = await this.open()
    const outbox = db.focus_outbox
    const row = await db.transaction('rw', outbox, async () => {
      const previous = await outbox.get([ownerId, id])
      if (previous) {
        if (previous.status !== 'invalid' || matchesDraft(previous, original)) return previous
        const corrected = amend(previous, original)
        await outbox.put(corrected)
        return corrected
      }
      const next: FocusOutboxRecord = {
        ownerId,
        id,
        original,
        attemptId: newId(),
        status: 'pending',
      }
      await outbox.add(next)
      return next
    })
    this.owner()
    if (!matchesDraft(row, original)) throw new ApiError(409)
    return this.send(db, row)
  }

  async retry(id: string): Promise<FocusSession> {
    const owner = this.owner()
    const db = await this.open()
    const row = await db.focus_outbox.get([owner, id.toLowerCase()])
    this.owner()
    if (!row) throw new ApiError(404)
    return this.send(db, row)
  }

  /** Explicitly remove only the rejected schedule link. The original stays in the outbox. */
  async saveWithoutSchedule(id: string): Promise<FocusSession> {
    const owner = this.owner()
    const db = await this.open()
    const outbox = db.focus_outbox
    const next = await db.transaction('rw', outbox, async () => {
      this.owner()
      const row = await outbox.get([owner, id.toLowerCase()])
      if (row?.status !== 'missing_schedule') return undefined
      const amended = amend(row, { ...payloadFor(row), schedule_item_id: null })
      await outbox.put(amended)
      return amended
    })
    this.owner()
    if (!next) invalidFocusSession('schedule_item_id', 'A rejected schedule link is required.')
    return this.send(db, next)
  }

  private async send(db: GuestDatabase, row: FocusOutboxRecord): Promise<FocusSession> {
    this.owner()
    if (row.status === 'saved') return row.session
    if (row.status !== 'pending') {
      throw new ApiError(row.status === 'conflict' ? 409 : 422, row.error)
    }

    const payload = payloadFor(row)
    let session: FocusSession
    try {
      session = await this.api.record(payload)
    } catch (error) {
      const blocked = blockedState(error, payload)
      if (blocked) await this.settle(db, row, blocked)
      throw error
    }
    await this.settle(db, row, { status: 'saved', session })
    this.owner()
    return session
  }

  private async settle(db: GuestDatabase, attempt: FocusOutboxRecord, state: OutboxState) {
    const table = db.focus_outbox
    await db.transaction('rw', table, async () => {
      const row = await table.get([attempt.ownerId, attempt.id])
      if (!row || row.attemptId !== attempt.attemptId || row.status === 'saved') return
      if (state.status === 'saved' && !row.replacement) {
        await table.delete([row.ownerId, row.id])
      } else if (state.status === 'saved' || row.status === 'pending') {
        const { ownerId, id, original, attemptId, replacement } = row
        await table.put({ ownerId, id, original, attemptId, replacement, ...state })
      }
    })
  }
}
