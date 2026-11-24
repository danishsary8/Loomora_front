import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { LocalDate, Todo } from '@/features/todos/types'
import type { AccountDataApi, ImportBody } from '@/lib/api'
import type { DailyIntentionRecord } from '@/lib/api/types'
import type { GuestDailyIntentionRepository } from './GuestDailyIntentionRepository'
import { orderForImport } from './guestImportOrder'
import type { GuestScheduleRepository } from './GuestScheduleRepository'
import type { GuestTodoRepository } from './GuestTodoRepository'

/** The guest repositories, whichever storage is active. */
export interface GuestStorage {
  todos: GuestTodoRepository
  schedule: GuestScheduleRepository
  intentions: GuestDailyIntentionRepository
}

/** Everything a guest has on this device. */
export interface GuestPlan {
  todos: Todo[]
  items: ScheduleItem[]
  exceptions: ScheduleException[]
  checkins: ScheduleCheckin[]
  intentions: DailyIntentionRecord[]
}

export async function readGuestPlan(
  { todos, schedule, intentions }: GuestStorage,
  activeTodos: Todo[] | Promise<Todo[]> = todos.listAll(),
): Promise<GuestPlan> {
  const [allTodos, items, exceptions, checkins, dailyIntentions] = await Promise.all([
    activeTodos,
    schedule.listItems(),
    schedule.listExceptions(),
    schedule.listCheckins(),
    intentions.list(),
  ])
  return { todos: allTodos, items, exceptions, checkins, intentions: dailyIntentions }
}

export function isEmptyPlan(plan: GuestPlan): boolean {
  return plan.todos.length === 0 && plan.items.length === 0 && plan.intentions.length === 0
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

// Per-call caps of `POST /import` (docs/openapi.yaml). Schedule items are a total per user, so
// they all go in the first call.
const MAX_TODOS_PER_CALL = 500
const MAX_EXCEPTIONS_PER_CALL = 5000
const MAX_CHECKINS_PER_CALL = 10000
const MAX_INTENTIONS_PER_CALL = 1000

/** Rows keep their client UUIDs, so sending the same plan again creates no duplicates. */
function toImportBody(plan: GuestPlan): ImportBody {
  const todoIds = new Set(plan.todos.map(({ id }) => id))
  return {
    todos: orderForImport(
      plan.todos.map(
        ({
          id,
          title,
          category,
          due_date,
          done_at,
          created_at,
          priority,
          notes,
          parent_id,
          repeat_rule,
          next_todo_id,
          remind_at,
          remind_dismissed_at,
        }) => ({
          id,
          title,
          category,
          due_date,
          done_at,
          created_at,
          priority,
          notes,
          parent_id,
          repeat_rule,
          remind_at: parent_id ? null : (remind_at ?? null),
          remind_dismissed_at: !parent_id && remind_at ? (remind_dismissed_at ?? null) : null,
          // Soft-deleted occurrences are excluded from import and cannot be referenced.
          next_todo_id: next_todo_id && todoIds.has(next_todo_id) ? next_todo_id : null,
        }),
      ),
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
    daily_intentions: plan.intentions,
  }
}

/**
 * The first call carries the items; to-dos keep their import order across calls, and every call
 * stays under the API caps.
 */
function chunkImportBody(body: ImportBody): ImportBody[] {
  const count = Math.max(
    1,
    Math.ceil(body.todos.length / MAX_TODOS_PER_CALL),
    Math.ceil(body.exceptions.length / MAX_EXCEPTIONS_PER_CALL),
    Math.ceil(body.checkins.length / MAX_CHECKINS_PER_CALL),
    Math.ceil(body.daily_intentions.length / MAX_INTENTIONS_PER_CALL),
  )
  const part = <T>(rows: T[], size: number, index: number) =>
    rows.slice(index * size, (index + 1) * size)
  return Array.from({ length: count }, (_, index) => ({
    todos: part(body.todos, MAX_TODOS_PER_CALL, index),
    schedule_items: index === 0 ? body.schedule_items : [],
    exceptions: part(body.exceptions, MAX_EXCEPTIONS_PER_CALL, index),
    checkins: part(body.checkins, MAX_CHECKINS_PER_CALL, index),
    daily_intentions: part(body.daily_intentions, MAX_INTENTIONS_PER_CALL, index),
  }))
}

/**
 * Import a snapshot in one or more calls (docs/08 rule 9). After every call succeeds, clear
 * the imported data that still matches the snapshot. If a call fails, retain the plan for an
 * idempotent retry. Resolves to `false` when there was nothing to move.
 */
export async function saveGuestPlan(
  guest: GuestStorage,
  api: Pick<AccountDataApi, 'importGuestData'>,
  assertSession = () => {},
): Promise<boolean> {
  const todoSnapshot = await guest.todos.listAll({ includeDeleted: true })
  const plan = await readGuestPlan(
    guest,
    todoSnapshot.filter((todo) => !todo.deleted_at),
  )
  if (isEmptyPlan(plan)) return false
  for (const chunk of chunkImportBody(toImportBody(plan))) {
    assertSession()
    await api.importGuestData(chunk)
  }
  assertSession()
  await Promise.all([
    guest.todos.clearImported(todoSnapshot),
    guest.schedule.clearImported(plan),
    guest.intentions.clearImported(plan.intentions),
  ])
  return true
}
