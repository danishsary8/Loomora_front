import type { FocusSessionInput } from '@/features/focus/types'
import type { ImportBody } from '@/lib/api'
import { canonicalFocusPayload, sameFocusPayload } from '@/lib/storage/focusSessionPayload'
import { API, http, HttpResponse, server } from './apiMocks'

type ImportTodo = ImportBody['todos'][number]

export interface AccountTodo {
  id: string
  parent_id: string | null
  next_todo_id: string | null
  row?: ImportTodo
}

export interface AccountFocusSession {
  payload: Required<FocusSessionInput>
  deleted?: boolean
}

const LIMIT = 500
const MAX_ITEMS = 100
const MAX_FOCUS_SESSIONS = 500
const counts = (created: number, skipped = 0) => ({ created, skipped })

/** Successful acknowledgment for every collection submitted in a test batch. */
export function acknowledgeImport(body: ImportBody) {
  return {
    todos: counts(body.todos.length),
    schedule_items: counts(body.schedule_items.length),
    exceptions: counts(body.exceptions.length),
    checkins: counts(body.checkins.length),
    focus_sessions: counts(body.focus_sessions.length),
    daily_intentions: counts(body.daily_intentions.length),
    ...(body.notes ? { notes: { ...counts(body.notes.length), skipped_details: [] } } : {}),
  }
}

interface ImportBackendOptions {
  /** Rows the account already has. */
  todos?: AccountTodo[]
  /** Focus sessions the account already has (including account-deleted rows). */
  focusSessions?: AccountFocusSession[]
  /** To-do ids that belong to another account. */
  foreignIds?: string[]
  /** Focus session ids that belong to another account. */
  foreignFocusIds?: string[]
  /** An answer to send instead for the given 1-based call. */
  fail?: (call: number) => Response | undefined
}

/**
 * A stand-in for `POST /import` that applies backend ImportRequest (B-044, B-049, DECISIONS I9):
 * at most 500 to-dos and 500 focus sessions per call, links to rows in the call or on the account,
 * foreign ids refused (422 for to-dos, 409 for focus sessions), and at most 500 manual to-dos per
 * user. Each call is all-or-nothing, and identical replays are skipped.
 */
export function importBackend({
  todos = [],
  focusSessions = [],
  foreignIds = [],
  foreignFocusIds = [],
  fail = () => undefined,
}: ImportBackendOptions = {}) {
  const account = new Map(todos.map((todo) => [todo.id, todo]))
  const accountFocus = new Map(
    focusSessions.map((entry) => [entry.payload.id.toLowerCase(), entry]),
  )
  const foreignFocus = new Set(foreignFocusIds.map((id) => id.toLowerCase()))
  const items = new Set<string>()
  const checkins = new Set<string>()
  const calls: ImportBody[] = []

  function errorsFor(body: ImportBody): string[] {
    if (body.todos.length > LIMIT) return ['todos']
    const sessions = body.focus_sessions ?? []
    if (sessions.length > MAX_FOCUS_SESSIONS) return ['focus_sessions']
    const existing = [...account.values()]
    const parents = new Set(
      [...body.todos, ...existing].filter(({ parent_id }) => !parent_id).map(({ id }) => id),
    )
    const known = new Set([...body.todos, ...existing].map(({ id }) => id))
    const knownItems = new Set([...items, ...body.schedule_items.map(({ id }) => id)])
    const errors = body.todos.flatMap((todo, i) => [
      ...(foreignIds.includes(todo.id) ? [`todos.${i}.id`] : []),
      ...(todo.parent_id && !parents.has(todo.parent_id) ? [`todos.${i}.parent_id`] : []),
      ...(todo.next_todo_id && !known.has(todo.next_todo_id) ? [`todos.${i}.next_todo_id`] : []),
    ])
    for (const key of ['exceptions', 'checkins'] as const) {
      body[key].forEach(({ schedule_item_id }, i) => {
        if (!knownItems.has(schedule_item_id)) errors.push(`${key}.${i}.schedule_item_id`)
      })
    }
    const seenFocusIds = new Set<string>()
    sessions.forEach((session, i) => {
      const id = session.id.toLowerCase()
      if (
        'deleted_at' in session &&
        (session as Record<string, unknown>).deleted_at !== undefined
      ) {
        errors.push(`focus_sessions.${i}.deleted_at`)
      }
      if (seenFocusIds.has(id)) errors.push(`focus_sessions.${i}.id`)
      seenFocusIds.add(id)
      if (session.todo_id && !known.has(session.todo_id)) {
        errors.push(`focus_sessions.${i}.todo_id`)
      }
      if (session.schedule_item_id && !knownItems.has(session.schedule_item_id)) {
        errors.push(`focus_sessions.${i}.schedule_item_id`)
      }
    })
    if (errors.length > 0) return errors

    const fresh = body.todos.filter(({ id }) => !account.has(id))
    const successors = new Set(
      [...account.values(), ...fresh].flatMap(({ next_todo_id }) => next_todo_id ?? []),
    )
    const manual = ({ id, parent_id }: AccountTodo) =>
      !successors.has(id) && (!parent_id || !successors.has(parent_id))
    if (existing.filter(manual).length + fresh.filter(manual).length > LIMIT) return ['todos']
    const newItems = body.schedule_items.filter(({ id }) => !items.has(id))
    if (items.size + newItems.length > MAX_ITEMS) return ['schedule_items']
    return []
  }

  function hasFocusConflict(sessions: FocusSessionInput[]): boolean {
    for (const session of sessions) {
      const id = session.id.toLowerCase()
      if (foreignFocus.has(id)) return true
      const existing = accountFocus.get(id)
      if (existing && !sameFocusPayload(existing.payload, session)) return true
    }
    return false
  }

  server.use(
    http.post(`${API}/import`, async ({ request }) => {
      const body = (await request.json()) as ImportBody
      calls.push(body)
      const failure = fail(calls.length)
      if (failure) return failure
      const errors = errorsFor(body)
      if (errors.length > 0) {
        return HttpResponse.json(
          { message: 'Invalid', errors: Object.fromEntries(errors.map((key) => [key, ['No']])) },
          { status: 422 },
        )
      }
      const sessions = body.focus_sessions ?? []
      if (hasFocusConflict(sessions)) {
        return HttpResponse.json({ message: 'Focus session conflict.' }, { status: 409 })
      }
      const fresh = body.todos.filter(({ id }) => !account.has(id))
      for (const row of fresh) account.set(row.id, { ...row, row })
      body.schedule_items.forEach(({ id }) => items.add(id))
      body.checkins.forEach(({ id }) => checkins.add(id))
      let focusCreated = 0
      for (const session of sessions) {
        const canonical = canonicalFocusPayload(session)
        if (!accountFocus.has(canonical.id)) {
          accountFocus.set(canonical.id, { payload: canonical })
          focusCreated += 1
        }
      }
      return HttpResponse.json({
        data: {
          todos: counts(fresh.length, body.todos.length - fresh.length),
          schedule_items: counts(body.schedule_items.length),
          exceptions: counts(body.exceptions.length),
          checkins: counts(body.checkins.length),
          ...(Array.isArray(body.focus_sessions)
            ? { focus_sessions: counts(focusCreated, sessions.length - focusCreated) }
            : {}),
          daily_intentions: counts(body.daily_intentions.length),
        },
      })
    }),
  )
  return { account, accountFocus, calls, checkins }
}
