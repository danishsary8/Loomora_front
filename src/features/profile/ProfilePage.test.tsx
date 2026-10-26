import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from '@/lib/api'
import { toLocalDate } from '@/lib/date'
import {
  API,
  http,
  HttpResponse,
  makeTokenResponse,
  makeUser,
  server,
  validationError,
} from '@/test/apiMocks'
import { createTestRepository, renderRoute } from '@/test/renderRoute'

async function openProfile() {
  const { repo } = createTestRepository()
  renderRoute('/profile', repo)
  await screen.findByRole('heading', { level: 1, name: 'Profile' })
  return repo
}

describe('Profile for guests (S9)', () => {
  it('says the data lives on this device only', async () => {
    await openProfile()
    expect(screen.getByText('Data lives on this device only.')).toBeInTheDocument()
  })

  it('shows the streak and whether today counted', async () => {
    await openProfile()
    expect(await screen.findByText('0 days')).toBeInTheDocument()
    expect(screen.getByText('Check off one item today to keep it going.')).toBeInTheDocument()
  })

  it('shows today as counted after a check-off', async () => {
    const { repo } = createTestRepository()
    const todo = await repo.create({ title: 'Read' })
    await repo.setDone(todo.id, true)
    renderRoute('/profile', repo)
    expect(await screen.findByText('1 day')).toBeInTheDocument()
    expect(screen.getByText('Today counted.')).toBeInTheDocument()
  })

  it('opens the Save your plan sheet and goes on to Sign up', async () => {
    await openProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Save your plan' }))
    const sheet = await screen.findByRole('dialog', { name: 'Save your plan' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Create an account' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create an account' }),
    ).toBeInTheDocument()
  })

  it('opens and closes the feedback sheet', async () => {
    await openProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    const sheet = await screen.findByRole('dialog', { name: 'Send feedback' })
    const message = within(sheet).getByLabelText('Your message')
    await userEvent.type(message, 'The week view is great')
    expect(message).toHaveValue('The week view is great')
    expect(within(sheet).getByRole('button', { name: 'Send' })).toBeEnabled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('Feedback (S12)', () => {
  it('stays disabled until there is a message, then sends it', async () => {
    let body: unknown
    server.use(
      http.post(`${API}/feedback`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ message: 'Thanks' }, { status: 201 })
      }),
    )
    await openProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    const sheet = await screen.findByRole('dialog', { name: 'Send feedback' })
    expect(within(sheet).getByRole('button', { name: 'Send' })).toBeDisabled()

    await userEvent.type(within(sheet).getByLabelText('Your message'), '  Great app  ')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send' }))

    expect(await within(sheet).findByText('Thank you. We read every message.')).toBeInTheDocument()
    expect(body).toEqual({ message: 'Great app' })
  })

  it('links the message to the account by sending the token', async () => {
    let auth: string | null = null
    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: true })))
    server.use(
      ...accountProfile(),
      http.post(`${API}/feedback`, ({ request }) => {
        auth = request.headers.get('Authorization')
        return HttpResponse.json({ message: 'Thanks' }, { status: 201 })
      }),
    )
    await openProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    const sheet = await screen.findByRole('dialog', { name: 'Send feedback' })
    await userEvent.type(within(sheet).getByLabelText('Your message'), 'Hello')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send' }))
    await within(sheet).findByText('Thank you. We read every message.')
    expect(auth).toBe('Bearer 1|test-token')
  })

  it.each([
    [500, 'We could not send your message. Please try again.'],
    [429, 'You have sent a lot of messages. Please try again later.'],
  ])('keeps the message and says what went wrong on a %i', async (status, text) => {
    server.use(http.post(`${API}/feedback`, () => HttpResponse.json({ message: 'no' }, { status })))
    await openProfile()
    await userEvent.click(screen.getByRole('button', { name: 'Send feedback' }))
    const sheet = await screen.findByRole('dialog', { name: 'Send feedback' })
    await userEvent.type(within(sheet).getByLabelText('Your message'), 'Keep me')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Send' }))
    expect(await within(sheet).findByText(text)).toBeInTheDocument()
    expect(within(sheet).getByLabelText('Your message')).toHaveValue('Keep me')
  })
})

function accountProfile() {
  return [
    http.get(`${API}/streak`, () =>
      HttpResponse.json({ data: { current_streak: 5, longest_streak: 9, today_counted: true } }),
    ),
    http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
    http.get(`${API}/schedule/day`, () => HttpResponse.json({ date: toLocalDate(), data: [] })),
  ]
}

describe('Profile for accounts (S9)', () => {
  beforeEach(() => {
    useSession
      .getState()
      .signIn(
        makeTokenResponse(
          makeUser({ name: 'Sokha', timezone: 'Asia/Phnom_Penh', survey_done: true }),
        ),
      )
    server.use(...accountProfile())
  })

  it('shows the name, email and the server streak, and not the guest warning', async () => {
    await openProfile()
    expect(await screen.findByLabelText('Name')).toHaveValue('Sokha')
    expect(screen.getByText('sokha@example.com')).toBeInTheDocument()
    expect(await screen.findByText('5 days')).toBeInTheDocument()
    expect(screen.queryByText('Data lives on this device only.')).not.toBeInTheDocument()
  })

  it('saves a new name and time zone with PATCH /me', async () => {
    let body: unknown
    server.use(
      http.patch(`${API}/me`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({
          data: makeUser({ name: 'Dara', timezone: 'Asia/Tokyo', survey_done: true }),
        })
      }),
    )
    await openProfile()
    const save = await screen.findByRole('button', { name: 'Save changes' })
    expect(save).toBeDisabled()

    const name = screen.getByLabelText('Name')
    await userEvent.clear(name)
    await userEvent.type(name, 'Dara')
    await userEvent.selectOptions(screen.getByLabelText('Time zone'), 'Asia/Tokyo')
    await userEvent.click(save)

    expect(await screen.findByText('Saved.')).toBeInTheDocument()
    expect(body).toEqual({ name: 'Dara', timezone: 'Asia/Tokyo' })
    expect(useSession.getState().user?.timezone).toBe('Asia/Tokyo')
  })

  it('offers the device time zone when it differs', async () => {
    const device = Intl.DateTimeFormat().resolvedOptions().timeZone
    useSession.getState().setUser(makeUser({ timezone: 'Pacific/Auckland', survey_done: true }))
    await openProfile()
    await userEvent.click(
      await screen.findByRole('button', { name: `Use this device's time zone (${device})` }),
    )
    expect(screen.getByLabelText('Time zone')).toHaveValue(device)
  })

  it('shows the API error for a field', async () => {
    server.use(http.patch(`${API}/me`, () => validationError('name', 'The name is too long.')))
    await openProfile()
    const name = await screen.findByLabelText('Name')
    await userEvent.type(name, ' Jr')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('The name is too long.')).toBeInTheDocument()
  })

  it('signs out: revokes the token, forgets it and goes to the landing page', async () => {
    let revoked = false
    server.use(
      http.post(`${API}/auth/logout`, () => {
        revoked = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openProfile()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))

    expect(await screen.findByRole('link', { name: 'Try it now' })).toBeInTheDocument()
    expect(revoked).toBe(true)
    expect(useSession.getState().token).toBeNull()
  })

  it('signs out on this device even when the server cannot be reached', async () => {
    server.use(http.post(`${API}/auth/logout`, () => HttpResponse.error()))
    await openProfile()
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('link', { name: 'Try it now' })).toBeInTheDocument()
    expect(useSession.getState().token).toBeNull()
  })

  async function openDelete() {
    await openProfile()
    await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
    return screen.findByRole('dialog', { name: 'Delete your account' })
  }

  it('asks for the password before deleting', async () => {
    const sheet = await openDelete()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete everything' }))
    expect(within(sheet).getByText('Enter your password.')).toBeInTheDocument()
    expect(useSession.getState().token).not.toBeNull()
  })

  it('keeps the account when the password is wrong', async () => {
    server.use(
      http.delete(`${API}/me`, () => validationError('password', 'The password is incorrect.')),
    )
    const sheet = await openDelete()
    await userEvent.type(within(sheet).getByLabelText('Your password'), 'nope')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete everything' }))
    expect(await within(sheet).findByText('The password is incorrect.')).toBeInTheDocument()
    expect(useSession.getState().token).not.toBeNull()
  })

  it('deletes the account, signs out and leaves for the landing page', async () => {
    let body: unknown
    server.use(
      http.delete(`${API}/me`, async ({ request }) => {
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const sheet = await openDelete()
    expect(within(sheet).getByText(/Google account is not available yet/)).toBeInTheDocument()
    await userEvent.type(within(sheet).getByLabelText('Your password'), 'correct-horse')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Delete everything' }))

    expect(await screen.findByRole('link', { name: 'Try it now' })).toBeInTheDocument()
    expect(body).toEqual({ password: 'correct-horse' })
    expect(useSession.getState().token).toBeNull()
  })

  it('can be cancelled', async () => {
    const sheet = await openDelete()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(useSession.getState().token).not.toBeNull()
  })
})
