import type { Streak } from '@/features/streak/streak'
import type { LocalDate } from '@/features/todos/types'
import type { AccountDataApi } from '@/lib/api'
import type { StreakRepository } from './StreakRepository'

/** The streak the server computed (docs/09 `GET /streak`). */
export class ServerStreakRepository implements StreakRepository {
  private readonly api: AccountDataApi

  constructor(api: AccountDataApi) {
    this.api = api
  }

  async get(today: LocalDate): Promise<Streak> {
    const { current_streak, today_counted } = await this.api.streak(today)
    return { count: current_streak, todayCounted: today_counted }
  }
}
