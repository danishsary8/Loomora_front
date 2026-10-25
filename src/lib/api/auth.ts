import type { ApiClient } from './client'
import type {
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SurveyInput,
  TokenResponse,
  UpdateMeInput,
  User,
  VerifyEmailInput,
} from './types'

export type GoogleIntent = 'sign_in' | 'sign_up'

interface Message {
  message: string
}

/** The account endpoints of docs/openapi.yaml (Auth and Me). */
export function createAuthApi(client: ApiClient) {
  const { request } = client
  return {
    register: (input: RegisterInput) =>
      request<TokenResponse>('POST', '/auth/register', { body: input, auth: false }),
    login: (input: LoginInput) =>
      request<TokenResponse>('POST', '/auth/login', { body: input, auth: false }),
    googleExchange: (code: string) =>
      request<TokenResponse>('POST', '/auth/google/exchange', { body: { code }, auth: false }),
    /** Full-page URL that starts Google sign-in. Open it in the browser, not with fetch. */
    googleRedirectUrl: (intent: GoogleIntent, timezone: string) => {
      const url = new URL(`${client.baseUrl}/auth/google/redirect`, window.location.origin)
      url.searchParams.set('intent', intent)
      url.searchParams.set('timezone', timezone)
      return url.toString()
    },
    verifyEmail: (input: VerifyEmailInput) =>
      request<Message & { user: User }>('POST', '/auth/email/verify', { body: input, auth: false }),
    forgotPassword: (email: string) =>
      request<Message>('POST', '/auth/password/forgot', { body: { email }, auth: false }),
    resetPassword: (input: ResetPasswordInput) =>
      request<Message>('POST', '/auth/password/reset', { body: input, auth: false }),
    getMe: () => request<{ data: User }>('GET', '/me').then((r) => r.data),
    updateMe: (input: UpdateMeInput) =>
      request<{ data: User }>('PATCH', '/me', { body: input }).then((r) => r.data),
    submitSurvey: (input: SurveyInput) =>
      request<{ data: User }>('POST', '/me/survey', { body: input }).then((r) => r.data),
  }
}
