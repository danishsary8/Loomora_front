import type { ImportBody } from '@/lib/api'

type ImportTodo = ImportBody['todos'][number]

function group(rows: ImportTodo[], key: (row: ImportTodo) => string | null) {
  const groups = new Map<string, ImportTodo[]>()
  for (const row of rows) {
    const id = key(row)
    if (id) groups.set(id, [...(groups.get(id) ?? []), row])
  }
  return groups
}

/**
 * Order to-dos for chunked `POST /import` (DECISIONS I9): each repeat chain from its newest
 * occurrence down to the original, each successor's subtasks right after its predecessor, and
 * every other to-do followed by its subtasks. Every `parent_id` and `next_todo_id` then points at
 * an earlier row, and no cut into calls counts more manual to-dos than the whole plan. Throws
 * rather than leave out a row this order cannot place.
 */
export function orderForImport(todos: ImportTodo[]): ImportTodo[] {
  const ids = new Set(todos.map(({ id }) => id))
  const linked = (todo: ImportTodo) => !todo.parent_id && ids.has(todo.next_todo_id ?? '')
  const subtasks = group(todos, ({ parent_id }) => parent_id)
  const predecessors = group(todos, (todo) => (linked(todo) ? todo.next_todo_id : null))
  const newest = todos.filter((todo) => !todo.parent_id && !linked(todo))
  const pending = newest.reverse().map((todo) => ({ todo, after: [] as ImportTodo[] }))

  const ordered: ImportTodo[] = []
  for (let next = pending.pop(); next; next = pending.pop()) {
    const { todo, after } = next
    ordered.push(todo, ...after)
    const own = subtasks.get(todo.id) ?? []
    const [previous, ...others] = predecessors.get(todo.id) ?? []
    if (!previous) {
      ordered.push(...own)
      continue
    }
    pending.push(...others.reverse().map((row) => ({ todo: row, after: [] })))
    pending.push({ todo: previous, after: own })
  }

  if (ordered.length !== todos.length)
    throw new Error('Some guest to-dos have links the import cannot represent.')
  return ordered
}
