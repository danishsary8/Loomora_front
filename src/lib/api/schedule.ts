import type { ApiClient } from './client'
import type {
  ApiException,
  ApiOccurrence,
  ApiScheduleItem,
  ExceptionBody,
  ScheduleItemBody,
} from './types'

/** The schedule endpoints of docs/openapi.yaml. */
export function createScheduleApi({ request }: ApiClient) {
  const one = (r: { data: ApiScheduleItem }) => r.data
  return {
    listItems: () =>
      request<{ data: ApiScheduleItem[] }>('GET', '/schedule/items').then((r) => r.data),
    day: (date: string) =>
      request<{ data: ApiOccurrence[] }>('GET', '/schedule/day', { query: { date } }).then(
        (r) => r.data,
      ),
    create: (body: ScheduleItemBody) =>
      request<{ data: ApiScheduleItem }>('POST', '/schedule/items', { body }).then(one),
    update: (id: string, body: ScheduleItemBody) =>
      request<{ data: ApiScheduleItem }>('PATCH', `/schedule/items/${id}`, { body }).then(one),
    remove: (id: string) => request<undefined>('DELETE', `/schedule/items/${id}`),
    setException: (id: string, date: string, body: ExceptionBody) =>
      request<{ data: ApiException }>('PUT', `/schedule/items/${id}/exceptions/${date}`, {
        body,
      }).then((r) => r.data),
    removeException: (id: string, date: string) =>
      request<undefined>('DELETE', `/schedule/items/${id}/exceptions/${date}`),
    setCheckin: (id: string, date: string) =>
      request<unknown>('POST', `/schedule/items/${id}/checkins/${date}`),
    removeCheckin: (id: string, date: string) =>
      request<undefined>('DELETE', `/schedule/items/${id}/checkins/${date}`),
  }
}

export type ScheduleApi = ReturnType<typeof createScheduleApi>
