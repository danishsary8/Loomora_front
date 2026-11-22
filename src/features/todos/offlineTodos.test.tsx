import { onlineManager } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/queryClient'
import { AddTodoSheet } from '@/features/today/AddTodoSheet'
import { useSession } from '@/lib/api'
import { GuestDatabase } from '@/lib/storage/db'
import { GuestTodoRepository } from '@/lib/storage'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { createTestRepository, renderRoute } from '@/test/renderRoute'
import { useCreateTodo, useSetTodoDone, useTodayTodos, useUpdateTodo } from './useTodos'
import { useUndoableDelete } from './useUndoableDelete'

const DATE = '2026-10-24'
const createTarget = { type: 'create' } as const
const accountB = { ...makeTokenResponse(makeUser({ id: 'account-b' })), token: '2|test-token' }

function setup() {
  const { db, repo } = createTestRepository()
  const queryClient = createQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProviders todoRepository={repo} guestDatabase={db} queryClient={queryClient}>
        {children}
      </AppProviders>
    )
  }
  return { db, repo, queryClient, wrapper }
}

function goOnline() {
  act(() => onlineManager.setOnline(true))
}

beforeEach(() => onlineManager.setOnline(false))
afterEach(goOnline)

it('commits an offline create and refreshes Today before reconnecting', async () => {
  const { repo, wrapper } = setup()
  const { result } = renderHook(() => ({ create: useCreateTodo(), list: useTodayTodos(DATE) }), {
    wrapper,
  })

  act(() => result.current.create.mutate({ title: 'Offline task', due_date: DATE }))
  await waitFor(() => expect(result.current.create.isSuccess).toBe(true))
  expect(result.current.list.data).toMatchObject([{ title: 'Offline task' }])
  const saved = await repo.listAll()
  expect(saved).toMatchObject([{ title: 'Offline task', due_date: DATE }])

  goOnline()
  await act(async () => {})
  expect(await repo.listAll()).toEqual(saved)
})

it('loads the offline list from a newly opened connection', async () => {
  const { db, repo } = createTestRepository()
  await repo.create({ title: 'Previously saved', due_date: DATE })
  db.close()
  const reopened = new GuestDatabase(db.name)
  try {
    const { result } = renderHook(() => useTodayTodos(DATE), {
      wrapper: ({ children }) => (
        <AppProviders
          todoRepository={new GuestTodoRepository({ db: reopened })}
          guestDatabase={reopened}
        >
          {children}
        </AppProviders>
      ),
    })
    await waitFor(() => expect(result.current.data).toMatchObject([{ title: 'Previously saved' }]))
  } finally {
    reopened.close()
  }
})

it('saves an offline subtask with its parent and updates the nested list', async () => {
  const { repo, wrapper } = setup()
  const parent = await repo.create({ title: 'Parent', due_date: DATE })
  const { result } = renderHook(() => ({ create: useCreateTodo(), list: useTodayTodos(DATE) }), {
    wrapper,
  })
  act(() => result.current.create.mutate({ title: 'Child', parent_id: parent.id }))

  await waitFor(() => expect(result.current.create.isSuccess).toBe(true))
  expect(result.current.list.data).toMatchObject([
    { id: parent.id, subtasks: [{ title: 'Child', parent_id: parent.id }] },
  ])
  expect(await repo.listAll()).toEqual(
    expect.arrayContaining([expect.objectContaining({ title: 'Child', parent_id: parent.id })]),
  )
})

it('commits an edit and a completion to Dexie offline', async () => {
  const { repo, wrapper } = setup()
  const todo = await repo.create({ title: 'Original', due_date: DATE })
  const { result } = renderHook(() => ({ edit: useUpdateTodo(), complete: useSetTodoDone(DATE) }), {
    wrapper,
  })

  act(() => result.current.edit.mutate({ id: todo.id, patch: { title: 'Edited offline' } }))
  await waitFor(() => expect(result.current.edit.isSuccess).toBe(true))
  act(() => result.current.complete.mutate({ id: todo.id, done: true }))
  await waitFor(() => expect(result.current.complete.isSuccess).toBe(true))
  expect(await repo.listAll()).toMatchObject([
    { id: todo.id, title: 'Edited offline', done_at: expect.any(String) },
  ])
})

it('keeps the sheet pending until the offline IndexedDB transaction can commit', async () => {
  const { db, repo, wrapper } = setup()
  const user = userEvent.setup()
  const onClose = vi.fn()
  // A concurrent read/write transaction holds the same store until released.
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const lock = db.transaction('rw', db.todos, async () => {
    await db.todos.count()
    await GuestDatabase.waitFor(gate)
  })
  render(<AddTodoSheet open onClose={onClose} today={DATE} target={createTarget} />, { wrapper })
  try {
    await user.type(screen.getByLabelText('Title'), 'Wait for commit')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(await screen.findByRole('button', { name: 'Adding…' })).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
  } finally {
    release()
    await lock
  }

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  expect(await repo.listAll()).toMatchObject([{ title: 'Wait for commit' }])
  expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
})

it('shows a failed offline Dexie write and keeps the draft editable', async () => {
  const { db, repo, wrapper } = setup()
  const user = userEvent.setup()
  const onClose = vi.fn()
  db.todos.hook('creating', () => {
    throw new Error('IndexedDB write failed')
  })
  render(<AddTodoSheet open onClose={onClose} today={DATE} target={createTarget} />, { wrapper })

  await user.type(screen.getByLabelText('Title'), 'Unsaved draft')
  await user.click(screen.getByRole('button', { name: 'Add' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Could not save. Please try again.')
  expect(screen.getByLabelText('Title')).toHaveValue('Unsaved draft')
  expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled()
  expect(onClose).not.toHaveBeenCalled()
  expect(await repo.listAll()).toEqual([])
})

it('keeps account creation and list reads paused until reconnect and reports API failures', async () => {
  const account = makeTokenResponse()
  useSession.getState().signIn(account)
  const { repo, wrapper } = setup()
  const requests: (string | null)[] = []
  server.use(
    http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
    http.post(`${API}/todos`, ({ request }) => {
      requests.push(request.headers.get('Authorization'))
      return HttpResponse.json({ message: 'Service unavailable' }, { status: 503 })
    }),
  )
  const { result } = renderHook(() => ({ create: useCreateTodo(), list: useTodayTodos(DATE) }), {
    wrapper,
  })
  act(() => result.current.create.mutate({ title: 'Account draft' }))
  await waitFor(() => expect(result.current.create.isPaused).toBe(true))
  expect(result.current.list.isPaused).toBe(true)
  expect(requests).toEqual([])
  expect(await repo.listAll()).toEqual([])

  goOnline()
  await waitFor(() => expect(result.current.create.error).toMatchObject({ status: 503 }))
  await waitFor(() => expect(result.current.list.data).toEqual([]))
  expect(requests).toEqual([`Bearer ${account.token}`])
})

it.each(['guest', 'another account', 'same credentials after signing out'])(
  'does not replay a paused account create after switching to %s',
  async (destination) => {
    const account = makeTokenResponse()
    useSession.getState().signIn(account)
    const { repo, queryClient, wrapper } = setup()
    const requests: (string | null)[] = []
    server.use(
      http.post(`${API}/todos`, ({ request }) => {
        requests.push(request.headers.get('Authorization'))
        return HttpResponse.json({ message: 'Unexpected request' }, { status: 403 })
      }),
    )
    const { result } = renderHook(useCreateTodo, { wrapper })
    act(() => result.current.mutate({ title: 'Private account draft' }))
    await waitFor(() => expect(result.current.isPaused).toBe(true))

    act(() => {
      useSession.getState().signOut()
      if (destination === 'another account') {
        useSession.getState().signIn(accountB)
      }
      if (destination === 'same credentials after signing out')
        useSession.getState().signIn(account)
    })
    goOnline()

    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    expect(requests).toEqual([])
    expect(await repo.listAll()).toEqual([])
  },
)

it('does not show the previous account’s Today cache after an offline account switch', async () => {
  const account = makeTokenResponse()
  useSession.getState().signIn(account)
  goOnline()
  const { repo, wrapper } = setup()
  const row = await repo.create({ title: 'Private account task', due_date: DATE })
  server.use(
    http.get(`${API}/todos`, ({ request }) =>
      HttpResponse.json({
        data: request.headers.get('Authorization') === `Bearer ${account.token}` ? [row] : [],
      }),
    ),
  )
  const { result } = renderHook(() => useTodayTodos(DATE), { wrapper })
  await waitFor(() => expect(result.current.data).toMatchObject([{ id: row.id }]))

  act(() => {
    onlineManager.setOnline(false)
    useSession.getState().signIn(accountB)
  })
  expect(result.current.data).toBeUndefined()
  expect(result.current.isPaused).toBe(true)
  goOnline()
  await waitFor(() => expect(result.current.data).toEqual([]))
})

it('commits an offline guest delete and undo through IndexedDB', async () => {
  const { repo, wrapper } = setup()
  await repo.create({ title: 'Restore offline', due_date: DATE })
  const { result } = renderHook(
    () => ({ list: useTodayTodos(DATE), deletion: useUndoableDelete({ date: DATE }) }),
    { wrapper },
  )
  await waitFor(() => expect(result.current.list.data).toHaveLength(1))
  const todo = result.current.list.data?.[0]
  if (!todo) throw new Error('Expected a saved to-do')
  await act(() => result.current.deletion.deleteTodo(todo))
  expect(await repo.listAll()).toEqual([])

  await act(() => result.current.deletion.undo())
  expect(result.current.list.data).toMatchObject([{ title: 'Restore offline' }])
  expect(await repo.listAll()).toMatchObject([{ id: todo.id }])
})

it('does not carry an old guest undo action into an account', async () => {
  goOnline()
  const { repo, wrapper } = setup()
  await repo.create({ title: 'Deleted guest task', due_date: DATE })
  const [todo] = await repo.listForDate(DATE)
  if (!todo) throw new Error('Expected a saved to-do')
  const restores: string[] = []
  server.use(
    http.post(`${API}/todos/:id/restore`, ({ params }) => {
      restores.push(String(params.id))
      return HttpResponse.json({ data: todo })
    }),
  )
  const { result } = renderHook(() => useUndoableDelete({ date: DATE }), { wrapper })
  await act(() => result.current.deleteTodo(todo))
  act(() => useSession.getState().signIn(accountB))

  await act(() => result.current.undo())
  expect(restores).toEqual([])
  expect(result.current.pending).toBeNull()
  expect(await repo.listAll()).toEqual([])
})

it('lets the current account undo while the previous account’s restore is still in flight', async () => {
  goOnline()
  useSession.getState().signIn(makeTokenResponse())
  const { repo, wrapper } = setup()
  await repo.create({ title: 'First task', due_date: DATE })
  await repo.create({ title: 'Second task', due_date: DATE })
  const [first, second] = await repo.listForDate(DATE)
  if (!first || !second) throw new Error('Expected two saved to-dos')

  let release!: () => void
  let requestArrived!: () => void
  const response = new Promise<void>((resolve) => {
    release = resolve
  })
  const requested = new Promise<void>((resolve) => {
    requestArrived = resolve
  })
  const restores: (string | null)[] = []
  server.use(
    http.delete(`${API}/todos/:id`, () => new HttpResponse(null, { status: 204 })),
    http.post(`${API}/todos/${first.id}/restore`, async () => {
      requestArrived()
      await response
      return HttpResponse.json({ data: first })
    }),
    http.post(`${API}/todos/${second.id}/restore`, ({ request }) => {
      restores.push(request.headers.get('Authorization'))
      return HttpResponse.json({ data: second })
    }),
  )
  const { result } = renderHook(() => useUndoableDelete({ date: DATE }), { wrapper })
  await act(() => result.current.deleteTodo(first))
  let oldUndo: Promise<void> | undefined
  act(() => {
    oldUndo = result.current.undo()
  })
  try {
    await requested
    act(() => useSession.getState().signIn(accountB))
    await act(() => result.current.deleteTodo(second))
    await act(() => result.current.undo())
    expect(restores).toEqual([`Bearer ${accountB.token}`])
  } finally {
    release()
    await act(async () => {
      await oldUndo
    })
  }
})

it('removes the previous session’s form before its exit animation can run', async () => {
  const { db, repo } = createTestRepository()
  const user = userEvent.setup()
  renderRoute('/today', repo, undefined, db)
  await user.click(await screen.findByRole('button', { name: 'Add a to-do' }))
  await user.type(await screen.findByLabelText('Title'), 'Guest-only draft')

  act(() => useSession.getState().signIn(accountB))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(await repo.listAll()).toEqual([])
})
