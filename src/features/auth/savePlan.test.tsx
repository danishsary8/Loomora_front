import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from '@/lib/api'
import { GuestScheduleRepository } from '@/lib/storage'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { createTestRepository, renderRoute } from '@/test/renderRoute'
import { toLocalDate } from '@/lib/date'
import { useSavePlanIntent } from './savePlanIntent'

const today = toLocalDate()
const COUNTS = { created: 1, skipped: 0 }
const IMPORT_RESULT = {
  todos: COUNTS,
  schedule_items: COUNTS,
  exceptions: COUNTS,
  checkins: COUNTS,
}

function setup() {
  const { db, repo } = createTestRepository()
  return { db, repo, schedule: new GuestScheduleRepository({ db }) }
}

async function checkOff(repo: ReturnType<typeof setup>['repo'], count: number) {
  for (let n = 0; n < count; n += 1) {
    const todo = await repo.create({ title: `Task ${n}`, due_date: today })
    await repo.setDone(todo.id, true)
  }
}

/** Handlers for the signed-in Today screen. */
function accountToday(todos: unknown[] = []) {
  return [
    http.get(`${API}/todos`, () => HttpResponse.json({ data: todos })),
    http.get(`${API}/schedule/day`, () => HttpResponse.json({ date: today, data: [] })),
    http.get(`${API}/streak`, () =>
      HttpResponse.json({ data: { current_streak: 0, longest_streak: 0, today_counted: false } }),
    ),
  ]
}

describe('Save your plan prompt (S11)', () => {
  it('appears after 3 check-offs and "Not now" keeps it away for a few days', async () => {
    const { repo, schedule } = setup()
    await checkOff(repo, 3)
    const view = renderRoute('/today', repo, schedule)

    const sheet = await screen.findByRole('dialog', { name: 'Save your plan' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Not now' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    view.unmount()
    renderRoute('/today', repo, schedule)
    await screen.findByRole('heading', { level: 1, name: 'Today' })
    await screen.findByText('Task 0')
    expect(screen.queryByRole('dialog', { name: 'Save your plan' })).not.toBeInTheDocument()
  })

  it('stays away with fewer than 3 check-offs', async () => {
    const { repo, schedule } = setup()
    await checkOff(repo, 2)
    await repo.create({ title: 'Still open', due_date: today })
    renderRoute('/today', repo, schedule)
    await screen.findByText('Still open')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('appears after a day that was fully done, but not on the day itself', async () => {
    const { repo, schedule } = setup()
    const one = await repo.create({ title: 'Only one', due_date: today })
    await repo.setDone(one.id, true)
    const view = renderRoute('/today', repo, schedule)
    await screen.findByRole('heading', { level: 1, name: 'Today' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    view.unmount()

    const past = setup()
    const yesterday = await past.repo.create({ title: 'Yesterday', due_date: '2020-01-01' })
    await past.repo.setDone(yesterday.id, true)
    renderRoute('/today', past.repo, past.schedule)
    expect(await screen.findByRole('dialog', { name: 'Save your plan' })).toBeInTheDocument()
  })

  it('goes on to Sign up and remembers that the plan should move', async () => {
    const { repo, schedule } = setup()
    await checkOff(repo, 3)
    renderRoute('/today', repo, schedule)
    const sheet = await screen.findByRole('dialog', { name: 'Save your plan' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Create an account' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create an account' }),
    ).toBeInTheDocument()
    expect(useSavePlanIntent.getState().pending).toBe(true)
  })

  it('is not shown to signed-in users', async () => {
    server.use(...accountToday())
    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: true })))
    const { repo, schedule } = setup()
    await checkOff(repo, 3)
    renderRoute('/today', repo, schedule)
    await screen.findByRole('heading', { level: 1, name: 'Today' })
    expect(screen.queryByRole('dialog', { name: 'Save your plan' })).not.toBeInTheDocument()
  })
})

describe('Storage follows the sign-in state', () => {
  it('shows the device to-dos for a guest and the server to-dos once signed in', async () => {
    const { repo, schedule } = setup()
    await repo.create({ title: 'On this device', due_date: today })
    server.use(
      ...accountToday([
        {
          id: '4e2a1b3c-5d6e-4f70-8a9b-0c1d2e3f4a5b',
          title: 'From the server',
          category: 'other',
          due_date: today,
          done_at: null,
          overdue: false,
          old: false,
          created_at: '2026-10-26T01:00:00Z',
        },
      ]),
    )

    renderRoute('/today', repo, schedule)
    expect(await screen.findByText('On this device')).toBeInTheDocument()

    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: true })))

    expect(await screen.findByText('From the server')).toBeInTheDocument()
    expect(screen.queryByText('On this device')).not.toBeInTheDocument()

    useSession.getState().signOut()
    expect(await screen.findByText('On this device')).toBeInTheDocument()
  })
})

describe('Moving the plan into the account (docs/04 Flow 3)', () => {
  async function signedInWithPlan() {
    const { repo, schedule } = setup()
    await repo.create({ title: 'Read', due_date: today })
    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: true })))
    useSavePlanIntent.getState().request()
    return { repo, schedule }
  }

  it('imports once signed in, says so, and clears the device', async () => {
    const { repo, schedule } = await signedInWithPlan()
    let imports = 0
    server.use(
      ...accountToday(),
      http.post(`${API}/import`, () => {
        imports += 1
        return HttpResponse.json({ data: IMPORT_RESULT })
      }),
    )

    renderRoute('/today', repo, schedule)

    expect(await screen.findByText('Your plan is saved')).toBeInTheDocument()
    expect(imports).toBe(1)
    expect(await repo.listAll()).toEqual([])
    expect(useSavePlanIntent.getState().pending).toBe(false)
  })

  it('keeps the plan on failure, offers a retry, and the retry succeeds', async () => {
    const { repo, schedule } = await signedInWithPlan()
    let calls = 0
    server.use(
      ...accountToday(),
      http.post(`${API}/import`, () => {
        calls += 1
        return calls === 1
          ? HttpResponse.json({ message: 'Boom' }, { status: 500 })
          : HttpResponse.json({ data: IMPORT_RESULT })
      }),
    )

    renderRoute('/today', repo, schedule)

    const sheet = await screen.findByRole('dialog', { name: 'We could not save your plan' })
    expect(await repo.listAll()).toHaveLength(1)
    await userEvent.click(within(sheet).getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Your plan is saved')).toBeInTheDocument()
    expect(calls).toBe(2)
    expect(await repo.listAll()).toEqual([])
  })

  it('"Not now" after a failure leaves the plan on the device and stops asking', async () => {
    const { repo, schedule } = await signedInWithPlan()
    server.use(
      ...accountToday(),
      http.post(`${API}/import`, () => HttpResponse.json({ message: 'Boom' }, { status: 500 })),
    )
    renderRoute('/today', repo, schedule)

    const sheet = await screen.findByRole('dialog', { name: 'We could not save your plan' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Not now' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await repo.listAll()).toHaveLength(1)
    expect(useSavePlanIntent.getState().pending).toBe(false)
  })

  it('does nothing for a visitor who did not ask to save, even with a plan on the device', async () => {
    const { repo, schedule } = setup()
    await repo.create({ title: 'Read', due_date: today })
    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: true })))
    server.use(...accountToday())
    renderRoute('/today', repo, schedule)
    await screen.findByRole('heading', { level: 1, name: 'Today' })
    expect(screen.queryByText('Your plan is saved')).not.toBeInTheDocument()
    expect(await repo.listAll()).toHaveLength(1)
  })

  it('Profile offers to save a plan left on the device', async () => {
    const { repo, schedule } = setup()
    await repo.create({ title: 'Read', due_date: today })
    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: true })))
    server.use(
      ...accountToday(),
      http.post(`${API}/import`, () => HttpResponse.json({ data: IMPORT_RESULT })),
    )
    renderRoute('/profile', repo, schedule)

    await userEvent.click(await screen.findByRole('button', { name: 'Save your plan' }))

    expect(await screen.findByText('Your plan is saved')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Save your plan' })).not.toBeInTheDocument(),
    )
  })
})
