import type { FocusSession, FocusSessionInput } from '@/features/focus/types'
import type { LocalDate } from '@/features/todos/types'
import type { ApiClient } from './client'
import { ApiError } from './errors'

export function createFocusSessionsApi(client: ApiClient) {
  const path = '/focus-sessions'

  return {
    async record(input: FocusSessionInput): Promise<FocusSession> {
      const result = await client.request<{ data: FocusSession }>('POST', path, {
        body: input,
        expectedStatus: [200, 201],
      })
      const data = result?.data
      if (data?.id !== input.id.toLowerCase()) {
        throw new ApiError(502, { message: 'Unexpected Focus session response.' })
      }
      return data
    },
    async get(id: string): Promise<FocusSession> {
      const { data } = await client.request<{ data: FocusSession }>(
        'GET',
        `${path}/${encodeURIComponent(id.toLowerCase())}`,
      )
      return data
    },
    async listForDate(date: LocalDate): Promise<FocusSession[]> {
      const { data } = await client.request<{ data: FocusSession[] }>('GET', path, {
        query: { date },
      })
      return data
    },
    async delete(id: string): Promise<void> {
      await client.request<undefined>('DELETE', `${path}/${encodeURIComponent(id.toLowerCase())}`, {
        expectedStatus: [204],
      })
    },
    async restore(id: string): Promise<FocusSession> {
      const normalized = id.toLowerCase()
      const result = await client.request<{ data: FocusSession }>(
        'POST',
        `${path}/${encodeURIComponent(normalized)}/restore`,
        { expectedStatus: [200] },
      )
      const data = result?.data
      if (data?.id !== normalized) {
        throw new ApiError(502, { message: 'Unexpected Focus session response.' })
      }
      return data
    },
  }
}

export type FocusSessionsApi = ReturnType<typeof createFocusSessionsApi>
