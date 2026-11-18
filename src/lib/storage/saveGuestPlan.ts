import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { LocalDate, Todo } from '@/features/todos/types'
import type { AccountDataApi, ImportBody } from '@/lib/api'
import type { GuestScheduleRepository } from './GuestScheduleRepository'
import type { GuestTodoRepository } from './GuestTodoRepository'

/** The guest repositories, whichever storage is active. */
export interface GuestStorage {
  todos: GuestTodoRepository
  schedule: GuestScheduleRepository
}

/** Everything a guest has on this device. */
export interface GuestPlan {
  todos: Todo[]
  items: ScheduleItem[]
  exceptions: ScheduleException[]
  checkins: ScheduleCheckin[]
}

export async function readGuestPlan({ todos, schedule }: GuestStorage): Promise<GuestPlan> {
  const [allTodos, items, exceptions, checkins] = await Promise.all([
    todos.listAll(),
    schedule.listItems(),
    schedule.listExceptions(),
    schedule.listCheckins(),
  ])
  return { todos: allTodos, items, exceptions, checkins }
}

export function isEmptyPlan(plan: GuestPlan): boolean {
  return plan.todos.length === 0 && plan.items.length === 0
}

/** Things checked off so far (to-dos and schedule occurrences). */
export function checkOffCount(plan: GuestPlan): number {
  return plan.todos.filter((todo) => todo.done_at !== null).length + plan.checkins.length
}

/** A day before `today` with to-dos due, all of them done (the "first full day" of docs/04 Flow 3). */
export function hadFullDay(plan: GuestPlan, today: LocalDate): boolean {
  const days = new Map<LocalDate, boolean>()
  for (const { due_date, done_at } of plan.todos) {
    if (due_date === null || due_date >= today) continue
    days.set(due_date, (days.get(due_date) ?? true) && done_at !== null)
  }
  return [...days.values()].some(Boolean)
}

/** Rows keep their client UUIDs, so sending the same plan again creates no duplicates. */
function toImportBody(plan: GuestPlan): ImportBody {
  return {
    todos: plan.todos.map(({ id, title, category, due_date, done_at, created_at }) => ({
      id,
      title,
      category,
      due_date,
      done_at,
      created_at,
    })),
    schedule_items: plan.items.map(
      ({ id, title, category, start_time, end_time, days, starts_on, ends_on, created_at }) => ({
        id,
        title,
        category,
        start_time,
        end_time,
        days,
        starts_on,
        ends_on,
        created_at,
      }),
    ),
    exceptions: plan.exceptions,
    checkins: plan.checkins,
  }
}

/**
 * Move the guest plan into the account (docs/08 rule 9): one `POST /import`, then clear the
 * device. If the call fails nothing is cleared, so the plan stays and can be sent again.
 * Resolves to `false` when there was nothing to move.
 */
export async function saveGuestPlan(guest: GuestStorage, api: AccountDataApi): Promise<boolean> {
  const plan = await readGuestPlan(guest)
  if (isEmptyPlan(plan)) return false
  await api.importGuestData(toImportBody(plan))
  await Promise.all([guest.todos.clear(), guest.schedule.clear()])
  return true
}
