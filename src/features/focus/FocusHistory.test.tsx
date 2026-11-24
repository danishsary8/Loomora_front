import { webcrypto } from 'node:crypto'
import { onlineManager } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppProviders } from '@/app/AppProviders'
import { useSession } from '@/lib/api'
import { toLocalDate } from '@/lib/date'
import { GuestDatabase } from '@/lib/storage/db'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { FocusPage } from './FocusPage'
import type { FocusSession, FocusSessionInput } from './types'

const endpoint = `${API}/focus-sessions`
const date = '2026-11-23'
const midnight = '2026-11-23T16:59:00Z'
let db: GuestDatabase

function session(overrides: Partial<FocusSession> = {}): FocusSession {
  return {
    id: crypto.randomUUID(),
    local_date: date,
    mode: 'stopwatch',
    end_reason: 'ended_early',
    started_at: midnight,
    ended_at: '2026-11-23T17:09:00Z',
    created_at: '2026-11-23T17:09:00Z',
    focus_ms: 4_500,
    break_ms: 0,
    paused_ms: 595_500,
    planned_focus_ms: null,
    todo_id: null,
    schedule_item_id: null,
    label: null,
    segments: [
      { type: 'focus', started_at: midnight, ended_at: '2026-11-23T17:09:00Z', active_ms: 4_500 },
    ],
    laps: null,
    ...overrides,
  }
}

function signIn(token = '1|history-owner') {
  useSession.getState().signIn({
    ...makeTokenResponse(makeUser({ id: token, timezone: 'Asia/Phnom_Penh' })),
    token,
  })
}

function openHistory() {
  const view = render(
    <AppProviders guestDatabase={db}>
      <FocusPage />
    </AppProviders>,
  )
  return { ...view, history: within(screen.getByRole('region', { name: 'Focus history' })) }
}

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  db = new GuestDatabase(crypto.randomUUID())
  server.use(
    http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
    http.get(`${API}/schedule/items`, () => HttpResponse.json({ data: [] })),
  )
})

afterEach(async () => {
  act(() => onlineManager.setOnline(true))
  vi.unstubAllGlobals()
  await db.delete()
})

it('orders distinct saved sessions by instant and totals only their actual focus time', async () => {
  signIn()
  const later = session({ label: 'Reading' })
  const earlier = session({
    mode: 'countdown',
    end_reason: 'completed',
    started_at: '2026-11-23T18:00:00+07:00',
    focus_ms: 60_500,
    planned_focus_ms: 300_000,
    break_ms: 300_000,
    paused_ms: 30_000,
    schedule_item_id: crypto.randomUUID(),
  })
  server.use(
    http.get(endpoint, ({ request }) =>
      HttpResponse.json({
        data: new URL(request.url).searchParams.get('date') === date ? [later, earlier, later] : [],
      }),
    ),
  )

  const { history } = openHistory()
  const field = history.getByLabelText('Session date')
  fireEvent.change(field, { target: { value: date } })
  const rows = await history.findAllByRole('listitem')
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('Countdown')
  expect(rows[0]).toHaveTextContent('Completed')
  expect(rows[0]).toHaveTextContent('18:00')
  expect(rows[0]).toHaveTextContent('Schedule item unavailable')
  expect(rows[1]).toHaveTextContent('Stopwatch')
  expect(rows[1]).toHaveTextContent('Ended early')
  expect(rows[1]).toHaveTextContent('23:59')
  expect(rows[1]).toHaveTextContent('Reading')
  expect(rows[1]).toHaveTextContent('4.5 sec')
  expect(history.getByText('1 min, 5 sec')).toBeVisible()

  fireEvent.change(field, { target: { value: '2026-11-24' } })
  expect(await history.findByText('No saved Focus sessions for this date.')).toBeVisible()
  expect(history.queryByText(/Reading/)).not.toBeInTheDocument()
  expect(history.getByText('0 sec')).toBeVisible()
})

it('shows only the active owner’s history and ignores a previous account’s delayed response', async () => {
  await db.focus_sessions.add(session({ label: 'Device record' }))
  let finishRequest!: () => void
  const waiting = new Promise<void>((resolve) => {
    finishRequest = resolve
  })
  let firstStarted!: () => void
  const started = new Promise<void>((resolve) => {
    firstStarted = resolve
  })
  server.use(
    http.get(endpoint, async ({ request }) => {
      if (new URL(request.url).searchParams.get('date') !== date)
        return HttpResponse.json({ data: [] })
      if (request.headers.get('Authorization') === 'Bearer 1|history-owner') {
        firstStarted()
        await waiting
        return HttpResponse.json({ data: [session({ label: 'Private account record' })] })
      }
      return HttpResponse.json({ data: [session({ label: 'Other account record' })] })
    }),
  )
  const { history } = openHistory()
  const selectDate = () =>
    fireEvent.change(history.getByLabelText('Session date'), { target: { value: date } })
  selectDate()
  expect(await history.findByText(/Device record/)).toBeVisible()
  act(() => signIn())
  selectDate()
  await started
  expect(history.queryByText(/Device record/)).not.toBeInTheDocument()
  expect(history.getByText('Loading Focus history…')).toBeVisible()
  act(() => signIn('2|history-other'))
  selectDate()
  expect(await history.findByText(/Other account record/)).toBeVisible()
  await act(async () => finishRequest())
  expect(history.queryByText(/Private account record/)).not.toBeInTheDocument()
  act(() => useSession.getState().signOut())
  selectDate()
  expect(await history.findByText(/Device record/)).toBeVisible()
  expect(history.queryByText(/Other account record/)).not.toBeInTheDocument()
})

it('offers retry after a history error and loads the chosen date when the account reconnects', async () => {
  const user = userEvent.setup()
  signIn()
  onlineManager.setOnline(false)
  let fail = true
  server.use(
    http.get(endpoint, ({ request }) => {
      if (fail) return new HttpResponse(null, { status: 503 })
      return HttpResponse.json({
        data:
          new URL(request.url).searchParams.get('date') === date
            ? [session({ label: 'After retry' })]
            : [],
      })
    }),
  )
  const { history } = openHistory()
  fireEvent.change(history.getByLabelText('Session date'), { target: { value: date } })
  expect(await history.findByText('Focus history is unavailable offline.')).toBeVisible()
  act(() => onlineManager.setOnline(true))
  expect(await history.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
    'Could not load Focus history.',
  )
  fail = false
  await user.click(history.getByRole('button', { name: 'Try again' }))
  expect(await history.findByText(/After retry/)).toBeVisible()
})

it('refreshes a first history load that was still in flight when a new session was saved', async () => {
  const user = userEvent.setup()
  signIn()
  let releaseRead!: () => void
  const staleRead = new Promise<void>((resolve) => {
    releaseRead = resolve
  })
  let startRead!: () => void
  const reading = new Promise<void>((resolve) => {
    startRead = resolve
  })
  let saved: FocusSession | undefined
  server.use(
    http.get(endpoint, async () => {
      if (saved) return HttpResponse.json({ data: [saved] })
      startRead()
      await staleRead
      return HttpResponse.json({ data: [] })
    }),
    http.post(endpoint, async ({ request }) => {
      const payload = (await request.json()) as FocusSessionInput
      const segment = payload.segments[0]
      if (!segment) return new HttpResponse(null, { status: 422 })
      saved = session({
        id: payload.id,
        local_date: toLocalDate(new Date(payload.started_at), 'Asia/Phnom_Penh'),
        started_at: payload.started_at,
        ended_at: payload.ended_at,
        end_reason: payload.end_reason,
        segments: payload.segments,
        focus_ms: segment.active_ms,
      })
      return HttpResponse.json({ data: saved }, { status: 201 })
    }),
  )
  const { history } = openHistory()
  try {
    await reading
    await user.click(await screen.findByRole('button', { name: 'Stopwatch' }))
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await screen.findByRole('button', { name: 'Pause' })
    const finish = screen.getByRole('button', { name: 'Finish' })
    await waitFor(() => expect(finish).toHaveAttribute('aria-disabled', 'false'))
    await user.click(finish)
    expect(await history.findByRole('listitem')).toHaveTextContent('Completed')
  } finally {
    await act(async () => releaseRead())
  }
})

it('resolves supported plan titles for an older account session using existing plan queries', async () => {
  signIn()
  const past = '2026-01-05'
  const today = toLocalDate(new Date(), 'Asia/Phnom_Penh')
  const todo = { id: crypto.randomUUID(), title: 'Read book' }
  const schedule = { id: crypto.randomUUID(), title: 'Morning work' }
  server.use(
    http.get(endpoint, ({ request }) =>
      HttpResponse.json({
        data:
          new URL(request.url).searchParams.get('date') === past
            ? [
                session({ local_date: past, todo_id: todo.id }),
                session({ local_date: past, schedule_item_id: schedule.id }),
              ]
            : [],
      }),
    ),
    http.get(`${API}/todos`, ({ request }) =>
      new URL(request.url).searchParams.get('date') === today
        ? HttpResponse.json({ data: [todo] })
        : new HttpResponse(null, { status: 422 }),
    ),
    http.get(`${API}/schedule/items`, () => HttpResponse.json({ data: [schedule] })),
  )
  const { history } = openHistory()
  fireEvent.change(history.getByLabelText('Session date'), { target: { value: past } })
  expect(await history.findByText(/Read book/)).toBeVisible()
  expect(await history.findByText(/Morning work/)).toBeVisible()
})
