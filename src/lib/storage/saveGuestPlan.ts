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

// Per-call caps of `POST /import` (docs/openapi.yaml). To-dos and items are totals per user, so
// they all go in the first call.
const MAX_EXCEPTIONS_PER_CALL = 5000
const MAX_CHECKINS_PER_CALL = 10000

/** Rows keep their client UUIDs, so sending the same plan again creates no duplicates. */
function toImportBody(plan: GuestPlan): ImportBody {
  return {
    todos: [...plan.todos]
      .sort((a, b) => Number(a.parent_id !== null) - Number(b.parent_id !== null))
      .map(
        ({ id, title, category, due_date, done_at, created_at, priority, notes, parent_id }) => ({
          id,
          title,
          category,
          due_date,
          done_at,
          created_at,
          priority,
          notes,
          parent_id,
        }),
      ),
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

/** The first call carries to-dos and items; every call stays under the exception and check-in caps. */
function chunkImportBody(body: ImportBody): ImportBody[] {
  const count = Math.max(
    1,
    Math.ceil(body.exceptions.length / MAX_EXCEPTIONS_PER_CALL),
    Math.ceil(body.checkins.length / MAX_CHECKINS_PER_CALL),
  )
  return Array.from({ length: count }, (_, index) => ({
    todos: index === 0 ? body.todos : [],
    schedule_items: index === 0 ? body.schedule_items : [],
    exceptions: body.exceptions.slice(
      index * MAX_EXCEPTIONS_PER_CALL,
      (index + 1) * MAX_EXCEPTIONS_PER_CALL,
    ),
    checkins: body.checkins.slice(
      index * MAX_CHECKINS_PER_CALL,
      (index + 1) * MAX_CHECKINS_PER_CALL,
    ),
  }))
}

/**
 * Move the guest plan into the account (docs/08 rule 9): `POST /import` (several calls when the
 * plan is over the caps), then clear the device. If any call fails nothing is cleared, so the
 * plan stays and can be sent again; the import is idempotent by id. Resolves to `false` when there was nothing to move.
 */
export async function saveGuestPlan(guest: GuestStorage, api: AccountDataApi): Promise<boolean> {
  const plan = await readGuestPlan(guest)
  if (isEmptyPlan(plan)) return false
  for (const chunk of chunkImportBody(toImportBody(plan))) {
    await api.importGuestData(chunk)
  }
  await Promise.all([guest.todos.clear(), guest.schedule.clear()])
  return true
}
