import { occurrencesForDate } from '@/features/schedule/occurrences'
import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { LocalDate, Todo } from '@/features/todos/types'
import { addDaysLocalDate, localDateIn } from '@/lib/date'

const STREAK_LOOKBACK_DAYS = 400
const FIRST_SUPPORTED_DATE = '0001-01-01'

export interface StreakInput {
  todos: readonly Todo[]
  items: readonly ScheduleItem[]
  exceptions: readonly ScheduleException[]
  checkins: readonly ScheduleCheckin[]
  /** The user's current local date. */
  today: LocalDate
  /** IANA time zone used to place `done_at` on a local day. */
  timeZone: string
}

export interface Streak {
  count: number
  /** Account longest streak from GET /streak. */
  longest?: number
  /** True once something was checked off today. */
  todayCounted: boolean
}

/** Shared guest interpretation of docs/08 rule 8 and the B-051 lookback. */
export function createStreakEvaluator(
  { todos, items, exceptions, checkins, today, timeZone }: StreakInput,
  schedulePlan = new Map<LocalDate, boolean>(),
) {
  const itemIds = new Set(items.map((item) => item.id))
  const counted = new Set<LocalDate>()
  const dueDates = new Set<LocalDate>()
  const todoDates: Array<{ dueDate: LocalDate | null; doneDate: LocalDate | null }> = []

  for (const checkin of checkins) {
    if (itemIds.has(checkin.schedule_item_id)) counted.add(checkin.date)
  }
  for (const todo of todos) {
    if (todo.deleted_at) continue
    const dueDate = todo.due_date
    const doneDate = todo.done_at === null ? null : localDateIn(todo.done_at, timeZone)
    if (dueDate !== null) dueDates.add(dueDate)
    if (doneDate !== null) counted.add(doneDate)
    todoDates.push({ dueDate, doneDate })
  }

  function isPlanned(date: LocalDate): boolean {
    if (dueDates.has(date)) return true
    const cached = schedulePlan.get(date)
    if (cached !== undefined) return cached
    const planned = occurrencesForDate(items, exceptions, [], date).length > 0
    schedulePlan.set(date, planned)
    return planned
  }

  function at(date: LocalDate) {
    let streak = 0
    if (counted.size === 0) return { streak, streak_may_be_longer: false }

    // Include the requested date itself and up to 400 preceding local days.
    for (let offset = 0; offset <= STREAK_LOOKBACK_DAYS; offset += 1) {
      const day = addDaysLocalDate(date, -offset)
      if (day < FIRST_SUPPORTED_DATE) return { streak, streak_may_be_longer: false }
      if (counted.has(day)) {
        streak += 1
      } else if (day !== today && isPlanned(day)) {
        return { streak, streak_may_be_longer: false }
      }
      if (day === FIRST_SUPPORTED_DATE) return { streak, streak_may_be_longer: false }
    }
    return { streak, streak_may_be_longer: streak > 0 }
  }

  return { at, todoDates, todayCounted: counted.has(today) }
}

export function computeStreak(input: StreakInput): Streak {
  const { at, todayCounted } = createStreakEvaluator(input)
  return { count: at(input.today).streak, todayCounted }
}
