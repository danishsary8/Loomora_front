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

// Data endpoints (docs/openapi.yaml: To-dos, Schedule, Streak, Import).

export type Category = 'study' | 'work' | 'health' | 'life' | 'rest' | 'other'

export interface ApiTodo {
  id: string
  title: string
  category: Category
  due_date: string | null
  done_at: string | null
  overdue: boolean
  old: boolean
  created_at: string
}

export interface TodoBody {
  title?: string
  category?: Category
  due_date?: string | null
}

export interface ApiScheduleItem {
  id: string
  title: string
  category: Category
  start_time: string
  end_time: string
  days: number[]
  starts_on: string
  ends_on: string | null
  created_at: string
}

export interface ScheduleItemBody {
  title?: string
  category?: Category
  start_time?: string
  end_time?: string
  days?: number[]
  starts_on?: string
  ends_on?: string | null
}

export interface ApiOccurrence {
  item_id: string
  date: string
  title: string
  category: Category
  start_time: string
  end_time: string
  done: boolean
  overridden: boolean
}

export interface ExceptionBody {
  type: 'skip' | 'override'
  title?: string | null
  start_time?: string | null
  end_time?: string | null
}

export interface ApiException {
  item_id: string
  date: string
  type: 'skip' | 'override'
  title?: string | null
  start_time?: string | null
  end_time?: string | null
}

export interface ApiStreak {
  current_streak: number
  longest_streak: number
  today_counted: boolean
}

export interface ImportBody {
  todos: Array<{
    id: string
    title: string
    category: Category
    due_date: string | null
    done_at: string | null
    created_at: string
  }>
  schedule_items: Array<Omit<ApiScheduleItem, 'created_at'> & { created_at: string }>
  exceptions: Array<{
    id: string
    schedule_item_id: string
    date: string
    type: 'skip' | 'override'
    title: string | null
    start_time: string | null
    end_time: string | null
  }>
  checkins: Array<{ id: string; schedule_item_id: string; date: string; done_at: string }>
}

interface ImportCount {
  created: number
  skipped: number
}

export interface ImportResult {
  todos: ImportCount
  schedule_items: ImportCount
  exceptions: ImportCount
  checkins: ImportCount
}
