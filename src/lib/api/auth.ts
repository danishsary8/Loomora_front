import type { ApiClient, RequestOptions } from './client'
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

interface GoogleDeletionConfirmation {
  challenge_id: string
  browser_verifier: string
}

interface GoogleDeletionProof {
  id: string
  expires_at: string
}

const googleDeletionOptions = {
  preserveSessionOnUnauthorized: true,
  optionalCapability: true,
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
    /** Sends the verification email again (3 per 10 minutes). Needs the token. */
    resendVerification: () => request<Message>('POST', '/auth/email/resend'),
    forgotPassword: (email: string) =>
      request<Message>('POST', '/auth/password/forgot', { body: { email }, auth: false }),
    resetPassword: (input: ResetPasswordInput) =>
      request<Message>('POST', '/auth/password/reset', { body: input, auth: false }),
    logout: () => request<undefined>('POST', '/auth/logout'),
    /** Deletes the account and everything in it. Needs the current password. */
    deleteMe: (password: string) =>
      request<undefined>('DELETE', '/me', {
        body: { password },
        expectedStatus: 204,
        preserveSessionOnUnauthorized: true,
      }),
    startGoogleDeletion: (browserChallenge: string, signal: AbortSignal) =>
      request<{ data: GoogleDeletionProof & { authorization_url: string } }>(
        'POST',
        '/me/deletion/google/challenge',
        {
          ...googleDeletionOptions,
          body: { browser_challenge: browserChallenge },
          expectedStatus: 201,
          signal,
        },
      ).then((response) => response.data),
    verifyGoogleDeletion: (
      input: GoogleDeletionConfirmation & { code: string; state: string },
      signal?: AbortSignal,
    ) =>
      request<{ data: GoogleDeletionProof }>('POST', '/me/deletion/google/verify', {
        ...googleDeletionOptions,
        body: input,
        expectedStatus: 200,
        signal,
      }).then((response) => response.data),
    deleteMeWithGoogle: (confirmation: GoogleDeletionConfirmation) =>
      request<undefined>('DELETE', '/me', {
        ...googleDeletionOptions,
        body: { google_confirmation: confirmation },
        expectedStatus: 204,
      }),
    getMe: (
      signal?: AbortSignal,
      options?: Pick<RequestOptions, 'preserveSessionOnUnauthorized'>,
    ) => request<{ data: User }>('GET', '/me', { ...options, signal }).then((r) => r.data),
    updateMe: (input: UpdateMeInput) =>
      request<{ data: User }>('PATCH', '/me', { body: input }).then((r) => r.data),
    submitSurvey: (input: SurveyInput) =>
      request<{ data: User }>('POST', '/me/survey', { body: input }).then((r) => r.data),
  }
}
