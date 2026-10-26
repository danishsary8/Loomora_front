import type { ApiClient } from './client'
import type { ApiStreak, ImportBody, ImportResult } from './types'

/** The streak and guest import endpoints of docs/openapi.yaml. */
export function createAccountDataApi({ request }: ApiClient) {
  return {
    streak: (date: string) =>
      request<{ data: ApiStreak }>('GET', '/streak', { query: { date } }).then((r) => r.data),
    importGuestData: (body: ImportBody) =>
      request<{ data: ImportResult }>('POST', '/import', { body }).then((r) => r.data),
  }
}

export type AccountDataApi = ReturnType<typeof createAccountDataApi>
