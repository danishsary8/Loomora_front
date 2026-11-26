import type { Note } from '@/features/notes/types'
import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { LocalDate, Todo } from '@/features/todos/types'
import type { AccountDataApi, ImportBody } from '@/lib/api'
import type { DailyIntentionRecord } from '@/lib/api/types'
import type { StoredNote } from './db'
import type { GuestDailyIntentionRepository } from './GuestDailyIntentionRepository'
import { orderForImport } from './guestImportOrder'
import type { GuestNoteRepository } from './GuestNoteRepository'
import type { GuestScheduleRepository } from './GuestScheduleRepository'
import type { GuestTodoRepository } from './GuestTodoRepository'

/** The guest repositories, whichever storage is active. */
export interface GuestStorage {
  todos: GuestTodoRepository
  schedule: GuestScheduleRepository
  intentions: GuestDailyIntentionRepository
  notes?: GuestNoteRepository
}

/** Everything a guest has on this device. */
export interface GuestPlan {
  todos: Todo[]
  items: ScheduleItem[]
  exceptions: ScheduleException[]
  checkins: ScheduleCheckin[]
  intentions: DailyIntentionRecord[]
  notes: Note[]
}

export async function readGuestPlan(
  { todos, schedule, intentions, notes }: GuestStorage,
  activeTodos: Todo[] | Promise<Todo[]> = todos.listAll(),
  activeNotes: StoredNote[] | Promise<StoredNote[]> = notes ? notes.listAll() : Promise.resolve([]),
): Promise<GuestPlan> {
  const [allTodos, items, exceptions, checkins, dailyIntentions, allNotes] = await Promise.all([
    activeTodos,
    schedule.listItems(),
    schedule.listExceptions(),
    schedule.listCheckins(),
    intentions.list(),
    activeNotes,
  ])
  return {
    todos: allTodos,
    items,
    exceptions,
    checkins,
    intentions: dailyIntentions,
    notes: allNotes,
  }
}

export function isEmptyPlan(plan: GuestPlan): boolean {
  return (
    plan.todos.length === 0 &&
    plan.items.length === 0 &&
    plan.intentions.length === 0 &&
    plan.notes.length === 0
  )
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
const MAX_NOTES_PER_CALL = 500
const MAX_INTENTIONS_PER_CALL = 1000

/** Rows keep their client UUIDs, so sending the same plan again creates no duplicates. */
function toImportBody(plan: GuestPlan): ImportBody {
  const todoIds = new Set(plan.todos.map(({ id }) => id))
  const scheduleItemIds = new Set(plan.items.map(({ id }) => id))
  const notes = plan.notes.map(
    ({ id, title, body, schedule_item_id, local_date, created_at, updated_at }) => {
      const validBlock =
        schedule_item_id && scheduleItemIds.has(schedule_item_id) ? schedule_item_id : null
      return {
        id,
        title,
        body,
        schedule_item_id: validBlock,
        local_date: validBlock ? local_date : null,
        created_at,
        updated_at,
      }
    },
  )
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
    ...(notes.length > 0 ? { notes } : {}),
    daily_intentions: plan.intentions,
  }
}

/**
 * The first call carries the items; to-dos keep their import order across calls, and every call
 * stays under the API caps.
 */
function chunkImportBody(body: ImportBody): ImportBody[] {
  const notes = body.notes ?? []
  const count = Math.max(
    1,
    Math.ceil(body.todos.length / MAX_TODOS_PER_CALL),
    Math.ceil(body.exceptions.length / MAX_EXCEPTIONS_PER_CALL),
    Math.ceil(body.checkins.length / MAX_CHECKINS_PER_CALL),
    Math.ceil(notes.length / MAX_NOTES_PER_CALL),
    Math.ceil(body.daily_intentions.length / MAX_INTENTIONS_PER_CALL),
  )
  const part = <T>(rows: T[], size: number, index: number) =>
    rows.slice(index * size, (index + 1) * size)
  return Array.from({ length: count }, (_, index) => {
    const noteChunk = part(notes, MAX_NOTES_PER_CALL, index)
    return {
      todos: part(body.todos, MAX_TODOS_PER_CALL, index),
      schedule_items: index === 0 ? body.schedule_items : [],
      exceptions: part(body.exceptions, MAX_EXCEPTIONS_PER_CALL, index),
      checkins: part(body.checkins, MAX_CHECKINS_PER_CALL, index),
      ...(notes.length > 0 ? { notes: noteChunk } : {}),
      daily_intentions: part(body.daily_intentions, MAX_INTENTIONS_PER_CALL, index),
    }
  })
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
  const [todoSnapshot, noteSnapshot] = await Promise.all([
    guest.todos.listAll({ includeDeleted: true }),
    guest.notes ? guest.notes.listAll({ includeDeleted: true }) : Promise.resolve([]),
  ])
  const plan = await readGuestPlan(
    guest,
    todoSnapshot.filter((todo) => !todo.deleted_at),
    noteSnapshot.filter((note) => !note.deleted_at),
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
    ...(guest.notes ? [guest.notes.clearImported(noteSnapshot)] : []),
  ])
  return true
}
