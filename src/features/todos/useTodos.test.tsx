import { QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createQueryClient } from '@/app/queryClient'
import { todosApi, useSession } from '@/lib/api'
import { ServerTodoRepository, TodoRepositoryContext } from '@/lib/storage'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import type { TodayTodo } from './types'
import { todoKeys, useSetTodoDone } from './useTodos'

it('settles parent completion before a queued child check and retains its saved state on failure', async () => {
  useSession.getState().signIn(makeTokenResponse())
  const date = '2026-10-24'
  const key = todoKeys.today(date)
  const stamp = '2026-10-24T10:00:00.000Z'
  const child: TodayTodo = {
    id: 'child',
    parent_id: 'parent',
    title: 'Step',
    category: 'work',
    priority: 'normal',
    notes: null,
    repeat_rule: null,
    next_todo_id: null,
    remind_at: null,
    created_at: stamp,
    updated_at: stamp,
    due_date: null,
    done_at: null,
    old: false,
    overdue: false,
    subtasks: [],
  }
  const parent: TodayTodo = {
    ...child,
    id: 'parent',
    parent_id: null,
    title: 'Task',
    due_date: date,
    subtasks: [child],
  }
  const client = createQueryClient()
  const repo = new ServerTodoRepository(todosApi)
  client.setQueryData(key, [parent])

  let respond = () => {}
  const response = new Promise<void>((resolve) => {
    respond = resolve
  })
  let requestArrived = () => {}
  const requested = new Promise<void>((resolve) => {
    requestArrived = resolve
  })
  server.use(
    http.post(`${API}/todos/parent/done`, async () => {
      requestArrived()
      await response
      return HttpResponse.json({
        data: {
          ...parent,
          done_at: stamp,
          repeat_rule: { type: 'daily' },
          next_todo_id: 'next',
          subtasks: [{ ...child, done_at: stamp }],
        },
      })
    }),
    http.post(`${API}/todos/child/done`, () =>
      HttpResponse.json({ message: 'Failed' }, { status: 500 }),
    ),
  )

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <TodoRepositoryContext.Provider value={repo}>{children}</TodoRepositoryContext.Provider>
      </QueryClientProvider>
    )
  }

  const { result } = renderHook(() => useSetTodoDone(date), { wrapper })
  try {
    act(() => result.current.mutate({ id: parent.id, done: true }))
    await requested
    act(() => result.current.mutate({ id: child.id, done: true }))
    await waitFor(() => expect(result.current.isPaused).toBe(true))
  } finally {
    respond()
    await waitFor(() => expect(client.isMutating()).toBe(0))
    useSession.getState().signOut()
  }

  const [saved] = client.getQueryData<TodayTodo[]>(key) ?? []
  expect(saved).toMatchObject({
    done_at: stamp,
    repeat_rule: { type: 'daily' },
    next_todo_id: 'next',
  })
  expect(saved?.subtasks[0]?.done_at).toBe(stamp)
})
