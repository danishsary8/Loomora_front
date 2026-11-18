import type { Streak } from '@/features/streak/streak'
import type { LocalDate } from '@/features/todos/types'

/** Where the streak comes from: computed on the device (guest) or read from the API (account). */
export interface StreakRepository {
  get(today: LocalDate): Promise<Streak>
}
