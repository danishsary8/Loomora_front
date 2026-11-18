import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from '@/lib/api'
import {
  API,
  http,
  HttpResponse,
  makeTokenResponse,
  makeUser,
  server,
  validationError,
} from '@/test/apiMocks'
import { renderRoute } from '@/test/renderRoute'

function signInAs(user = makeUser({ survey_done: true })) {
  useSession.getState().signIn(makeTokenResponse(user))
}

async function fillCredentials(email: string, password: string) {
  await userEvent.type(await screen.findByLabelText('Email'), email)
  await userEvent.type(screen.getByLabelText('Password'), password)
}

describe('Sign in (S10)', () => {
  it('signs in, keeps the token and opens Today', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json(makeTokenResponse(makeUser({ survey_done: true }))),
      ),
    )
    renderRoute('/sign-in')
    await fillCredentials('sokha@example.com', 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(useSession.getState().token).toBe('1|test-token')
  })

  it('shows one message for wrong credentials', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        validationError('email', 'These credentials do not match our records.'),
      ),
    )
    renderRoute('/sign-in')
    await fillCredentials('sokha@example.com', 'wrong-password')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Wrong email or password.')).toBeInTheDocument()
    expect(useSession.getState().token).toBeNull()
  })

  it('checks the fields before calling the API', async () => {
    renderRoute('/sign-in')
    await userEvent.click(await screen.findByRole('button', { name: 'Sign in' }))
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
  })

  it('tells the user when the API cannot be reached', async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.error()))
    renderRoute('/sign-in')
    await fillCredentials('sokha@example.com', 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach Loomora')
  })

  it('tells the user when there were too many tries', async () => {
    server.use(
      http.post(`${API}/auth/login`, () =>
        HttpResponse.json({ message: 'Too Many Attempts.' }, { status: 429 }),
      ),
    )
    renderRoute('/sign-in')
    await fillCredentials('sokha@example.com', 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many tries')
  })

  it('links to Google sign-in with the sign_in intent', async () => {
    renderRoute('/sign-in')
    const link = await screen.findByRole('link', { name: 'Sign in with Google' })
    const url = new URL(link.getAttribute('href') ?? '')
    expect(url.pathname).toBe('/api/v1/auth/google/redirect')
    expect(url.searchParams.get('intent')).toBe('sign_in')
    expect(url.searchParams.get('timezone')).toBeTruthy()
  })

  it('sends a signed-in visitor on to Today', async () => {
    signInAs()
    renderRoute('/sign-in')
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
  })
})

describe('Sign up and the survey (S10)', () => {
  it('creates the account with the device time zone and opens the survey', async () => {
    let sent: Record<string, unknown> = {}
    server.use(
      http.post(`${API}/auth/register`, async ({ request }) => {
        sent = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(makeTokenResponse(), { status: 201 })
      }),
    )
    renderRoute('/sign-up')
    await fillCredentials('Sokha@Example.com', 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome!' })).toBeInTheDocument()
    expect(sent).toMatchObject({
      name: 'Sokha',
      email: 'Sokha@Example.com',
      password: 'correct-horse',
    })
    expect(typeof sent.timezone).toBe('string')
    expect(screen.getByText(/sokha@example\.com/)).toBeInTheDocument()
  })

  it('shows the API message when the email is already used', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        validationError('email', 'The email has already been taken.'),
      ),
    )
    renderRoute('/sign-up')
    await fillCredentials('sokha@example.com', 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
  })

  it('asks for a password of at least 8 characters', async () => {
    renderRoute('/sign-up')
    await fillCredentials('sokha@example.com', 'short')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Use at least 8 characters.')).toBeInTheDocument()
  })

  it('links to Google sign-up with the sign_up intent', async () => {
    renderRoute('/sign-up')
    const link = await screen.findByRole('link', { name: 'Sign up with Google' })
    expect(new URL(link.getAttribute('href') ?? '').searchParams.get('intent')).toBe('sign_up')
  })

  it('saves the name, goal and source from the survey', async () => {
    signInAs(makeUser())
    let patched: unknown
    let survey: unknown
    server.use(
      http.patch(`${API}/me`, async ({ request }) => {
        patched = await request.json()
        return HttpResponse.json({ data: makeUser({ name: 'Sokha' }) })
      }),
      http.post(`${API}/me/survey`, async ({ request }) => {
        survey = await request.json()
        return HttpResponse.json({
          data: makeUser({ name: 'Sokha', goal: 'manage_time', survey_done: true }),
        })
      }),
    )
    renderRoute('/sign-up/survey')
    const name = await screen.findByLabelText('What should we call you?')
    await userEvent.clear(name)
    await userEvent.type(name, 'Sokha')
    await userEvent.click(screen.getByRole('button', { name: 'Manage my time' }))
    await userEvent.type(screen.getByLabelText('How did you hear about Loomora?'), 'A friend')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(patched).toEqual({ name: 'Sokha' })
    expect(survey).toEqual({ goal: 'manage_time', heard_from: 'A friend' })
    expect(useSession.getState().user).toMatchObject({ survey_done: true })
  })

  it('can be skipped with an empty answer', async () => {
    signInAs(makeUser())
    let survey: unknown
    server.use(
      http.post(`${API}/me/survey`, async ({ request }) => {
        survey = await request.json()
        return HttpResponse.json({ data: makeUser({ survey_done: true }) })
      }),
    )
    renderRoute('/sign-up/survey')
    await userEvent.click(await screen.findByRole('button', { name: 'Skip for now' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
    expect(survey).toEqual({})
  })

  it('is only for signed-in users', async () => {
    renderRoute('/sign-up/survey')
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
  })

  it('goes straight to Today when the survey is already done', async () => {
    signInAs()
    renderRoute('/sign-up/survey')
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
  })
})

describe('Google callback', () => {
  it('trades the code for a token and opens the survey for a new account', async () => {
    server.use(
      http.post(`${API}/auth/google/exchange`, () => HttpResponse.json(makeTokenResponse())),
    )
    renderRoute(`/auth/google/callback?code=${'a'.repeat(64)}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Welcome!' })).toBeInTheDocument()
    expect(useSession.getState().token).toBe('1|test-token')
  })

  it('opens Today for an account that finished the survey', async () => {
    server.use(
      http.post(`${API}/auth/google/exchange`, () =>
        HttpResponse.json(makeTokenResponse(makeUser({ survey_done: true }))),
      ),
    )
    renderRoute(`/auth/google/callback?code=${'a'.repeat(64)}`)
    expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()
  })

  it('explains account_not_found on the sign-in page', async () => {
    renderRoute('/auth/google/callback?error=account_not_found')
    expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('could not find an account')
  })

  it('explains account_already_exists on the sign-up page', async () => {
    renderRoute('/auth/google/callback?error=account_already_exists')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Create an account' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('already has an account')
  })

  it('shows a failure when the code is refused', async () => {
    server.use(
      http.post(`${API}/auth/google/exchange`, () => validationError('code', 'Invalid code.')),
    )
    renderRoute(`/auth/google/callback?code=${'a'.repeat(64)}`)
    expect(await screen.findByRole('alert')).toHaveTextContent('Google sign-in did not work')
    expect(useSession.getState().token).toBeNull()
  })
})

describe('Forgot and reset password', () => {
  it('sends the reset link request and shows the same answer for any email', async () => {
    let sent: unknown
    server.use(
      http.post(`${API}/auth/password/forgot`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ message: 'ok' })
      }),
    )
    renderRoute('/forgot-password')
    await userEvent.type(await screen.findByLabelText('Email'), 'sokha@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText(/If an account exists/)).toBeInTheDocument()
    expect(sent).toEqual({ email: 'sokha@example.com' })
  })

  it('sets a new password with the token and email from the link', async () => {
    let sent: unknown
    server.use(
      http.post(`${API}/auth/password/reset`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ message: 'ok' })
      }),
    )
    renderRoute('/reset-password?token=abc&email=sokha%40example.com')
    await userEvent.type(await screen.findByLabelText('New password'), 'new-password-456')
    await userEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByText(/Your password is changed/)).toBeInTheDocument()
    expect(sent).toEqual({ token: 'abc', email: 'sokha@example.com', password: 'new-password-456' })
  })

  it('says so when the reset link is invalid or expired', async () => {
    server.use(
      http.post(`${API}/auth/password/reset`, () => validationError('token', 'Invalid token.')),
    )
    renderRoute('/reset-password?token=old&email=sokha%40example.com')
    await userEvent.type(await screen.findByLabelText('New password'), 'new-password-456')
    await userEvent.click(screen.getByRole('button', { name: 'Save password' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('not valid or has expired')
  })

  it('does not allow a reset without the link values', async () => {
    renderRoute('/reset-password')
    expect(await screen.findByRole('alert')).toHaveTextContent('not valid or has expired')
    expect(screen.getByRole('button', { name: 'Save password' })).toBeDisabled()
  })
})

describe('Verify email', () => {
  const link = '/verify-email?id=9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f&expires=1793001600&signature='

  it('sends the link values and confirms, updating a signed-in user', async () => {
    signInAs(makeUser({ survey_done: true }))
    let sent: unknown
    server.use(
      http.post(`${API}/auth/email/verify`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({
          message: 'ok',
          user: makeUser({ survey_done: true, email_verified_at: '2026-10-25T00:00:00Z' }),
        })
      }),
    )
    renderRoute(`${link}${'f'.repeat(64)}`)
    expect(await screen.findByText('Your email is confirmed.')).toBeInTheDocument()
    expect(sent).toEqual({
      id: '9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f',
      expires: 1793001600,
      signature: 'f'.repeat(64),
    })
    await waitFor(() =>
      expect(useSession.getState().user?.email_verified_at).toBe('2026-10-25T00:00:00Z'),
    )
  })

  it('says so when the link is invalid or expired', async () => {
    server.use(
      http.post(`${API}/auth/email/verify`, () => validationError('signature', 'Invalid link.')),
    )
    renderRoute(`${link}${'f'.repeat(64)}`)
    expect(await screen.findByRole('alert')).toHaveTextContent('not valid or has expired')
  })

  it('fails without calling the API when the link is incomplete', async () => {
    renderRoute('/verify-email?id=abc')
    expect(await screen.findByRole('alert')).toHaveTextContent('not valid or has expired')
  })
})
