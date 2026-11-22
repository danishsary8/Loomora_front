import { onlineManager } from '@tanstack/react-query'
import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/queryClient'
import { useSetScheduleCheckin } from '@/features/schedule/useSchedule'
import { DailyIntention } from '@/features/today/DailyIntention'
import { useSetTodoDone } from '@/features/todos/useTodos'
import { useSession } from '@/lib/api'
import { toLocalDate } from '@/lib/date'
import { GuestScheduleRepository, GuestTodoRepository } from '@/lib/storage'
import { GuestDailyIntentionRepository } from '@/lib/storage/GuestDailyIntentionRepository'
import { GuestDatabase } from '@/lib/storage/db'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { renderRoute } from '@/test/renderRoute'
import { SavePlanPrompt } from './SavePlanPrompt'
import { useGuestPlan } from './useGuestPlan'
import { useSavePlan } from './useSavePlan'

const today = toLocalDate()
const accountAUser = makeUser({ id: 'user-a', email: 'a@example.com', survey_done: true })
const accountA = { ...makeTokenResponse(accountAUser), token: '1|token-a' }

function setup(db = new GuestDatabase(`test-${crypto.randomUUID()}`)) {
  const todos = new GuestTodoRepository({ db })
  const schedule = new GuestScheduleRepository({ db })
  const intentions = new GuestDailyIntentionRepository(db)
  const queryClient = createQueryClient()
  function wrapper({ children }: { children: ReactNode }) {
    return (
      <MemoryRouter>
        <AppProviders
          todoRepository={todos}
          scheduleRepository={schedule}
          guestDatabase={db}
          queryClient={queryClient}
        >
          {children}
        </AppProviders>
      </MemoryRouter>
    )
  }
  return { db, todos, schedule, intentions, queryClient, wrapper }
}

function goOnline() {
  act(() => onlineManager.setOnline(true))
}

beforeEach(() => onlineManager.setOnline(false))
afterEach(goOnline)

it('loads guest plan summary offline on a cold cache and persists unchanged on reconnect', async () => {
  const { db, todos, schedule, intentions } = setup()
  for (let i = 0; i < 3; i += 1) {
    const todo = await todos.create({ title: `Done ${i}`, due_date: today })
    await todos.setDone(todo.id, true)
  }
  await schedule.create({
    title: 'Morning focus',
    start_time: '09:00',
    end_time: '10:00',
    days: [0],
    starts_on: today,
  })
  await intentions.save(today, 'Finish core tasks')
  const savedTodos = await todos.listAll()
  db.close()

  const reopened = setup(new GuestDatabase(db.name))
  try {
    const { result } = renderHook(() => useGuestPlan(), { wrapper: reopened.wrapper })
    await waitFor(() => {
      expect(result.current.isPaused).toBe(false)
      expect(result.current.data?.todos).toEqual(savedTodos)
      expect(result.current.data?.items).toHaveLength(1)
      expect(result.current.data?.intentions).toMatchObject([
        { date: today, text: 'Finish core tasks' },
      ])
    })

    const promptView = renderRoute('/today', reopened.todos, reopened.schedule, reopened.db)
    try {
      expect(
        await screen.findByRole('dialog', { name: 'Save your plan' }, { timeout: 4000 }),
      ).toBeInTheDocument()
      goOnline()
      await act(async () => {})
      expect(await reopened.todos.listAll()).toEqual(savedTodos)
    } finally {
      promptView.unmount()
    }
  } finally {
    reopened.db.close()
  }
})

it('refreshes guest plan summary offline via existing invalidations for check-offs, check-ins, and daily intention', async () => {
  const { db, todos, schedule, wrapper } = setup()
  try {
    const t1 = await todos.create({ title: 'One', due_date: today })
    const t2 = await todos.create({ title: 'Two', due_date: today })
    const t3 = await todos.create({ title: 'Three', due_date: today })
    await todos.setDone(t1.id, true)
    await todos.setDone(t2.id, true)
    const item = await schedule.create({
      title: 'Block',
      start_time: '10:00',
      end_time: '11:00',
      days: [0, 1, 2, 3, 4, 5, 6],
      starts_on: today,
    })

    const { result, unmount } = renderHook(
      () => ({
        plan: useGuestPlan(),
        setDone: useSetTodoDone(today),
        setCheckin: useSetScheduleCheckin(),
      }),
      { wrapper },
    )

    await waitFor(() => expect(result.current.plan.data?.todos).toHaveLength(3))

    act(() => result.current.setDone.mutate({ id: t3.id, done: true }))
    await waitFor(() =>
      expect(result.current.plan.data?.todos.filter((row) => row.done_at !== null)).toHaveLength(3),
    )

    act(() => result.current.setCheckin.mutate({ id: item.id, date: today, done: true }))
    await waitFor(() => expect(result.current.plan.data?.checkins).toHaveLength(1))

    const user = userEvent.setup()
    const rendered = render(
      <>
        <DailyIntention date={today} />
        <SavePlanPrompt today={today} />
      </>,
      { wrapper },
    )
    try {
      expect(await screen.findByRole('dialog', { name: 'Save your plan' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Not now' }))
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Save your plan' })).not.toBeInTheDocument(),
      )

      const input = screen.getByLabelText('Daily intention')
      await user.type(input, 'Ship QA-012')
      await user.tab()
      await waitFor(() => {
        expect(result.current.plan.data?.intentions).toMatchObject([
          { date: today, text: 'Ship QA-012' },
        ])
      })
    } finally {
      rendered.unmount()
      unmount()
    }
  } finally {
    db.close()
  }
})

it('opens SavePlanPrompt offline as soon as the 3rd check-off invalidates guest-plan', async () => {
  const { db, todos, wrapper } = setup()
  try {
    const t1 = await todos.create({ title: 'One', due_date: today })
    const t2 = await todos.create({ title: 'Two', due_date: today })
    const t3 = await todos.create({ title: 'Three', due_date: today })
    await todos.setDone(t1.id, true)
    await todos.setDone(t2.id, true)

    const { result, unmount } = renderHook(() => useSetTodoDone(today), { wrapper })
    const view = render(<SavePlanPrompt today={today} />, { wrapper })
    try {
      await waitFor(() =>
        expect(screen.queryByRole('dialog', { name: 'Save your plan' })).not.toBeInTheDocument(),
      )

      act(() => result.current.mutate({ id: t3.id, done: true }))
      expect(await screen.findByRole('dialog', { name: 'Save your plan' })).toBeInTheDocument()
    } finally {
      view.unmount()
      unmount()
    }
  } finally {
    db.close()
  }
})

it('shows guest streak offline on Profile and detects a local plan left on device while signed in offline', async () => {
  const { db, todos, schedule } = setup()
  try {
    const todo = await todos.create({ title: 'Local task', due_date: today })
    await todos.setDone(todo.id, true)

    const guestProfile = renderRoute('/profile', todos, schedule, db)
    try {
      expect(await screen.findByText('1 day')).toBeInTheDocument()
      expect(screen.getByText('Today counted.')).toBeInTheDocument()
      expect(screen.getByText('Data lives on this device only.')).toBeInTheDocument()
    } finally {
      guestProfile.unmount()
    }

    // Signed-in offline Profile keeps account streak paused (API-dependent) while still
    // reading the local guest plan left on this device.
    useSession.getState().signIn(accountA)
    const accountProfile = renderRoute('/profile', todos, schedule, db)
    try {
      expect(
        await screen.findByText(
          'Your plan is still on this device. Save it to your account so you do not lose it.',
        ),
      ).toBeInTheDocument()
      expect(screen.queryByText('1 day')).not.toBeInTheDocument()
    } finally {
      accountProfile.unmount()
    }
  } finally {
    db.close()
  }
})

it('isolates useGuestPlan across session transitions and clears after online import', async () => {
  const { db, todos, wrapper } = setup()
  try {
    const todo = await todos.create({ title: 'Device todo', due_date: today })
    await todos.setDone(todo.id, true)

    let releaseRead!: () => void
    const gate = new Promise<void>((resolve) => {
      releaseRead = resolve
    })
    let readStarted!: () => void
    const waitForRead = new Promise<void>((resolve) => {
      readStarted = resolve
    })
    const realListAll = todos.listAll.bind(todos)
    const listAllSpy = vi.spyOn(todos, 'listAll').mockImplementationOnce(async (options) => {
      readStarted()
      await gate
      return realListAll(options)
    })

    server.use(
      http.post(`${API}/import`, () =>
        HttpResponse.json({
          data: {
            todos: { created: 1, skipped: 0 },
            schedule_items: { created: 0, skipped: 0 },
            exceptions: { created: 0, skipped: 0 },
            checkins: { created: 0, skipped: 0 },
          },
        }),
      ),
    )

    const { result } = renderHook(() => ({ plan: useGuestPlan(), savePlan: useSavePlan() }), {
      wrapper,
    })
    await waitForRead
    expect(listAllSpy).toHaveBeenCalledTimes(1)

    // Sign in and import while the old guest generation's read is still pending.
    act(() => {
      onlineManager.setOnline(true)
      useSession.getState().signIn(accountA)
    })

    await act(async () => {
      await result.current.savePlan.mutateAsync()
    })

    await waitFor(() => expect(result.current.plan.data?.todos).toEqual([]))

    // Releasing the retired generation's read must not overwrite the current generation's empty plan.
    releaseRead()
    await act(async () => {
      await gate
    })
    expect(result.current.plan.data?.todos).toEqual([])
    expect(await todos.listAll()).toEqual([])
  } finally {
    db.close()
  }
})
