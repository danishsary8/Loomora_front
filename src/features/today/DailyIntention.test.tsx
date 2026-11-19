import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { AppProviders } from '@/app/AppProviders'
import { useSavePlanIntent } from '@/features/auth/savePlanIntent'
import { onlineManager } from '@tanstack/react-query'
import { useSession } from '@/lib/api'
import { toLocalDate } from '@/lib/date'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { createTestRepository, renderRoute } from '@/test/renderRoute'
import { DailyIntention } from './DailyIntention'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

const label = 'Daily intention'
const field = () => screen.getByRole<HTMLInputElement>('textbox', { name: label })
const write = (value: string) => fireEvent.change(field(), { target: { value } })
const blur = () => fireEvent.blur(field())
const saved = () => expect(screen.getByText('Saved', { exact: true })).toBeVisible()

let fixture: ReturnType<typeof createTestRepository>

beforeEach(() => {
  fixture = createTestRepository()
})

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  onlineManager.setOnline(true)
  await fixture.db.delete()
})

async function openToday() {
  const view = renderRoute('/today', fixture.repo, undefined, fixture.db)
  await waitFor(() => expect(field()).toBeEnabled(), { timeout: 2500 })
  return view
}

function mockAccountReads() {
  server.use(
    http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
    http.get(`${API}/schedule/items`, () => HttpResponse.json({ data: [] })),
    http.get(`${API}/schedule/day`, () => HttpResponse.json({ data: [] })),
    http.get(`${API}/streak`, () =>
      HttpResponse.json({ data: { current_streak: 0, longest_streak: 0, today_counted: false } }),
    ),
  )
}

it('starts empty and persists a trimmed guest intention across a reload while offline', async () => {
  onlineManager.setOnline(false)
  const mount = () =>
    render(
      <AppProviders guestDatabase={fixture.db}>
        <DailyIntention date={toLocalDate()} />
      </AppProviders>,
    )
  const view = mount()
  await waitFor(() => expect(field()).toBeEnabled(), { timeout: 2500 })
  expect(field()).toHaveValue('')
  write('  Finish the essay  ')
  blur()
  await waitFor(saved)
  view.unmount()
  mount()
  await waitFor(() => expect(field()).toHaveValue('Finish the essay'), { timeout: 2500 })
})

it.each(['', '   '])('clears the stored intention for input %j', async (value) => {
  const view = await openToday()
  write('Study')
  blur()
  await waitFor(saved)
  write(value)
  blur()
  await waitFor(saved)
  view.unmount()
  await openToday()
  expect(field()).toHaveValue('')
})

it('limits the one-line field to 200 characters', async () => {
  await openToday()
  expect(field().type).toBe('text')
  write('x'.repeat(201))
  expect(field()).toHaveValue('x'.repeat(200))
  const unicode = '\u{1F331}'.repeat(200)
  write('  ' + unicode + '  ')
  blur()
  await waitFor(saved)
  await waitFor(() => expect(field()).toHaveValue(unicode))
})

it('debounces 600 ms, deduplicates blur and skips unchanged normalized text', async () => {
  const date = toLocalDate(new Date(), 'Asia/Phnom_Penh')
  const calls: unknown[] = []
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  server.use(
    http.get(`${API}/days/${date}/intention`, () =>
      HttpResponse.json({ data: { date, text: null } }),
    ),
    http.put(`${API}/days/${date}/intention`, async ({ request }) => {
      calls.push(await request.json())
      expect(request.headers.get('Authorization')).toBe('Bearer 1|test-token')
      return HttpResponse.json({ data: { date, text: 'Study tonight' } })
    }),
  )
  await openToday()
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  write('Study')
  await act(() => vi.advanceTimersByTimeAsync(300))
  write('  Study tonight')
  await act(() => vi.advanceTimersByTimeAsync(599))
  expect(calls).toEqual([])
  await act(() => vi.advanceTimersByTimeAsync(1))
  blur()
  vi.useRealTimers()
  await waitFor(saved)
  write('Study tonight ')
  blur()
  expect(calls).toEqual([{ text: 'Study tonight' }])
})

it('shows a save error, keeps the draft and uses the authoritative response on retry', async () => {
  let attempts = 0
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  server.use(
    http.get(`${API}/days/:date/intention`, ({ params }) =>
      HttpResponse.json({ data: { date: params.date, text: 'Original' } }),
    ),
    http.put(`${API}/days/:date/intention`, ({ params }) => {
      attempts++
      return attempts === 1
        ? HttpResponse.json({ message: 'Invalid' }, { status: 422 })
        : HttpResponse.json({ data: { date: params.date, text: 'Canonical' } })
    }),
  )
  await openToday()
  expect(field()).toHaveValue('Original')
  write('Keep my draft')
  blur()
  await screen.findByText('Could not save your intention.')
  expect(field()).toHaveValue('Keep my draft')
  expect(screen.queryByText('Saved', { exact: true })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving intention' }))
  await waitFor(saved)
  expect(field()).toHaveValue('Canonical')
})

it('serializes saves and keeps typing when an older response arrives', async () => {
  const first = deferred()
  const second = deferred()
  const calls: unknown[] = []
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  server.use(
    http.get(`${API}/days/:date/intention`, ({ params }) =>
      HttpResponse.json({ data: { date: params.date, text: null } }),
    ),
    http.put(`${API}/days/:date/intention`, async ({ params, request }) => {
      const body = (await request.json()) as { text: string }
      calls.push(body.text)
      await (body.text === 'First' ? first.promise : second.promise)
      return HttpResponse.json({ data: { date: params.date, text: body.text } })
    }),
  )
  await openToday()
  write('First')
  blur()
  await waitFor(() => expect(calls).toEqual(['First']))
  expect(screen.getByText('Saving…')).toBeVisible()
  write('Second')
  blur()
  first.resolve()
  await waitFor(() => expect(calls).toEqual(['First', 'Second']))
  expect(field()).toHaveValue('Second')
  expect(screen.queryByText('Saved', { exact: true })).toBeNull()
  second.resolve()
  await waitFor(saved)
})

it('switches at Phnom Penh midnight and ignores a pending response from the previous day', async () => {
  const old = deferred()
  const requests: string[] = []
  const before = new Date('2026-11-19T16:59:59.000Z')
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(before)
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  server.use(
    http.get(`${API}/days/:date/intention`, ({ params }) =>
      HttpResponse.json({
        data: { date: params.date, text: params.date === '2026-11-19' ? 'Yesterday' : null },
      }),
    ),
    http.put(`${API}/days/:date/intention`, async ({ params }) => {
      requests.push(String(params.date))
      await old.promise
      return HttpResponse.json({ data: { date: params.date, text: 'Old response' } })
    }),
  )
  await openToday()
  expect(field()).toHaveValue('Yesterday')
  write('Last edit')
  blur()
  await waitFor(() => expect(requests).toEqual(['2026-11-19']))
  vi.setSystemTime(new Date('2026-11-19T17:00:00.000Z'))
  fireEvent.focus(window)
  await waitFor(() => expect(field()).toBeEnabled())
  expect(field()).toHaveValue('')
  write('New day draft')
  old.resolve()
  await act(() => old.promise)
  expect(field()).toHaveValue('New day draft')
})

describe('an intention edited just before Phnom Penh midnight', () => {
  const yesterday = '2026-11-19'
  const today = '2026-11-20'

  function setMidnight() {
    vi.setSystemTime(new Date('2026-11-19T17:00:00.000Z'))
    fireEvent.focus(window)
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-19T16:59:59.800Z'))
    mockAccountReads()
    useSession.getState().signIn(makeTokenResponse())
  })

  it('finishes the pending debounce for the original date and leaves the next day empty', async () => {
    const calls: unknown[] = []
    server.use(
      http.put(`${API}/days/:date/intention`, async ({ params, request }) => {
        const { text } = (await request.json()) as { text: string }
        calls.push({ date: params.date, text, authorization: request.headers.get('Authorization') })
        return HttpResponse.json({ data: { date: params.date, text } })
      }),
    )
    await openToday()
    write('Finish before midnight')
    setMidnight()
    await waitFor(() => expect(field()).toBeEnabled())
    expect(field()).toHaveValue('')
    await waitFor(() =>
      expect(calls).toEqual([
        { date: yesterday, text: 'Finish before midnight', authorization: 'Bearer 1|test-token' },
      ]),
    )
    expect(field()).toHaveValue('')
  })

  it('retries a failed previous-day save while retaining the new day’s own edit', async () => {
    const calls: unknown[] = []
    server.use(
      http.put(`${API}/days/:date/intention`, async ({ params, request }) => {
        const { text } = (await request.json()) as { text: string }
        calls.push({ date: params.date, text })
        if (calls.length === 1) return HttpResponse.json({ message: 'Invalid' }, { status: 422 })
        return HttpResponse.json({ data: { date: params.date, text } })
      }),
    )
    await openToday()
    write('Recover yesterday')
    setMidnight()
    const retry = await screen.findByRole('button', { name: /retry saving intention for/i })
    expect(field()).toHaveValue('')
    write('Write the new day')
    blur()
    await waitFor(saved)
    fireEvent.click(retry)
    await waitFor(() =>
      expect(calls).toEqual([
        { date: yesterday, text: 'Recover yesterday' },
        { date: today, text: 'Write the new day' },
        { date: yesterday, text: 'Recover yesterday' },
      ]),
    )
    await waitFor(() => expect(retry).not.toBeInTheDocument())
    expect(field()).toHaveValue('Write the new day')
  })

  it('cancels the old account debounce when accounts change during rollover', async () => {
    const calls: unknown[] = []
    server.use(
      http.put(`${API}/days/:date/intention`, async ({ params, request }) => {
        const { text } = (await request.json()) as { text: string }
        calls.push({ date: params.date, text, authorization: request.headers.get('Authorization') })
        return HttpResponse.json({ data: { date: params.date, text } })
      }),
    )
    await openToday()
    vi.useRealTimers()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    vi.setSystemTime(new Date('2026-11-19T16:59:59.800Z'))
    write('Private pending draft')
    setMidnight()
    act(() =>
      useSession.getState().signIn({
        ...makeTokenResponse(makeUser({ id: 'another-user' })),
        token: '2|other-token',
      }),
    )
    await act(() => vi.advanceTimersByTimeAsync(601))
    vi.useRealTimers()
    expect(calls).toEqual([])
  })
})

it('keeps a trailing space typed while a save is pending', async () => {
  const pending = deferred()
  const started = deferred()
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  server.use(
    http.put(`${API}/days/:date/intention`, async ({ params }) => {
      started.resolve()
      await pending.promise
      return HttpResponse.json({ data: { date: params.date, text: 'Study' } })
    }),
  )
  await openToday()
  write('Study')
  blur()
  await act(() => started.promise)
  write('Study ')
  pending.resolve()
  await waitFor(saved)
  expect(field()).toHaveValue('Study ')
})

it('retains an unsaved account draft when Save Plan refreshes the intention', async () => {
  const imported = deferred()
  const refresh = deferred()
  const date = toLocalDate(new Date(), 'Asia/Phnom_Penh')
  const device = { date, text: 'Guest intention' }
  await fixture.db.dailyIntentions.put(device)
  useSession.getState().signIn(makeTokenResponse())
  useSavePlanIntent.getState().request()
  mockAccountReads()
  let importing = false
  server.use(
    http.post(`${API}/import`, async ({ request }) => {
      expect(await request.json()).toMatchObject({ daily_intentions: [device] })
      await imported.promise
      importing = true
      return HttpResponse.json({ data: { daily_intentions: { created: 0, skipped: 1 } } })
    }),
    http.get(`${API}/days/${date}/intention`, async () => {
      if (importing) await refresh.promise
      return HttpResponse.json({ data: { date, text: 'Server intention' } })
    }),
    http.put(`${API}/days/${date}/intention`, () =>
      HttpResponse.json({ message: 'Invalid' }, { status: 422 }),
    ),
  )
  await openToday()
  write('Account draft')
  blur()
  await screen.findByText('Could not save your intention.')
  imported.resolve()
  await waitFor(() => expect(useSavePlanIntent.getState().pending).toBe(false))
  expect(field()).toHaveValue('Account draft')
  refresh.resolve()
  await screen.findByText('Your plan is saved')
  expect(field()).toHaveValue('Account draft')
  expect(await fixture.db.dailyIntentions.count()).toBe(0)
})

it('shows a save that completes after leaving and returning to Today', async () => {
  const pending = deferred()
  const started = deferred()
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  server.use(
    http.get(`${API}/days/:date/intention`, ({ params }) =>
      HttpResponse.json({ data: { date: params.date, text: 'Original' } }),
    ),
    http.put(`${API}/days/:date/intention`, async ({ params }) => {
      started.resolve()
      await pending.promise
      return HttpResponse.json({ data: { date: params.date, text: 'Saved across navigation' } })
    }),
  )
  const { router } = await openToday()
  write('Saved across navigation')
  blur()
  await act(() => started.promise)
  await act(() => router.navigate('/week'))
  await screen.findByRole('heading', { level: 1, name: 'Week' })
  expect(screen.queryByRole('textbox', { name: label })).toBeNull()
  await act(() => router.navigate('/today'))
  await waitFor(() => expect(field()).toHaveValue('Original'))
  pending.resolve()
  await waitFor(() => expect(field()).toHaveValue('Saved across navigation'))
})

it('recovers an expired account’s failed draft only after that account signs back in', async () => {
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  let signedInAgain = false
  server.use(
    http.put(`${API}/days/:date/intention`, async ({ params, request }) => {
      if (!signedInAgain) return HttpResponse.json({ message: 'Expired' }, { status: 401 })
      const { text } = (await request.json()) as { text: string }
      return HttpResponse.json({ data: { date: params.date, text } })
    }),
  )
  await openToday()
  write('Private draft')
  blur()
  await waitFor(() => expect(useSession.getState().token).toBeNull())
  await waitFor(() => expect(field()).toBeEnabled())
  expect(field()).toHaveValue('')
  act(() =>
    useSession.getState().signIn({
      ...makeTokenResponse(makeUser({ id: 'another-user' })),
      token: '2|other-token',
    }),
  )
  await waitFor(() => expect(field()).toBeEnabled())
  expect(field()).toHaveValue('')
  signedInAgain = true
  act(() => useSession.getState().signIn({ ...makeTokenResponse(), token: '3|new-token' }))
  await waitFor(() => expect(field()).toHaveValue('Private draft'))
  fireEvent.click(screen.getByRole('button', { name: 'Retry saving intention' }))
  await waitFor(saved)
})

it('does not send a queued private draft to a different account after remounting', async () => {
  const pending = deferred()
  const calls: unknown[] = []
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  server.use(
    http.put(`${API}/days/:date/intention`, async ({ params, request }) => {
      const { text } = (await request.json()) as { text: string }
      calls.push({ text, authorization: request.headers.get('Authorization') })
      if (text === 'First private intention') await pending.promise
      return HttpResponse.json({ data: { date: params.date, text } })
    }),
  )
  const { router, queryClient } = await openToday()
  write('First private intention')
  blur()
  await waitFor(() => expect(calls).toHaveLength(1))
  await act(() => router.navigate('/week'))
  await screen.findByRole('heading', { level: 1, name: 'Week' })
  await act(() => router.navigate('/today'))
  await waitFor(() => expect(field()).toBeEnabled())
  write('Queued private intention')
  blur()
  await waitFor(() => expect(queryClient.isMutating()).toBe(2))
  act(() =>
    useSession.getState().signIn({
      ...makeTokenResponse(makeUser({ id: 'another-user' })),
      token: '2|other-token',
    }),
  )
  await waitFor(() => expect(field()).toHaveValue(''))
  pending.resolve()
  await waitFor(() => expect(queryClient.isMutating()).toBe(0))
  expect(calls).toEqual([{ text: 'First private intention', authorization: 'Bearer 1|test-token' }])
  expect(field()).toHaveValue('')
})

it('loads the next account independently and hides private text on sign-out', async () => {
  const first = deferred()
  const requests: string[] = []
  mockAccountReads()
  useSession.getState().signIn(makeTokenResponse())
  server.use(
    http.get(`${API}/days/:date/intention`, async ({ params, request }) => {
      const token = request.headers.get('Authorization') ?? ''
      requests.push(token)
      if (token === 'Bearer 1|test-token') await first.promise
      return HttpResponse.json({ data: { date: params.date, text: token } })
    }),
  )
  renderRoute('/today', fixture.repo, undefined, fixture.db)
  await waitFor(() => expect(requests).toContain('Bearer 1|test-token'))
  act(() =>
    useSession.getState().signIn({
      ...makeTokenResponse(makeUser({ id: 'another-user' })),
      token: '2|other-token',
    }),
  )
  await waitFor(() => expect(field()).toHaveValue('Bearer 2|other-token'))
  first.resolve()
  await act(() => first.promise)
  expect(field()).toHaveValue('Bearer 2|other-token')
  act(() => useSession.getState().signOut())
  await waitFor(() => expect(field()).toBeEnabled())
  expect(field()).toHaveValue('')
})
