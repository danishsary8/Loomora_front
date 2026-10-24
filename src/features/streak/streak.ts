import { occurrencesForDate } from '@/features/schedule/occurrences'
import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { LocalDate, Todo } from '@/features/todos/types'
import { localDateIn, previousDay } from '@/lib/date'

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
  /** True once something was checked off today. */
  todayCounted: boolean
}

/**
 * docs/08 rule 8. A day counts when something was checked off on it. A day with nothing
 * planned is skipped. A planned day with no check-off breaks the streak. Today is never
 * judged: it adds one when counted and is otherwise ignored.
 */
export function computeStreak(input: StreakInput): Streak {
  const { todos, items, exceptions, checkins, today, timeZone } = input

  const checked = new Set<LocalDate>(checkins.map((c) => c.date))
  const dueDates = new Set<LocalDate>()
  for (const todo of todos) {
    if (todo.done_at !== null) checked.add(localDateIn(todo.done_at, timeZone))
    if (todo.due_date !== null) dueDates.add(todo.due_date)
  }
  const isPlanned = (date: LocalDate) =>
    dueDates.has(date) || occurrencesForDate(items, exceptions, [], date).length > 0

  const earliest = [...checked, ...dueDates, ...items.map((i) => i.starts_on)].reduce<
    LocalDate | undefined
  >((min, date) => (min === undefined || date < min ? date : min), undefined)

  const todayCounted = checked.has(today)
  let count = todayCounted ? 1 : 0
  if (earliest === undefined) return { count, todayCounted }

  for (let date = previousDay(today); date >= earliest; date = previousDay(date)) {
    if (checked.has(date)) count += 1
    else if (isPlanned(date)) break
  }
  return { count, todayCounted }
}
