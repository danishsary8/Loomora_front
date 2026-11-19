import { create } from 'zustand'

export interface BackendOutageState {
  isOutage: boolean
  isChecking: boolean
  reportFailure: () => void
  reportSuccess: () => void
  reset: () => void
  checkHealth: (customBaseUrl?: string, customFetch?: typeof fetch) => Promise<boolean>
}

const DEFAULT_API_URL = 'http://localhost:8000/api/v1'

export const useBackendOutage = create<BackendOutageState>((set, get) => ({
  isOutage: false,
  isChecking: false,
  reportFailure: () => {
    set({ isOutage: true })
  },
  reportSuccess: () => {
    if (get().isOutage) set({ isOutage: false })
  },
  reset: () => {
    set({ isOutage: false, isChecking: false })
  },
  checkHealth: async (customBaseUrl, customFetch) => {
    const fetchFn = customFetch ?? fetch
    const base = (customBaseUrl ?? import.meta.env.VITE_API_URL ?? DEFAULT_API_URL).replace(
      /\/+$/,
      '',
    )

    set({ isChecking: true })
    try {
      const response = await fetchFn(`${base}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })
      if (response.ok) {
        set({ isOutage: false, isChecking: false })
        return true
      }
      set({ isChecking: false })
      return false
    } catch {
      set({ isChecking: false })
      return false
    }
  },
}))
