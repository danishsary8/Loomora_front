import type { ApiClient } from './client'
import { ApiError } from './errors'
import type {
  ApiDailyIntention,
  ApiStreak,
  ImportBody,
  ImportResult,
  NoteImportResult,
  NoteImportSkippedStatus,
  StatsSummary,
} from './types'

const UUID_PATTERN = /^(?:[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})$/i
const SKIPPED_NOTE_STATUSES = new Set<NoteImportSkippedStatus>([
  'identical',
  'different',
  'deleted',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isValidImportCount(
  count: unknown,
  expectedTotal: number,
): count is {
  created: number
  skipped: number
} {
  if (!isRecord(count)) return false
  const { created, skipped } = count
  return (
    typeof created === 'number' &&
    typeof skipped === 'number' &&
    Number.isSafeInteger(created) &&
    Number.isSafeInteger(skipped) &&
    created >= 0 &&
    skipped >= 0 &&
    created + skipped === expectedTotal
  )
}

/** Validate B-052 `notes` import acknowledgment including `skipped_details` against the batch. */
export function isValidNoteImportResult(
  value: unknown,
  submittedNotes: ImportBody['notes'],
): value is NoteImportResult {
  const expectedTotal = submittedNotes?.length ?? 0
  if (!isValidImportCount(value, expectedTotal)) return false
  const details = (value as Record<string, unknown>).skipped_details
  if (!Array.isArray(details) || details.length !== value.skipped) return false
  const submittedIds = new Set((submittedNotes ?? []).map(({ id }) => id.toLowerCase()))
  const seenIds = new Set<string>()
  for (const item of details) {
    if (!isRecord(item)) return false
    const keys = Object.keys(item)
    if (keys.length !== 2 || !('id' in item) || !('status' in item)) return false
    const { id, status } = item
    if (typeof id !== 'string' || !UUID_PATTERN.test(id)) return false
    if (
      typeof status !== 'string' ||
      !SKIPPED_NOTE_STATUSES.has(status as NoteImportSkippedStatus)
    ) {
      return false
    }
    const normalized = id.toLowerCase()
    if (seenIds.has(normalized) || !submittedIds.has(normalized)) return false
    seenIds.add(normalized)
  }
  return true
}

function isImportResult(data: unknown, body: ImportBody): data is ImportResult {
  if (!isRecord(data)) return false
  const required = [
    'todos',
    'schedule_items',
    'exceptions',
    'checkins',
    'daily_intentions',
    'focus_sessions',
  ] as const

  const baseValid = required.every((key) => isValidImportCount(data[key], body[key]?.length ?? 0))
  if (!baseValid) return false

  if (body.notes !== undefined || data.notes !== undefined) {
    return isValidNoteImportResult(data.notes, body.notes)
  }
  return true
}

/** The streak, stats summary, guest import and feedback endpoints of docs/openapi.yaml. */
export function createAccountDataApi({ request }: ApiClient) {
  return {
    streak: (date: string) =>
      request<{ data: ApiStreak }>('GET', '/streak', { query: { date } }).then((r) => r.data),
    getStatsSummary: (from: string, to: string, signal?: AbortSignal) =>
      request<{ data: StatsSummary }>('GET', '/stats/summary', {
        query: { from, to },
        signal,
      }).then((r) => r.data),
    getDailyIntention: (date: string, signal?: AbortSignal) =>
      request<{ data: ApiDailyIntention }>('GET', `/days/${date}/intention`, { signal }).then(
        (r) => r.data,
      ),
    putDailyIntention: (date: string, text: string | null) =>
      request<{ data: ApiDailyIntention }>('PUT', `/days/${date}/intention`, {
        body: { text },
      }).then((r) => r.data),
    importGuestData: async (body: ImportBody): Promise<ImportResult> => {
      const response = await request<unknown>('POST', '/import', { body, expectedStatus: 200 })
      const data = isRecord(response) ? response.data : undefined
      if (!isImportResult(data, body)) {
        throw new ApiError(502, { message: 'Invalid guest import acknowledgment.' })
      }
      return data
    },
    /** Works for guests too; the token, when there is one, links the message to the account. */
    sendFeedback: (message: string) =>
      request<unknown>('POST', '/feedback', { body: { message } }).then(() => undefined),
  }
}

export type AccountDataApi = ReturnType<typeof createAccountDataApi>
