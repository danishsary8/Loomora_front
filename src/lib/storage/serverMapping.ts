import type { ApiException, ApiOccurrence, ApiScheduleItem, ApiTodo } from '@/lib/api/types'
import { ApiError } from '@/lib/api'
import type {
  Occurrence,
  ScheduleException,
  ScheduleItem,
  Weekday,
} from '@/features/schedule/types'
import { DEFAULT_PRIORITY, type TodayTodo } from '@/features/todos/types'
import { ValidationError } from './errors'

// The API does not send `updated_at`; the creation time stands in so guest and server rows
// share one shape (A8-5).

export function toTodayTodo(todo: ApiTodo): TodayTodo {
  const { id, title, category, due_date, done_at, created_at, overdue, old } = todo
  return {
    id,
    title,
    category,
    due_date,
    done_at,
    created_at,
    updated_at: created_at,
    overdue,
    old,
    priority: todo.priority ?? DEFAULT_PRIORITY,
    notes: todo.notes ?? null,
    parent_id: todo.parent_id ?? null,
    repeat_rule: todo.repeat_rule ?? null,
    next_todo_id: todo.next_todo_id ?? null,
    remind_at: todo.remind_at ?? null,
    subtasks: todo.subtasks?.map(toTodayTodo) ?? [],
  }
}

export function toScheduleItem(item: ApiScheduleItem): ScheduleItem {
  return { ...item, days: item.days as Weekday[], updated_at: item.created_at }
}

export function toOccurrence({ item_id, ...rest }: ApiOccurrence): Occurrence {
  return { schedule_item_id: item_id, ...rest }
}

/** The API gives an exception no id, so item and date make a stable one. */
export function toException(exception: ApiException): ScheduleException {
  return {
    id: `${exception.item_id}:${exception.date}`,
    schedule_item_id: exception.item_id,
    date: exception.date,
    type: exception.type,
    title: exception.title ?? null,
    start_time: exception.start_time ?? null,
    end_time: exception.end_time ?? null,
  }
}

/** A 422 becomes the same ValidationError a guest write throws, so forms need no change. */
export async function asValidation<T>(call: Promise<T>): Promise<T> {
  try {
    return await call
  } catch (error) {
    if (error instanceof ApiError && error.status === 422) {
      const [first] = Object.entries(error.fieldErrors)
      if (first) throw new ValidationError(first[0], first[1])
    }
    throw error
  }
}
