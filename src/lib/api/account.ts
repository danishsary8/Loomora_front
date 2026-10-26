import type { ApiClient } from './client'
import type { ApiStreak, ImportBody, ImportResult } from './types'

/** The streak, guest import and feedback endpoints of docs/openapi.yaml. */
export function createAccountDataApi({ request }: ApiClient) {
  return {
    streak: (date: string) =>
      request<{ data: ApiStreak }>('GET', '/streak', { query: { date } }).then((r) => r.data),
    importGuestData: (body: ImportBody) =>
      request<{ data: ImportResult }>('POST', '/import', { body }).then((r) => r.data),
    /** Works for guests too; the token, when there is one, links the message to the account. */
    sendFeedback: (message: string) =>
      request<unknown>('POST', '/feedback', { body: { message } }).then(() => undefined),
  }
}

export type AccountDataApi = ReturnType<typeof createAccountDataApi>
