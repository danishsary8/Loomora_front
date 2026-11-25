import type { FocusSession, FocusSessionInput } from '@/features/focus/types'
import type { LocalDate } from '@/features/todos/types'

export interface FocusSessionRepository {
  record(input: FocusSessionInput): Promise<FocusSession>
  get(id: string): Promise<FocusSession>
  listForDate(date: LocalDate): Promise<FocusSession[]>
  delete(id: string): Promise<void>
  restore(id: string): Promise<FocusSession>
}
