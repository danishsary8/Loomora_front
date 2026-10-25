import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import type { TokenResponse, User } from '@/lib/api/types'

export const API = 'http://localhost:8000/api/v1'

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: '9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f',
    name: 'sokha',
    email: 'sokha@example.com',
    email_verified_at: null,
    timezone: 'Asia/Phnom_Penh',
    goal: null,
    heard_from: null,
    survey_done: false,
    current_streak: 0,
    longest_streak: 0,
    created_at: '2026-10-24T03:00:00Z',
    ...overrides,
  }
}

export function makeTokenResponse(user: User = makeUser()): TokenResponse {
  return { token: '1|test-token', expires_at: '2099-01-01T00:00:00Z', user }
}

export function validationError(field: string, message: string) {
  return HttpResponse.json({ message, errors: { [field]: [message] } }, { status: 422 })
}

/** One MSW server for all tests; each test adds its own handlers with `server.use`. */
export const server = setupServer()

export { http, HttpResponse }
