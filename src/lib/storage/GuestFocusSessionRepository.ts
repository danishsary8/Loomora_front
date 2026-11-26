import type { FocusSession, FocusSessionInput } from '@/features/focus/types'
import type { LocalDate } from '@/features/todos/types'
import { ApiError } from '@/lib/api/errors'
import { isLocalDate, toLocalDate } from '@/lib/date'
import type { GuestDatabase, StoredFocusSession } from './db'
import type { FocusSessionRepository } from './FocusSessionRepository'
import {
  canonicalFocusPayload,
  focusDurations,
  invalidFocusSession,
  sameFocusPayload,
} from './focusSessionPayload'
import { openGuestDatabase } from './openGuestDatabase'

const RESTORE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

interface Options {
  db?: GuestDatabase
  now?: () => Date
  timeZone?: string
}

function toPublicSession(row: StoredFocusSession): FocusSession {
  const { deleted_at: _deletedAt, ...session } = row
  void _deletedAt
  return session
}

export class GuestFocusSessionRepository implements FocusSessionRepository {
  readonly mode = 'guest'

  constructor(private readonly options: Options = {}) {}

  private open() {
    return this.options.db ?? openGuestDatabase()
  }

  private now(): Date {
    return this.options.now?.() ?? new Date()
  }

  async record(input: FocusSessionInput): Promise<FocusSession> {
    const payload = canonicalFocusPayload(input)
    const durations = focusDurations(input)
    const now = this.now()
    const session: FocusSession = {
      ...payload,
      ...durations,
      local_date: toLocalDate(new Date(payload.started_at), this.options.timeZone),
      created_at: now.toISOString(),
    }
    const db = await this.open()
    const sessions = db.focus_sessions
    const saved = await db.transaction('rw', sessions, async () => {
      const existing = await sessions.get(payload.id)
      if (existing) return existing
      await sessions.add(session)
      return session
    })
    const publicSession = toPublicSession(saved)
    if (!sameFocusPayload(publicSession, payload)) throw new ApiError(409)
    return publicSession
  }

  async get(id: string): Promise<FocusSession> {
    const session = await (await this.open()).focus_sessions.get(id.toLowerCase())
    if (!session || session.deleted_at) throw new ApiError(404)
    return toPublicSession(session)
  }

  async listForRange(from: LocalDate, to: LocalDate): Promise<FocusSession[]> {
    if (!isLocalDate(from) || !isLocalDate(to) || from > to) {
      invalidFocusSession('date', 'Use a valid calendar date range.')
    }
    const rows = await (
      await this.open()
    ).focus_sessions
      .where('local_date')
      .between(from, to, true, true)
      .toArray()
    return rows.filter((row) => !row.deleted_at).map(toPublicSession)
  }

  async listForDate(date: LocalDate): Promise<FocusSession[]> {
    if (!isLocalDate(date)) invalidFocusSession('date', 'Use a valid calendar date.')
    const rows = await (
      await this.open()
    ).focus_sessions
      .where('local_date')
      .equals(date)
      .sortBy('started_at')
    return rows.filter((row) => !row.deleted_at).map(toPublicSession)
  }

  async delete(id: string): Promise<void> {
    const key = id.toLowerCase()
    const db = await this.open()
    const sessions = db.focus_sessions
    await db.transaction('rw', sessions, async () => {
      const existing = await sessions.get(key)
      if (!existing) throw new ApiError(404)
      if (existing.deleted_at) return
      await sessions.put({ ...existing, deleted_at: this.now().toISOString() })
    })
  }

  async restore(id: string): Promise<FocusSession> {
    const key = id.toLowerCase()
    const db = await this.open()
    const sessions = db.focus_sessions
    const restored = await db.transaction('rw', sessions, async () => {
      const existing = await sessions.get(key)
      if (!existing) throw new ApiError(404)
      if (!existing.deleted_at) return existing
      const deletedMs = Date.parse(existing.deleted_at)
      if (!Number.isFinite(deletedMs) || this.now().getTime() - deletedMs >= RESTORE_WINDOW_MS) {
        throw new ApiError(410, { message: 'The undo deadline has expired.' })
      }
      const active = toPublicSession(existing)
      await sessions.put(active)
      return active
    })
    return toPublicSession(restored)
  }
}
