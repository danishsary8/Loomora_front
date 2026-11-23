import type { FocusSession, FocusSessionInput } from '@/features/focus/types'
import type { LocalDate } from '@/features/todos/types'
import { ApiError } from '@/lib/api/errors'
import { isLocalDate, toLocalDate } from '@/lib/date'
import type { GuestDatabase } from './db'
import type { FocusSessionRepository } from './FocusSessionRepository'
import {
  canonicalFocusPayload,
  focusDurations,
  invalidFocusSession,
  sameFocusPayload,
} from './focusSessionPayload'
import { openGuestDatabase } from './openGuestDatabase'

interface Options {
  db?: GuestDatabase
  now?: () => Date
  timeZone?: string
}

export class GuestFocusSessionRepository implements FocusSessionRepository {
  readonly mode = 'guest'

  constructor(private readonly options: Options = {}) {}

  private open() {
    return this.options.db ?? openGuestDatabase()
  }

  async record(input: FocusSessionInput): Promise<FocusSession> {
    const payload = canonicalFocusPayload(input)
    const durations = focusDurations(input)
    const now = this.options.now?.() ?? new Date()
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
    if (!sameFocusPayload(saved, payload)) throw new ApiError(409)
    return saved
  }

  async get(id: string): Promise<FocusSession> {
    const session = await (await this.open()).focus_sessions.get(id.toLowerCase())
    if (!session) throw new ApiError(404)
    return session
  }

  async listForDate(date: LocalDate): Promise<FocusSession[]> {
    if (!isLocalDate(date)) invalidFocusSession('date', 'Use a valid calendar date.')
    return (await this.open()).focus_sessions.where('local_date').equals(date).sortBy('started_at')
  }
}
