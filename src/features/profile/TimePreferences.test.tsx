import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { renderRoute } from '@/test/renderRoute'

const format = () => screen.findByRole('combobox', { name: 'Time format' })
const weekStart = () => screen.findByRole('combobox', { name: 'Week starts on' })
const save = () => screen.getByRole('button', { name: 'Save changes' })

beforeEach(() => {
  server.use(
    http.get(`${API}/streak`, () =>
      HttpResponse.json({ data: { current_streak: 0, longest_streak: 0, today_counted: false } }),
    ),
  )
})

it('starts guests with a 24-hour clock and a Monday-first week', async () => {
  renderRoute('/profile')
  expect(await format()).toHaveValue('24h')
  expect(await weekStart()).toHaveValue('1')
})

it('uses the authorized account preferences without another read and saves only changed fields', async () => {
  const person = makeUser({ time_format: '12h', week_starts_on: 1, survey_done: true })
  useSession.getState().signIn(makeTokenResponse(person))
  const getMe = vi.fn(() => HttpResponse.json({ data: person }))
  const patch = vi.fn(async ({ request }: { request: Request }) => {
    expect(await request.json()).toEqual({ time_format: '24h', week_starts_on: 7 })
    expect(request.headers.get('Authorization')).toBe('Bearer 1|test-token')
    // Use the values the server actually persisted, even if they differ from the submitted draft.
    return HttpResponse.json({ data: { ...person, time_format: '24h', week_starts_on: 1 } })
  })
  server.use(http.get(`${API}/me`, getMe), http.patch(`${API}/me`, patch))
  renderRoute('/profile')
  expect(await format()).toHaveValue('12h')
  await userEvent.selectOptions(await format(), '24h')
  await userEvent.selectOptions(await weekStart(), '7')
  await userEvent.click(save())
  expect(await screen.findByText('Saved.')).toBeInTheDocument()
  expect(await weekStart()).toHaveValue('1')
  expect(useSession.getState().user).toEqual({ ...person, time_format: '24h', week_starts_on: 1 })
  expect(patch).toHaveBeenCalledTimes(1)
  expect(getMe).not.toHaveBeenCalled()
})

it('refreshes an older cached user once to load their actual preferences', async () => {
  const person = makeUser({ time_format: '12h', week_starts_on: 7, survey_done: true })
  const answer = makeTokenResponse(person)
  const older = Object.fromEntries(
    Object.entries(person).filter(([key]) => !['time_format', 'week_starts_on'].includes(key)),
  )
  useSession.getState().signIn({ ...answer, user: older as typeof person })
  const getMe = vi.fn(() => HttpResponse.json({ data: person }))
  server.use(http.get(`${API}/me`, getMe))
  renderRoute('/profile')
  await waitFor(async () => expect(await format()).toHaveValue('12h'))
  expect(await weekStart()).toHaveValue('7')
  expect(getMe).toHaveBeenCalledTimes(1)
})

it('preserves a same-account update while refreshing legacy preferences', async () => {
  const account = makeUser({ survey_done: true })
  const { time_format, week_starts_on, ...older } = account
  useSession.getState().signIn({ ...makeTokenResponse(account), user: older as typeof account })
  let markStarted!: () => void
  let releaseResponse!: () => void
  const started = new Promise<void>((resolve) => {
    markStarted = resolve
  })
  const response = new Promise<void>((resolve) => {
    releaseResponse = resolve
  })
  const verified = '2026-11-19T13:00:00Z'
  server.use(
    http.get(`${API}/me`, async () => {
      markStarted()
      await response
      return HttpResponse.json({ data: { ...account, time_format, week_starts_on } })
    }),
  )
  renderRoute('/profile')
  await started
  act(() =>
    useSession.getState().setUser({ ...older, email_verified_at: verified } as typeof account),
  )
  releaseResponse()
  expect(await format()).toHaveValue(time_format)
  expect(useSession.getState().user?.email_verified_at).toBe(verified)
})

it('retains a saved week start outside the two selectable options', async () => {
  const person = makeUser({ time_format: '12h', week_starts_on: 6, survey_done: true })
  useSession.getState().signIn(makeTokenResponse(person))
  const patch = vi.fn(async ({ request }: { request: Request }) => {
    expect(await request.json()).toEqual({ time_format: '24h' })
    return HttpResponse.json({ data: { ...person, time_format: '24h' } })
  })
  server.use(http.patch(`${API}/me`, patch))
  renderRoute('/profile')
  expect(await weekStart()).toHaveValue('6')
  expect(screen.getByRole('option', { name: 'Saturday' })).toBeDisabled()
  await userEvent.selectOptions(await format(), '24h')
  await userEvent.click(save())
  expect(await screen.findByText('Saved.')).toBeInTheDocument()
  expect(await weekStart()).toHaveValue('6')
})

it('shows a failed save and restores the persisted selections', async () => {
  const person = makeUser({ time_format: '24h', week_starts_on: 1, survey_done: true })
  useSession.getState().signIn(makeTokenResponse(person))
  server.use(
    http.patch(`${API}/me`, () => HttpResponse.json({ message: 'Retry' }, { status: 429 })),
  )
  renderRoute('/profile')
  await userEvent.selectOptions(await format(), '12h')
  await userEvent.selectOptions(await weekStart(), '7')
  await userEvent.click(save())
  expect(await screen.findByRole('alert')).toBeInTheDocument()
  expect(screen.queryByText('Saved.')).not.toBeInTheDocument()
  expect(await format()).toHaveValue('24h')
  expect(await weekStart()).toHaveValue('1')
  expect(useSession.getState().user).toEqual(person)
})

it('ignores a late preference response after an account switch', async () => {
  const first = makeUser({ time_format: '24h', week_starts_on: 1, survey_done: true })
  const second = makeUser({
    id: 'second-account',
    time_format: '24h',
    week_starts_on: 7,
    survey_done: true,
  })
  let markStarted!: () => void
  let releaseResponse!: () => void
  const started = new Promise<void>((resolve) => {
    markStarted = resolve
  })
  const response = new Promise<void>((resolve) => {
    releaseResponse = resolve
  })
  useSession.getState().signIn(makeTokenResponse(first))
  server.use(
    http.patch(`${API}/me`, async () => {
      markStarted()
      await response
      return HttpResponse.json({ data: { ...first, time_format: '12h' } })
    }),
  )
  renderRoute('/profile')
  await userEvent.selectOptions(await format(), '12h')
  await userEvent.click(save())
  await started
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  await act(async () => {
    useSession.getState().signOut()
    useSession.getState().signIn({ ...makeTokenResponse(second), token: '2|test-token' })
    releaseResponse()
  })
  await waitFor(async () => expect(await weekStart()).toHaveValue('7'))
  expect(await format()).toHaveValue('24h')
  expect(useSession.getState().user).toEqual(second)
})
