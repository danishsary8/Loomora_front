import { byCreated } from './todayList'
import type { TodayTodo } from './types'

export function changeTodayTodo(
  list: TodayTodo[],
  id: string,
  change: (todo: TodayTodo) => TodayTodo | null,
): TodayTodo[] {
  return list.flatMap((todo) => {
    if (todo.id === id) return change(todo) ?? []
    if (todo.subtasks.some((child) => child.id === id)) {
      return { ...todo, subtasks: changeTodayTodo(todo.subtasks, id, change) }
    }
    return todo
  })
}

export function insertTodayTodo(list: TodayTodo[], item: TodayTodo, index = -1): TodayTodo[] {
  if (item.parent_id)
    return changeTodayTodo(list, item.parent_id, (parent) => ({
      ...parent,
      subtasks: [...insertSibling(parent.subtasks, item, -1)].sort(byCreated),
    }))
  return insertSibling(list, item, index)
}

function insertSibling(list: TodayTodo[], item: TodayTodo, index: number): TodayTodo[] {
  if (list.some((todo) => todo.id === item.id)) return list
  const next = [...list]
  next.splice(index < 0 ? next.length : index, 0, item)
  return next
}
