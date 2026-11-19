import type { ApiClient } from './client'
import type { ApiDailyIntention, ApiStreak, ImportBody, ImportResult } from './types'

/** The streak, guest import and feedback endpoints of docs/openapi.yaml. */
export function createAccountDataApi({ request }: ApiClient) {
  return {
    streak: (date: string) =>
      request<{ data: ApiStreak }>('GET', '/streak', { query: { date } }).then((r) => r.data),
    getDailyIntention: (date: string, signal?: AbortSignal) =>
      request<{ data: ApiDailyIntention }>('GET', `/days/${date}/intention`, { signal }).then(
        (r) => r.data,
      ),
    putDailyIntention: (date: string, text: string | null) =>
      request<{ data: ApiDailyIntention }>('PUT', `/days/${date}/intention`, {
        body: { text },
      }).then((r) => r.data),
    importGuestData: (body: ImportBody) =>
      request<{ data: ImportResult }>('POST', '/import', { body }).then((r) => r.data),
    /** Works for guests too; the token, when there is one, links the message to the account. */
    sendFeedback: (message: string) =>
      request<unknown>('POST', '/feedback', { body: { message } }).then(() => undefined),
  }
}

export type AccountDataApi = ReturnType<typeof createAccountDataApi>
