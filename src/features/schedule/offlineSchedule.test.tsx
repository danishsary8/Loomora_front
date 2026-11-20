import { onlineManager } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/queryClient'
import { scheduleApi, useSession } from '@/lib/api'
import { GuestScheduleRepository } from '@/lib/storage'
import { GuestDatabase } from '@/lib/storage/db'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { ScheduleItemSheet } from './ScheduleItemSheet'
import type { CreateScheduleItemInput } from './types'
import {
  useCreateScheduleItem,
  useScheduleDay,
  useScheduleItems,
  useSetScheduleCheckin,
  useSetScheduleException,
  useUpdateScheduleItem,
} from './useSchedule'
import { useUndoableDelete } from './useUndoableDelete'
import { useCopyDay } from './week/useWeek'

const MONDAY = '2026-10-26'
const NEXT_MONDAY = '2026-11-02'
const input: CreateScheduleItemInput = {
  title: 'Study',
  start_time: '09:00',
  end_time: '10:00',
  days: [0],
  starts_on: MONDAY,
}
const accountA = makeTokenResponse()
const accountB = { ...makeTokenResponse(makeUser({ id: 'account-b' })), token: '2|test-token' }

function setup(db = new GuestDatabase(`test-${crypto.randomUUID()}`)) {
  const repo = new GuestScheduleRepository({ db })
  const queryClient = createQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <AppProviders scheduleRepository={repo} guestDatabase={db} queryClient={queryClient}>
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

it('reads both Week and Today from a fresh IndexedDB connection offline', async () => {
  const { db, repo } = setup()
  const item = await repo.create(input)
  db.close()
  const reopened = new GuestDatabase(db.name)
  const { wrapper } = setup(reopened)
  try {
    const { result } = renderHook(
      () => ({ items: useScheduleItems(), day: useScheduleDay(MONDAY) }),
      { wrapper },
    )
    await waitFor(() => {
      expect(result.current.items.data).toEqual([item])
      expect(result.current.day.data).toMatchObject([{ schedule_item_id: item.id, title: 'Study' }])
    })
  } finally {
    reopened.close()
  }
})

it('creates a repeating item offline and keeps the same row and ID on reload and reconnect', async () => {
  const { db, repo, wrapper } = setup()
  const { result, unmount } = renderHook(
    () => ({ create: useCreateScheduleItem(), items: useScheduleItems() }),
    { wrapper },
  )
  act(() => result.current.create.mutate(input))
  await waitFor(() => expect(result.current.create.isSuccess).toBe(true))
  const saved = await repo.listItems()
  expect(saved).toMatchObject([{ id: expect.any(String), title: 'Study', days: [0] }])
  expect(result.current.items.data).toEqual(saved)

  unmount()
  db.close()
  const reopened = setup(new GuestDatabase(db.name))
  try {
    const reloaded = renderHook(useScheduleItems, { wrapper: reopened.wrapper })
    await waitFor(() => expect(reloaded.result.current.data).toEqual(saved))
    goOnline()
    expect(await reopened.repo.listItems()).toEqual(saved)
    expect(reloaded.result.current.data).toEqual(saved)
  } finally {
    reopened.db.close()
  }
})

it('persists an offline repeat edit, occurrence override, and check-in toggle', async () => {
  const { repo, wrapper } = setup()
  const { id } = await repo.create(input)
  const { result } = renderHook(
    () => ({
      update: useUpdateScheduleItem(),
      exception: useSetScheduleException(),
      checkin: useSetScheduleCheckin(),
      day: useScheduleDay(MONDAY),
    }),
    { wrapper },
  )
  act(() => result.current.update.mutate({ id, patch: { title: 'Class' } }))
  await waitFor(() => expect(result.current.update.isSuccess).toBe(true))
  expect(await repo.listItems()).toMatchObject([{ id, title: 'Class' }])

  act(() =>
    result.current.exception.mutate({
      id,
      date: MONDAY,
      input: { type: 'override', title: 'Exam' },
    }),
  )
  await waitFor(() => expect(result.current.exception.isSuccess).toBe(true))
  expect(await repo.listExceptions()).toMatchObject([{ schedule_item_id: id, title: 'Exam' }])
  expect(await repo.listForDate(NEXT_MONDAY)).toMatchObject([{ title: 'Class' }])

  act(() => result.current.checkin.mutate({ id, date: MONDAY, done: true }))
  await waitFor(() =>
    expect(result.current.day.data).toMatchObject([{ title: 'Exam', done: true }]),
  )
  expect(await repo.listCheckins()).toMatchObject([{ schedule_item_id: id, date: MONDAY }])

  act(() => result.current.checkin.mutate({ id, date: MONDAY, done: false }))
  await waitFor(() =>
    expect(result.current.day.data).toMatchObject([{ title: 'Exam', done: false }]),
  )
  expect(await repo.listCheckins()).toEqual([])
})

it('copies a day offline by updating the original recurrence', async () => {
  const { repo, wrapper } = setup()
  const item = await repo.create(input)
  const { result } = renderHook(() => useCopyDay([item]), { wrapper })
  act(() => result.current.mutate({ from: 0, to: [2] }))
  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(await repo.listItems()).toMatchObject([{ id: item.id, days: [0, 2] }])
})

it('refreshes the saved days after a partial offline Copy Day failure', async () => {
  const { db, repo, wrapper } = setup()
  const first = await repo.create(input)
  const second = await repo.create({ ...input, title: 'Practice' })
  db.schedule_items.hook('updating', (_changes, id) => {
    if (id === second.id) throw new Error('IndexedDB write failed')
  })
  const { result } = renderHook(
    () => {
      const list = useScheduleItems()
      return { list, copy: useCopyDay(list.data ?? []) }
    },
    { wrapper },
  )
  await waitFor(() => expect(result.current.list.data).toHaveLength(2))
  act(() => result.current.copy.mutate({ from: 0, to: [2] }))
  await waitFor(() => expect(result.current.copy.isError).toBe(true))
  await waitFor(() => {
    expect(result.current.list.data).toEqual(
      expect.arrayContaining([{ ...first, days: [0, 2], updated_at: expect.any(String) }, second]),
    )
  })
})

it('keeps the schedule draft editable when IndexedDB rejects an offline write', async () => {
  const { db, repo, wrapper } = setup()
  db.schedule_items.hook('creating', () => {
    throw new Error('IndexedDB write failed')
  })
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(<ScheduleItemSheet open target={{ type: 'create' }} onClose={onClose} />, { wrapper })
  const sheet = screen.getByRole('dialog', { name: 'Add to my schedule' })
  const title = within(sheet).getByLabelText('Title')
  const monday = within(sheet).getByRole('button', { name: 'Monday' })
  await user.type(title, 'Keep this draft')
  await user.click(monday)
  await user.click(within(sheet).getByRole('button', { name: 'Add' }))
  expect(await within(sheet).findByRole('alert')).toHaveTextContent(
    'Could not save. Please try again.',
  )
  expect(title).toHaveValue('Keep this draft')
  expect(monday).toHaveAttribute('aria-pressed', 'true')
  expect(within(sheet).getByRole('button', { name: 'Add' })).toBeEnabled()
  expect(onClose).not.toHaveBeenCalled()
  expect(await repo.listItems()).toEqual([])
})

it('keeps account writes paused until reconnect in the original session', async () => {
  useSession.getState().signIn(accountA)
  const { repo, wrapper } = setup()
  const item = await repo.create(input)
  await repo.delete(item.id)
  const tokens: (string | null)[] = []
  server.use(
    http.post(`${API}/schedule/items`, ({ request }) => {
      tokens.push(request.headers.get('Authorization'))
      return HttpResponse.json({ data: item }, { status: 201 })
    }),
  )
  const { result } = renderHook(useCreateScheduleItem, { wrapper })
  act(() => result.current.mutate(input))
  await waitFor(() => expect(result.current.isPaused).toBe(true))
  expect(tokens).toEqual([])

  goOnline()
  await waitFor(() => expect(result.current.data).toEqual(item))
  expect(tokens).toEqual([`Bearer ${accountA.token}`])
  expect(await repo.listItems()).toEqual([])
})

it.each([
  ['guest', null],
  ['another account', accountB],
] as const)(
  'does not replay a paused account create after switching to %s',
  async (_label, next) => {
    useSession.getState().signIn(accountA)
    const { repo, queryClient, wrapper } = setup()
    const post = vi.fn(() => new HttpResponse(null, { status: 403 }))
    server.use(http.post(`${API}/schedule/items`, post))
    const { result } = renderHook(useCreateScheduleItem, { wrapper })
    act(() => result.current.mutate(input))
    await waitFor(() => expect(result.current.isPaused).toBe(true))
    act(() => (next ? useSession.getState().signIn(next) : useSession.getState().signOut()))
    goOnline()
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    expect(post).not.toHaveBeenCalled()
    expect(await repo.listItems()).toEqual([])
  },
)

it('hides a cached account Week and Today immediately on an offline account switch', async () => {
  useSession.getState().signIn(accountA)
  goOnline()
  const { repo, wrapper } = setup()
  const item = await repo.create(input)
  const [occurrence] = await repo.listForDate(MONDAY)
  server.use(
    http.get(`${API}/schedule/items`, () => HttpResponse.json({ data: [item] })),
    http.get(`${API}/schedule/day`, () =>
      HttpResponse.json({ data: [{ ...occurrence, item_id: item.id }] }),
    ),
  )
  const { result } = renderHook(
    () => ({ items: useScheduleItems(), day: useScheduleDay(MONDAY) }),
    { wrapper },
  )
  await waitFor(() => {
    expect(result.current.day.data).toMatchObject([{ title: 'Study' }])
    expect(result.current.items.data).toMatchObject([{ id: item.id }])
  })
  act(() => {
    onlineManager.setOnline(false)
    useSession.getState().signIn(accountB)
  })
  expect(result.current.items.data).toBeUndefined()
  expect(result.current.day.data).toBeUndefined()
})

it.each(['account', 'guest'] as const)(
  'keeps an in-flight guest write on the device when the active session becomes %s',
  async (destination) => {
    goOnline()
    const { repo, queryClient, wrapper } = setup()
    const create = repo.create.bind(repo)
    let release!: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const started = vi.spyOn(repo, 'create').mockImplementationOnce(async (draft) => {
      await gate
      return create(draft)
    })
    const accountRead = vi.fn(() => HttpResponse.json({ data: [] }))
    server.use(http.get(`${API}/schedule/items`, accountRead))
    const { result } = renderHook(
      () => ({ create: useCreateScheduleItem(), items: useScheduleItems() }),
      { wrapper },
    )
    act(() => result.current.create.mutate(input))
    try {
      await waitFor(() => expect(started).toHaveBeenCalledOnce())
      act(() => useSession.getState().signIn(accountB))
      await waitFor(() => expect(result.current.items.data).toEqual([]))
      if (destination === 'guest') {
        act(() => useSession.getState().signOut())
        await waitFor(() => expect(result.current.items.data).toEqual([]))
      }
      accountRead.mockClear()
    } finally {
      release()
    }
    await waitFor(() => expect(queryClient.isMutating()).toBe(0))
    expect(accountRead).not.toHaveBeenCalled()
    const saved = await repo.listItems()
    expect(saved).toMatchObject([{ title: 'Study' }])
    expect(result.current.items.data).toEqual(destination === 'guest' ? saved : [])
  },
)

it('discards the old account’s delayed delete even when the screen unmounts during a switch', async () => {
  goOnline()
  useSession.getState().signIn(accountA)
  const { repo, wrapper } = setup()
  const item = await repo.create(input)
  server.use(
    http.delete(`${API}/schedule/items/${item.id}`, () => new HttpResponse(null, { status: 204 })),
  )
  const remove = vi.spyOn(scheduleApi, 'remove')
  const { result, unmount } = renderHook(() => useUndoableDelete(60_000), { wrapper })
  await act(() => result.current.request({ scope: 'all', item }))
  expect(result.current.pending).toMatchObject({ item })
  act(() => useSession.getState().signIn(accountB))
  unmount()
  try {
    expect(remove).not.toHaveBeenCalled()
  } finally {
    remove.mockRestore()
  }
})

it('cancels a pending guest delete on switch and scopes Undo to the original request', async () => {
  const { repo, wrapper } = setup()
  const item = await repo.create(input)
  const next = await repo.create({ ...input, title: 'Practice' })
  const { result } = renderHook(() => useUndoableDelete(60_000), { wrapper })
  act(() => result.current.request({ scope: 'all', item }))
  const retiredUndo = result.current.undo

  act(() => useSession.getState().signIn(accountB))
  expect(result.current.pending).toBeNull()
  act(() => useSession.getState().signOut())
  expect(await repo.listItems()).toEqual(expect.arrayContaining([item, next]))

  act(() => result.current.request({ scope: 'all', item: next }))
  act(retiredUndo)
  expect(result.current.pending).toMatchObject({ item: next })
  act(() => result.current.undo())
  expect(result.current.pending).toBeNull()
  expect(await repo.listItems()).toHaveLength(2)
})

it('keeps an offline skip undoable and commits it when leaving within the same session', async () => {
  const { repo, wrapper } = setup()
  const item = await repo.create(input)
  const { result, unmount } = renderHook(() => useUndoableDelete(60_000), { wrapper })
  const skip = { scope: 'today', item, date: MONDAY } as const
  await act(() => result.current.request(skip))
  expect(result.current.pending).toEqual(skip)
  act(() => result.current.undo())
  expect(result.current.pending).toBeNull()
  expect(await repo.listExceptions()).toEqual([])
  await act(() => result.current.request(skip))
  unmount()
  await waitFor(async () => expect(await repo.listForDate(MONDAY)).toEqual([]))
  expect(await repo.listForDate(NEXT_MONDAY)).toMatchObject([{ schedule_item_id: item.id }])
})
