import { differenceInCalendarDays, parseISO } from 'date-fns'
import type { LocalDate, TodayTodo, Todo } from './types'

/** Overdue items older than this many days are flagged "Old" (docs/08 rule 2). */
export const OLD_AFTER_DAYS = 30

// Ties on created_at (same millisecond) fall back to id, so the order never depends
// on how storage happens to return rows.
function byCreated(a: Todo, b: Todo): number {
  return a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id)
}

/**
 * The Today list (docs/08 rules 1 and 2), for `today` in the user's time zone:
 * - due today (done or not),
 * - no due date and not done,
 * - Overdue: due before today and not done. Computed here, never stored.
 * Future and finished past items are left out.
 *
 * Order (docs/04): Overdue first, oldest due date first; then the rest by creation time.
 */
export function buildTodayList(todos: readonly Todo[], today: LocalDate): TodayTodo[] {
  const overdue: TodayTodo[] = []
  const current: TodayTodo[] = []

  for (const todo of todos) {
    const done = todo.done_at !== null
    if (todo.due_date === null) {
      if (!done) current.push({ ...todo, overdue: false, old: false })
    } else if (todo.due_date === today) {
      current.push({ ...todo, overdue: false, old: false })
    } else if (todo.due_date < today && !done) {
      const daysLate = differenceInCalendarDays(parseISO(today), parseISO(todo.due_date))
      overdue.push({ ...todo, overdue: true, old: daysLate > OLD_AFTER_DAYS })
    }
  }

  overdue.sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '') || byCreated(a, b))
  current.sort(byCreated)
  return [...overdue, ...current]
}
