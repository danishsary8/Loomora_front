import type { TodayTodo, Todo } from '@/features/todos/types'
import type { TodoRepository } from './TodoRepository'

/**
 * Account to-dos via the API (docs/09 `/todos`). Stub until the account tasks (P4/P5);
 * every method rejects so it cannot be used by mistake.
 */
export class ServerTodoRepository implements TodoRepository {
  listForDate(): Promise<TodayTodo[]> {
    return notYet('listForDate')
  }

  create(): Promise<Todo> {
    return notYet('create')
  }

  update(): Promise<Todo> {
    return notYet('update')
  }

  setDone(): Promise<Todo> {
    return notYet('setDone')
  }

  delete(): Promise<void> {
    return notYet('delete')
  }
}

function notYet(method: string): Promise<never> {
  return Promise.reject(new Error(`ServerTodoRepository.${method} is not implemented yet`))
}
