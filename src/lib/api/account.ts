import type { ApiClient } from './client'
import { ApiError } from './errors'
import type { ApiDailyIntention, ApiStreak, ImportBody, ImportResult, StatsSummary } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
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
  const collections =
    body.notes !== undefined || data.notes !== undefined
      ? [...required, 'notes' as const]
      : required

  return collections.every((key) => {
    const count = data[key]
    if (!isRecord(count)) return false
    const { created, skipped } = count
    return (
      typeof created === 'number' &&
      typeof skipped === 'number' &&
      Number.isSafeInteger(created) &&
      Number.isSafeInteger(skipped) &&
      created >= 0 &&
      skipped >= 0 &&
      created + skipped === (body[key]?.length ?? 0)
    )
  })
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
