import type { ImportBody } from '@/lib/api'
import { API, http, HttpResponse, server } from './apiMocks'

type ImportTodo = ImportBody['todos'][number]

export interface AccountTodo {
  id: string
  parent_id: string | null
  next_todo_id: string | null
  row?: ImportTodo
}

const LIMIT = 500
const MAX_ITEMS = 100
const counts = (created: number) => ({ created, skipped: 0 })

interface ImportBackendOptions {
  /** Rows the account already has. */
  todos?: AccountTodo[]
  /** To-do ids that belong to another account. */
  foreignIds?: string[]
  /** An answer to send instead for the given 1-based call. */
  fail?: (call: number) => Response | undefined
}

/**
 * A stand-in for `POST /import` that applies backend ImportRequest (B-044, DECISIONS I9): at most
 * 500 to-dos per call, links to rows in the call or on the account, foreign ids refused, and at
 * most 500 manual to-dos per user. A successor counts as generated only once a to-do on the
 * account or a new row in the call points at it. Each call is all-or-nothing, and rows the
 * account already has are skipped.
 */
export function importBackend({
  todos = [],
  foreignIds = [],
  fail = () => undefined,
}: ImportBackendOptions = {}) {
  const account = new Map(todos.map((todo) => [todo.id, todo]))
  const items = new Set<string>()
  const checkins = new Set<string>()
  const calls: ImportBody[] = []

  function errorsFor(body: ImportBody): string[] {
    if (body.todos.length > LIMIT) return ['todos']
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
      const fresh = body.todos.filter(({ id }) => !account.has(id))
      for (const row of fresh) account.set(row.id, { ...row, row })
      body.schedule_items.forEach(({ id }) => items.add(id))
      body.checkins.forEach(({ id }) => checkins.add(id))
      return HttpResponse.json({
        data: {
          todos: counts(fresh.length),
          schedule_items: counts(body.schedule_items.length),
          exceptions: counts(body.exceptions.length),
          checkins: counts(body.checkins.length),
          daily_intentions: counts(body.daily_intentions.length),
        },
      })
    }),
  )
  return { account, calls, checkins }
}
