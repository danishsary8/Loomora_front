import { onlineManager } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/queryClient'
import { useSetScheduleCheckin } from '@/features/schedule/useSchedule'
import { useSetTodoDone } from '@/features/todos/useTodos'
import { useUndoableDelete } from '@/features/todos/useUndoableDelete'
import { useSession } from '@/lib/api'
import { previousDay, toLocalDate } from '@/lib/date'
import { GuestScheduleRepository, GuestTodoRepository } from '@/lib/storage'
import { GuestDatabase } from '@/lib/storage/db'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { useStreak } from './useStreak'

const today = toLocalDate()
const yesterday = previousDay(today)

const accountAUser = makeUser({ id: 'user-a', email: 'a@example.com', survey_done: true })
const accountA = { ...makeTokenResponse(accountAUser), token: '1|token-a' }

const accountBUser = makeUser({ id: 'user-b', email: 'b@example.com', survey_done: true })
const accountB = { ...makeTokenResponse(accountBUser), token: '2|token-b' }

function setup(db = new GuestDatabase(`test-${crypto.randomUUID()}`)) {
  const todos = new GuestTodoRepository({ db })
  const schedule = new GuestScheduleRepository({ db })
  const queryClient = createQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProviders
        todoRepository={todos}
        scheduleRepository={schedule}
        guestDatabase={db}
        queryClient={queryClient}
      >
        {children}
      </AppProviders>
    )
  }
  return { db, todos, schedule, queryClient, wrapper }
}

function goOnline() {
  act(() => onlineManager.setOnline(true))
}

function dispatchCrossTabStorage(next: typeof accountA | null) {
  const newValue = next
    ? JSON.stringify({ token: next.token, expiresAt: next.expires_at, user: next.user })
    : null
  if (newValue) localStorage.setItem('loomora.session', newValue)
  else localStorage.removeItem('loomora.session')
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'loomora.session',
      newValue,
      storageArea: localStorage,
    }),
  )
}

beforeEach(() => onlineManager.setOnline(false))
afterEach(goOnline)

it('loads guest streak offline on a cold cache from a reopened database and preserves data on reconnect', async () => {
  const { db, todos, schedule } = setup()
  const item = await schedule.create({
    title: 'Daily habit',
    start_time: '09:00',
    end_time: '09:30',
    days: [0, 1, 2, 3, 4, 5, 6],
    starts_on: yesterday,
  })
  await schedule.setCheckin(item.id, yesterday, true)
  const todo = await todos.create({ title: 'Read', due_date: today })
  await todos.setDone(todo.id, true)
  const savedTodos = await todos.listAll()
  db.close()

  const reopened = setup(new GuestDatabase(db.name))
  try {
    const { result } = renderHook(() => useStreak(today), { wrapper: reopened.wrapper })
    await waitFor(() => {
      expect(result.current.isPaused).toBe(false)
      expect(result.current.data).toEqual({ count: 2, todayCounted: true })
    })

    goOnline()
    await act(async () => {})
    expect(result.current.data).toEqual({ count: 2, todayCounted: true })
    expect(await reopened.todos.listAll()).toEqual(savedTodos)
    expect(await reopened.schedule.listCheckins()).toHaveLength(1)
  } finally {
    reopened.db.close()
  }
})

it('refreshes guest streak offline after todo completion, schedule check-in, delete, and undo', async () => {
  const { db, todos, schedule, wrapper } = setup()
  try {
    const todo = await todos.create({ title: 'Task', due_date: today })
    const item = await schedule.create({
      title: 'Block',
      start_time: '10:00',
      end_time: '11:00',
      days: [0, 1, 2, 3, 4, 5, 6],
      starts_on: today,
    })

    const { result } = renderHook(
      () => ({
        streak: useStreak(today),
        setTodoDone: useSetTodoDone(today),
        setCheckin: useSetScheduleCheckin(),
        deletion: useUndoableDelete({ date: today }),
      }),
      { wrapper },
    )

    await waitFor(() =>
      expect(result.current.streak.data).toEqual({ count: 0, todayCounted: false }),
    )

    act(() => result.current.setTodoDone.mutate({ id: todo.id, done: true }))
    await waitFor(() =>
      expect(result.current.streak.data).toEqual({ count: 1, todayCounted: true }),
    )

    await act(async () => {
      await result.current.deletion.deleteTodo({
        ...todo,
        done_at: new Date().toISOString(),
        overdue: false,
        old: false,
        subtasks: [],
      })
    })
    await waitFor(() =>
      expect(result.current.streak.data).toEqual({ count: 0, todayCounted: false }),
    )

    await act(async () => {
      await result.current.deletion.undo()
    })
    await waitFor(() =>
      expect(result.current.streak.data).toEqual({ count: 1, todayCounted: true }),
    )

    act(() => result.current.setTodoDone.mutate({ id: todo.id, done: false }))
    await waitFor(() =>
      expect(result.current.streak.data).toEqual({ count: 0, todayCounted: false }),
    )

    act(() => result.current.setCheckin.mutate({ id: item.id, date: today, done: true }))
    await waitFor(() =>
      expect(result.current.streak.data).toEqual({ count: 1, todayCounted: true }),
    )
  } finally {
    db.close()
  }
})

it('keeps account streak dependent on the API and never falls back to guest Dexie offline', async () => {
  const { db, todos, wrapper } = setup()
  try {
    const guestTodo = await todos.create({ title: 'Guest only', due_date: today })
    await todos.setDone(guestTodo.id, true)
    useSession.getState().signIn(accountA)

    let apiCalls = 0
    server.use(
      http.get(`${API}/streak`, ({ request }) => {
        apiCalls += 1
        expect(request.headers.get('Authorization')).toBe(`Bearer ${accountA.token}`)
        return HttpResponse.json({
          data: { current_streak: 7, longest_streak: 7, today_counted: false },
        })
      }),
    )

    const { result } = renderHook(() => useStreak(today), { wrapper })
    await waitFor(() => expect(result.current.isPaused).toBe(true))
    expect(result.current.data).toBeUndefined()
    expect(apiCalls).toBe(0)

    goOnline()
    await waitFor(() =>
      expect(result.current.data).toEqual({ count: 7, longest: 7, todayCounted: false }),
    )
    expect(apiCalls).toBe(1)
  } finally {
    db.close()
  }
})

it('isolates streak across offline account transitions and cross-tab sign-out', async () => {
  const { db, todos, wrapper } = setup()
  try {
    const guestTodo = await todos.create({ title: 'Guest task', due_date: today })
    await todos.setDone(guestTodo.id, true)

    goOnline()
    useSession.getState().signIn(accountA)
    server.use(
      http.get(`${API}/streak`, ({ request }) => {
        const count = request.headers.get('Authorization') === `Bearer ${accountA.token}` ? 9 : 3
        return HttpResponse.json({
          data: { current_streak: count, longest_streak: count, today_counted: true },
        })
      }),
    )

    const { result } = renderHook(() => useStreak(today), { wrapper })
    await waitFor(() =>
      expect(result.current.data).toEqual({ count: 9, longest: 9, todayCounted: true }),
    )

    // Cross-tab sign-out while offline immediately clears Account A streak and loads guest streak.
    act(() => {
      onlineManager.setOnline(false)
      dispatchCrossTabStorage(null)
    })
    await waitFor(() => expect(result.current.data).toEqual({ count: 1, todayCounted: true }))

    // Signing in offline to Account B clears guest streak and waits for API reconnect.
    act(() => dispatchCrossTabStorage(accountB))
    expect(result.current.data).toBeUndefined()
    await waitFor(() => expect(result.current.isPaused).toBe(true))

    goOnline()
    await waitFor(() =>
      expect(result.current.data).toEqual({ count: 3, longest: 3, todayCounted: true }),
    )
  } finally {
    db.close()
  }
})

it('does not leak an in-flight guest streak read into a subsequent account session', async () => {
  const { db, todos, wrapper } = setup()
  try {
    const guestTodo = await todos.create({ title: 'Guest task', due_date: today })
    await todos.setDone(guestTodo.id, true)

    const realListAll = todos.listAll.bind(todos)
    let releaseRead!: () => void
    const gate = new Promise<void>((resolve) => {
      releaseRead = resolve
    })
    vi.spyOn(todos, 'listAll').mockImplementationOnce(async (options) => {
      await gate
      return realListAll(options)
    })

    server.use(
      http.get(`${API}/streak`, () =>
        HttpResponse.json({ data: { current_streak: 4, longest_streak: 4, today_counted: false } }),
      ),
    )

    const { result } = renderHook(() => useStreak(today), { wrapper })
    act(() => {
      onlineManager.setOnline(true)
      useSession.getState().signIn(accountA)
    })
    await waitFor(() =>
      expect(result.current.data).toEqual({ count: 4, longest: 4, todayCounted: false }),
    )

    releaseRead()
    await act(async () => {
      await gate
    })
    expect(result.current.data).toEqual({ count: 4, longest: 4, todayCounted: false })
  } finally {
    db.close()
  }
})
