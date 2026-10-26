import { createAuthApi } from './auth'
import { createAccountDataApi } from './account'
import { createApiClient } from './client'
import { createScheduleApi } from './schedule'
import { useSession } from './session'
import { createTodosApi } from './todos'

export { ApiError, type FieldErrors } from './errors'
export { useSession } from './session'
export type { GoogleIntent } from './auth'
export type { AccountDataApi } from './account'
export type { ScheduleApi } from './schedule'
export type { TodosApi } from './todos'
export type { Goal, ImportBody, User } from './types'

const DEFAULT_API_URL = 'http://localhost:8000/api/v1'

/** The app's API client: base URL from `VITE_API_URL`, token from the session store. */
const client = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL || DEFAULT_API_URL,
  getToken: () => useSession.getState().token,
  onUnauthorized: () => useSession.getState().signOut(),
})

export const authApi = createAuthApi(client)
export const todosApi = createTodosApi(client)
export const scheduleApi = createScheduleApi(client)
export const accountDataApi = createAccountDataApi(client)
