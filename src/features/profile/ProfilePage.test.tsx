import { act, screen, waitFor, within } from '@testing-library/react'
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
})

async function openDelete() {
  await userEvent.click(await screen.findByRole('button', { name: 'Delete my account' }))
  return within(await screen.findByRole('dialog', { name: 'Delete your account' }))
}

function deferredResponse() {
  let resolve!: (response: Response) => void
  const promise = new Promise<Response>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function signIn(user = makeUser({ survey_done: true })) {
  act(() => useSession.getState().signIn(makeTokenResponse(user)))
}

describe('Profile account deletion', () => {
  beforeEach(() => {
    signIn()
    server.use(...accountProfile())
  })

  it('asks for a password and rejects an empty confirmation locally', async () => {
    const remove = vi.fn(() => new HttpResponse(null, { status: 204 }))
    server.use(http.delete(`${API}/me`, remove))
    await openProfile()
    const sheet = await openDelete()
    expect(sheet.getByLabelText('Your password')).toBeInTheDocument()
    expect(sheet.getByText(/This deletes your account, to-dos and schedule/)).toBeInTheDocument()
    await userEvent.click(sheet.getByRole('button', { name: 'Delete everything' }))
    expect(sheet.getByText('Enter your password.')).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()
  })

  it('shows a 422 password error and keeps the account', async () => {
    server.use(
      http.delete(`${API}/me`, () => validationError('password', 'The password is incorrect.')),
    )
    await openProfile()
    const sheet = await openDelete()
    await userEvent.type(sheet.getByLabelText('Your password'), 'nope')
    await userEvent.click(sheet.getByRole('button', { name: 'Delete everything' }))
    expect(await sheet.findByText('The password is incorrect.')).toBeInTheDocument()
    expect(useSession.getState().token).toBe('1|test-token')
  })

  it('sends the exact password body and signs out after a 204', async () => {
    let body: unknown
    server.use(
      http.delete(`${API}/me`, async ({ request }) => {
        expect(request.headers.get('Authorization')).toBe('Bearer 1|test-token')
        body = await request.json()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openProfile()
    const sheet = await openDelete()
    await userEvent.type(sheet.getByLabelText('Your password'), 'correct-horse')
    await userEvent.click(sheet.getByRole('button', { name: 'Delete everything' }))

    expect(await screen.findByRole('link', { name: 'Try it now' })).toBeInTheDocument()
    expect(body).toEqual({ password: 'correct-horse' })
    expect(useSession.getState().token).toBeNull()
  })

  it.each([200, 401])('keeps the current session when DELETE returns %i', async (status) => {
    server.use(
      http.delete(`${API}/me`, () => HttpResponse.json({ message: 'Unexpected' }, { status })),
    )
    await openProfile()
    const sheet = await openDelete()
    await userEvent.type(sheet.getByLabelText('Your password'), 'anything')
    await userEvent.click(sheet.getByRole('button', { name: 'Delete everything' }))

    expect(await sheet.findByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    expect(useSession.getState().token).toBe('1|test-token')
  })

  it('explains the Google-only restriction, offers no submission, and can be closed', async () => {
    signIn(makeUser({ survey_done: true, has_password: false }))
    const remove = vi.fn(() => new HttpResponse(null, { status: 204 }))
    server.use(http.delete(`${API}/me`, remove))
    await openProfile()
    const sheet = await openDelete()
    expect(
      sheet.getByText(
        'Deleting your account requires your password. Confirming your identity with Google is not supported yet.',
      ),
    ).toBeInTheDocument()
    expect(sheet.queryByLabelText('Your password')).not.toBeInTheDocument()
    expect(sheet.queryByRole('button', { name: 'Delete everything' })).not.toBeInTheDocument()
    await userEvent.click(sheet.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(remove).not.toHaveBeenCalled()
  })

  it('clears the password and error when closed and reopened', async () => {
    server.use(http.delete(`${API}/me`, () => validationError('password', 'Wrong password.')))
    await openProfile()
    const sheet = await openDelete()
    await userEvent.type(sheet.getByLabelText('Your password'), 'wrong')
    await userEvent.click(sheet.getByRole('button', { name: 'Delete everything' }))
    await sheet.findByText('Wrong password.')
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    const reopened = await openDelete()
    expect(reopened.getByLabelText('Your password')).toHaveValue('')
    expect(reopened.queryByText('Wrong password.')).not.toBeInTheDocument()
  })

  it('clears the password and error when accounts change while the sheet is open', async () => {
    server.use(http.delete(`${API}/me`, () => validationError('password', 'Wrong password.')))
    await openProfile()
    const sheet = await openDelete()
    await userEvent.type(sheet.getByLabelText('Your password'), 'previous-password')
    await userEvent.click(sheet.getByRole('button', { name: 'Delete everything' }))
    await sheet.findByText('Wrong password.')

    signIn(makeUser({ id: 'other-user', survey_done: true }))
    const current = within(screen.getByRole('dialog', { name: 'Delete your account' }))
    expect(current.getByLabelText('Your password')).toHaveValue('')
    expect(current.queryByText('Wrong password.')).not.toBeInTheDocument()
  })

  it('blocks a second deletion after leaving and returning to Profile', async () => {
    const response = deferredResponse()
    const remove = vi.fn(() => response.promise)
    server.use(http.delete(`${API}/me`, remove))
    try {
      await openProfile()
      const sheet = await openDelete()
      await userEvent.type(sheet.getByLabelText('Your password'), 'pending-password')
      await userEvent.click(sheet.getByRole('button', { name: 'Delete everything' }))
      await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
      await userEvent.click(sheet.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      const nav = within(screen.getByTestId('bottom-nav'))
      await userEvent.click(nav.getByRole('link', { name: 'Today' }))
      await screen.findByRole('heading', { level: 1, name: 'Today' })
      await userEvent.click(screen.getByRole('link', { name: 'Profile' }))

      const reopened = await openDelete()
      expect(reopened.getByRole('button', { name: 'Deleting…' })).toBeDisabled()
      await userEvent.type(reopened.getByLabelText('Your password'), 'second-password{Enter}')
      expect(remove).toHaveBeenCalledTimes(1)
    } finally {
      response.resolve(validationError('password', 'Wrong password.'))
    }
    expect(await screen.findByRole('button', { name: 'Delete everything' })).toBeEnabled()
  })

  it('keeps focus inside the sheet during keyboard confirmation', async () => {
    const response = deferredResponse()
    server.use(http.delete(`${API}/me`, () => response.promise))
    await openProfile()
    const sheet = await openDelete()
    const password = sheet.getByLabelText('Your password')
    await userEvent.type(password, 'wrong')
    await userEvent.tab()
    expect(sheet.getByRole('button', { name: 'Delete everything' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    response.resolve(validationError('password', 'Wrong password.'))

    expect(password).toHaveFocus()
    expect(await sheet.findByText('Wrong password.')).toBeInTheDocument()
  })

  it.each([204, 401])(
    'ignores a pending deletion response with status %i after sign-in',
    async (status) => {
      const response = deferredResponse()
      const remove = vi.fn(() => response.promise)
      server.use(http.delete(`${API}/me`, remove))
      await openProfile()
      const sheet = await openDelete()
      await userEvent.type(sheet.getByLabelText('Your password'), 'previous-password')
      await userEvent.click(sheet.getByRole('button', { name: 'Delete everything' }))
      await waitFor(() => expect(remove).toHaveBeenCalledTimes(1))
      expect(sheet.getByRole('button', { name: 'Deleting…' })).toBeDisabled()

      await userEvent.click(sheet.getByRole('button', { name: 'Cancel' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      const reopened = await openDelete()
      expect(reopened.getByRole('button', { name: 'Deleting…' })).toBeDisabled()
      expect(reopened.getByLabelText('Your password')).toHaveValue('')

      // Reuse the token to exercise session generation independently of token comparison.
      signIn(makeUser({ id: 'other-user', survey_done: true }))
      await act(async () => {
        await new Promise<void>((resolve) => {
          function onResponse({ request }: { request: Request }) {
            if (request.method !== 'DELETE') return
            server.events.removeListener('response:mocked', onResponse)
            resolve()
          }
          server.events.on('response:mocked', onResponse)
          response.resolve(new HttpResponse(null, { status }))
        })
      })

      expect(remove).toHaveBeenCalledTimes(1)
      expect(useSession.getState().user?.id).toBe('other-user')
      expect(screen.getByRole('heading', { level: 1, name: 'Profile' })).toBeInTheDocument()
    },
  )

  function signInWithLegacyUser() {
    const user = makeUser({ survey_done: true })
    const legacy = { ...user }
    Reflect.deleteProperty(legacy, 'has_password')
    signIn(legacy)
    return user
  }

  it('checks an older session through GET /me and persists the resolved flag', async () => {
    const user = signInWithLegacyUser()
    const response = deferredResponse()
    const lookup = vi.fn(({ request }: { request: Request }) => {
      expect(request.headers.get('Authorization')).toBe('Bearer 1|test-token')
      return response.promise
    })
    server.use(http.get(`${API}/me`, lookup))
    await openProfile()
    const sheet = await openDelete()
    expect(sheet.getByRole('status')).toHaveTextContent(
      'Checking whether you can delete your account…',
    )
    expect(sheet.queryByRole('button', { name: 'Delete everything' })).not.toBeInTheDocument()
    response.resolve(HttpResponse.json({ data: { ...user, has_password: true } }))

    expect(await sheet.findByLabelText('Your password')).toBeInTheDocument()
    expect(lookup).toHaveBeenCalledTimes(1)
    expect(useSession.getState().user).toHaveProperty('has_password', true)
    expect(JSON.parse(localStorage.getItem('loomora.session') ?? '{}').user.has_password).toBe(true)
  })

  it.each([401, 429])(
    'retries a legacy lookup after status %i and keeps deletion unavailable until then',
    async (status) => {
      const user = signInWithLegacyUser()
      const response = deferredResponse()
      const lookup = vi
        .fn()
        .mockReturnValueOnce(HttpResponse.json({ message: 'Retry' }, { status }))
        .mockReturnValueOnce(response.promise)
      server.use(http.get(`${API}/me`, lookup))
      await openProfile()
      const sheet = await openDelete()
      expect(await sheet.findByRole('alert')).toHaveTextContent(
        'Could not check whether you can delete your account.',
      )
      expect(sheet.queryByLabelText('Your password')).not.toBeInTheDocument()
      expect(sheet.queryByRole('button', { name: 'Delete everything' })).not.toBeInTheDocument()
      await userEvent.click(sheet.getByRole('button', { name: 'Try again' }))

      response.resolve(HttpResponse.json({ data: { ...user, has_password: false } }))
      expect(sheet.getByRole('button', { name: 'Cancel' })).toHaveFocus()
      expect(await sheet.findByText(/Confirming your identity with Google/)).toBeInTheDocument()
      expect(sheet.getByRole('button', { name: 'Cancel' })).toHaveFocus()
      expect(lookup).toHaveBeenCalledTimes(2)
    },
  )

  it('does not apply a legacy lookup after the active session changes', async () => {
    const user = signInWithLegacyUser()
    const response = deferredResponse()
    const lookup = vi.fn(() => response.promise)
    server.use(http.get(`${API}/me`, lookup))
    await openProfile()
    await openDelete()
    await waitFor(() => expect(lookup).toHaveBeenCalledTimes(1))
    signIn({ ...user, has_password: false })
    await act(async () =>
      response.resolve(HttpResponse.json({ data: { ...user, has_password: true } })),
    )

    expect(screen.getByText(/Confirming your identity with Google/)).toBeInTheDocument()
    expect(useSession.getState().user).toHaveProperty('has_password', false)
  })
})

describe('Profile resend verification', () => {
  it.each([
    ['an unverified account', null, true],
    ['a verified account', '2026-10-24T03:00:00Z', false],
  ])('%s', async (_name, verifiedAt, shows) => {
    useSession.getState().signIn(makeTokenResponse(makeUser({ email_verified_at: verifiedAt })))
    server.use(
      http.get(`${API}/streak`, () =>
        HttpResponse.json({ data: { current_streak: 0, longest_streak: 0, today_counted: false } }),
      ),
    )
    await openProfile()
    const button = screen.queryByRole('button', { name: 'Send the confirmation email again' })
    expect(Boolean(button)).toBe(shows)
  })
})
