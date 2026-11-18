import { scheduleApi, todosApi, accountDataApi, useSession } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { ValidationError } from './errors'
import { ServerScheduleRepository } from './ServerScheduleRepository'
import { ServerStreakRepository } from './ServerStreakRepository'
import { ServerTodoRepository } from './ServerTodoRepository'

const ID = '4e2a1b3c-5d6e-4f70-8a9b-0c1d2e3f4a5b'
const apiTodo = {
  id: ID,
  title: 'Read',
  category: 'study',
  due_date: '2026-10-26',
  done_at: null,
  overdue: false,
  old: false,
  created_at: '2026-10-26T01:00:00Z',
}
const apiItem = {
  id: ID,
  title: 'Math class',
  category: 'study',
  start_time: '08:00',
  end_time: '09:30',
  days: [0, 2],
  starts_on: '2026-10-25',
  ends_on: null,
  created_at: '2026-10-24T23:30:00Z',
}

beforeEach(() => useSession.getState().signIn(makeTokenResponse()))

describe('ServerTodoRepository', () => {
  const repo = new ServerTodoRepository(todosApi)

  it('lists the Today list with the overdue flags and sends the date and token', async () => {
    let seen: { date: string | null; auth: string | null } | null = null
    server.use(
      http.get(`${API}/todos`, ({ request }) => {
        seen = {
          date: new URL(request.url).searchParams.get('date'),
          auth: request.headers.get('Authorization'),
        }
        return HttpResponse.json({ data: [{ ...apiTodo, overdue: true, old: true }] })
      }),
    )
    const [todo] = await repo.listForDate('2026-10-26')
    expect(seen).toEqual({ date: '2026-10-26', auth: 'Bearer 1|test-token' })
    expect(todo).toMatchObject({ id: ID, title: 'Read', overdue: true, old: true })
    expect(todo?.updated_at).toBe(todo?.created_at)
  })

  it('creates, edits, checks off, un-checks and deletes', async () => {
    const calls: string[] = []
    server.use(
      http.post(`${API}/todos`, async ({ request }) => {
        calls.push(`POST /todos ${JSON.stringify(await request.json())}`)
        return HttpResponse.json({ data: apiTodo }, { status: 201 })
      }),
      http.patch(`${API}/todos/${ID}`, async ({ request }) => {
        calls.push(`PATCH ${JSON.stringify(await request.json())}`)
        return HttpResponse.json({ data: { ...apiTodo, title: 'Read more' } })
      }),
      http.post(`${API}/todos/${ID}/done`, () => {
        calls.push('POST done')
        return HttpResponse.json({ data: { ...apiTodo, done_at: '2026-10-26T02:00:00Z' } })
      }),
      http.delete(`${API}/todos/${ID}/done`, () => {
        calls.push('DELETE done')
        return HttpResponse.json({ data: apiTodo })
      }),
      http.delete(`${API}/todos/${ID}`, () => {
        calls.push('DELETE todo')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    expect((await repo.create({ title: 'Read', due_date: '2026-10-26' })).id).toBe(ID)
    expect((await repo.update(ID, { title: 'Read more' })).title).toBe('Read more')
    expect((await repo.setDone(ID, true)).done_at).toBe('2026-10-26T02:00:00Z')
    expect((await repo.setDone(ID, false)).done_at).toBeNull()
    await repo.delete(ID)
    expect(calls).toEqual([
      'POST /todos {"title":"Read","due_date":"2026-10-26"}',
      'PATCH {"title":"Read more"}',
      'POST done',
      'DELETE done',
      'DELETE todo',
    ])
  })

  it('turns a 422 into the ValidationError a guest write throws', async () => {
    server.use(
      http.post(`${API}/todos`, () =>
        HttpResponse.json(
          { message: 'Invalid', errors: { title: ['The title field is required.'] } },
          { status: 422 },
        ),
      ),
    )
    await expect(repo.create({ title: '' })).rejects.toEqual(
      expect.objectContaining({
        name: 'ValidationError',
        field: 'title',
        message: 'The title field is required.',
      }),
    )
    await expect(repo.create({ title: '' })).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('ServerScheduleRepository', () => {
  const repo = new ServerScheduleRepository(scheduleApi)

  it('lists items and maps occurrences to the app shape', async () => {
    server.use(
      http.get(`${API}/schedule/items`, () => HttpResponse.json({ data: [apiItem] })),
      http.get(`${API}/schedule/day`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('date')).toBe('2026-10-26')
        return HttpResponse.json({
          date: '2026-10-26',
          data: [
            {
              item_id: ID,
              date: '2026-10-26',
              title: 'Math class',
              category: 'study',
              start_time: '08:00',
              end_time: '09:30',
              done: true,
              overridden: false,
            },
          ],
        })
      }),
    )
    expect(await repo.listItems()).toEqual([{ ...apiItem, updated_at: apiItem.created_at }])
    expect(await repo.listForDate('2026-10-26')).toEqual([
      {
        schedule_item_id: ID,
        date: '2026-10-26',
        title: 'Math class',
        category: 'study',
        start_time: '08:00',
        end_time: '09:30',
        done: true,
        overridden: false,
      },
    ])
  })

  it('creates, edits and deletes an item', async () => {
    const calls: string[] = []
    server.use(
      http.post(`${API}/schedule/items`, async ({ request }) => {
        calls.push(`POST ${JSON.stringify(await request.json())}`)
        return HttpResponse.json({ data: apiItem }, { status: 201 })
      }),
      http.patch(`${API}/schedule/items/${ID}`, async ({ request }) => {
        calls.push(`PATCH ${JSON.stringify(await request.json())}`)
        return HttpResponse.json({ data: { ...apiItem, end_time: '10:00' } })
      }),
      http.delete(`${API}/schedule/items/${ID}`, () => {
        calls.push('DELETE')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await repo.create({ title: 'Math class', start_time: '08:00', end_time: '09:30', days: [0, 2] })
    expect((await repo.update(ID, { end_time: '10:00' })).end_time).toBe('10:00')
    await repo.delete(ID)
    expect(calls).toEqual([
      'POST {"title":"Math class","start_time":"08:00","end_time":"09:30","days":[0,2]}',
      'PATCH {"end_time":"10:00"}',
      'DELETE',
    ])
  })

  it('sets and removes a one-day exception and maps it to the app shape', async () => {
    const calls: string[] = []
    server.use(
      http.put(`${API}/schedule/items/${ID}/exceptions/2026-10-26`, async ({ request }) => {
        const body = (await request.json()) as { type: string; title?: string }
        calls.push(`PUT ${JSON.stringify(body)}`)
        return HttpResponse.json({
          data: { item_id: ID, date: '2026-10-26', type: body.type, title: body.title },
        })
      }),
      http.delete(`${API}/schedule/items/${ID}/exceptions/2026-10-26`, () => {
        calls.push('DELETE')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    expect(await repo.setException(ID, '2026-10-26', { type: 'override', title: 'Lab' })).toEqual({
      id: `${ID}:2026-10-26`,
      schedule_item_id: ID,
      date: '2026-10-26',
      type: 'override',
      title: 'Lab',
      start_time: null,
      end_time: null,
    })
    await repo.removeException(ID, '2026-10-26')
    expect(calls).toEqual(['PUT {"type":"override","title":"Lab"}', 'DELETE'])
  })

  it('marks an occurrence done and undoes it', async () => {
    const calls: string[] = []
    server.use(
      http.post(`${API}/schedule/items/${ID}/checkins/2026-10-26`, () => {
        calls.push('POST')
        return HttpResponse.json({
          data: { item_id: ID, date: '2026-10-26', done: true, done_at: '2026-10-26T02:00:00Z' },
        })
      }),
      http.delete(`${API}/schedule/items/${ID}/checkins/2026-10-26`, () => {
        calls.push('DELETE')
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await repo.setCheckin(ID, '2026-10-26', true)
    await repo.setCheckin(ID, '2026-10-26', false)
    expect(calls).toEqual(['POST', 'DELETE'])
  })

  it('turns a 422 into a ValidationError', async () => {
    server.use(
      http.post(`${API}/schedule/items`, () =>
        HttpResponse.json(
          { message: 'Invalid', errors: { end_time: ['End must be after start.'] } },
          { status: 422 },
        ),
      ),
    )
    await expect(
      repo.create({ title: 'x', start_time: '10:00', end_time: '09:00', days: [0] }),
    ).rejects.toEqual(expect.objectContaining({ name: 'ValidationError', field: 'end_time' }))
  })
})

describe('ServerStreakRepository', () => {
  it('maps the API streak and sends the local date', async () => {
    server.use(
      http.get(`${API}/streak`, ({ request }) => {
        expect(new URL(request.url).searchParams.get('date')).toBe('2026-10-26')
        return HttpResponse.json({
          data: { current_streak: 4, longest_streak: 9, today_counted: true },
        })
      }),
    )
    expect(await new ServerStreakRepository(accountDataApi).get('2026-10-26')).toEqual({
      count: 4,
      todayCounted: true,
    })
  })
})
