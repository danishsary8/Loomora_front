import { computeStreak, type Streak } from '@/features/streak/streak'
import type { LocalDate } from '@/features/todos/types'
import type { GuestScheduleRepository } from './GuestScheduleRepository'
import type { GuestTodoRepository } from './GuestTodoRepository'
import type { StreakRepository } from './StreakRepository'

/** The streak computed on this device from the guest data (docs/08 rule 8). */
export class GuestStreakRepository implements StreakRepository {
  private readonly todos: GuestTodoRepository
  private readonly schedule: GuestScheduleRepository

  constructor(todos: GuestTodoRepository, schedule: GuestScheduleRepository) {
    this.todos = todos
    this.schedule = schedule
  }

  async get(today: LocalDate): Promise<Streak> {
    const [todos, items, exceptions, checkins] = await Promise.all([
      this.todos.listAll(),
      this.schedule.listItems(),
      this.schedule.listExceptions(),
      this.schedule.listCheckins(),
    ])
    return computeStreak({
      todos,
      items,
      exceptions,
      checkins,
      today,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
  }
}
