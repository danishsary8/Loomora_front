import { create } from 'zustand'
import type { ApiClient } from './client'

interface ServiceState {
  /** True after a request failed with a network error or a 5xx, until the API answers again. */
  down: boolean
  markDown: () => void
  markUp: () => void
}

export const useServiceStatus = create<ServiceState>((set) => ({
  down: false,
  markDown: () => set({ down: true }),
  markUp: () => set({ down: false }),
}))

export function createHealthApi(client: ApiClient) {
  return {
    /** Resolves when `GET /health` answers 200, rejects with an ApiError otherwise. */
    check: () => client.request<{ status: 'ok' }>('GET', '/health', { auth: false }),
  }
}
