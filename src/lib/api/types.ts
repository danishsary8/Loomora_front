// Shapes from docs/openapi.yaml (snake_case, as the API sends them).

export type Goal = 'be_consistent' | 'manage_time' | 'finish_tasks' | 'other'

export interface User {
  id: string
  name: string
  email: string
  email_verified_at: string | null
  timezone: string
  goal: Goal | null
  heard_from: string | null
  survey_done: boolean
  current_streak: number
  longest_streak: number
  created_at: string
}

export interface TokenResponse {
  token: string
  expires_at: string
  user: User
}

export interface RegisterInput {
  name: string
  email: string
  password: string
  timezone: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface VerifyEmailInput {
  id: string
  expires: number
  signature: string
}

export interface ResetPasswordInput {
  token: string
  email: string
  password: string
}

export interface SurveyInput {
  goal?: Goal | null
  heard_from?: string | null
}

export interface UpdateMeInput {
  name?: string
  timezone?: string
}
