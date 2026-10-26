import type { ApiClient } from './client'
import type { ApiTodo, TodoBody } from './types'

/** The to-do endpoints of docs/openapi.yaml. */
export function createTodosApi({ request }: ApiClient) {
  const one = (r: { data: ApiTodo }) => r.data
  return {
    list: (date: string) =>
      request<{ data: ApiTodo[] }>('GET', '/todos', { query: { date } }).then((r) => r.data),
    create: (body: TodoBody) => request<{ data: ApiTodo }>('POST', '/todos', { body }).then(one),
    update: (id: string, body: TodoBody) =>
      request<{ data: ApiTodo }>('PATCH', `/todos/${id}`, { body }).then(one),
    setDone: (id: string) => request<{ data: ApiTodo }>('POST', `/todos/${id}/done`).then(one),
    clearDone: (id: string) => request<{ data: ApiTodo }>('DELETE', `/todos/${id}/done`).then(one),
    remove: (id: string) => request<undefined>('DELETE', `/todos/${id}`),
  }
}

export type TodosApi = ReturnType<typeof createTodosApi>
