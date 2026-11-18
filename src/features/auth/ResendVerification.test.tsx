import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { ResendVerification } from './ResendVerification'

async function clickResend() {
  render(<ResendVerification />)
  await userEvent.click(screen.getByRole('button', { name: 'Send the confirmation email again' }))
}

beforeEach(() => useSession.getState().signIn(makeTokenResponse()))

describe('ResendVerification', () => {
  it('sends the request with the token and confirms', async () => {
    let auth: string | null = null
    server.use(
      http.post(`${API}/auth/email/resend`, ({ request }) => {
        auth = request.headers.get('Authorization')
        return HttpResponse.json({ message: 'Verification email sent.' })
      }),
    )
    await clickResend()
    expect(await screen.findByText(/We sent a new confirmation email/)).toBeVisible()
    expect(auth).toBe('Bearer 1|test-token')
  })

  it('shows the wait time from a 429', async () => {
    server.use(
      http.post(`${API}/auth/email/resend`, () =>
        HttpResponse.json(
          { message: 'Too Many Attempts.' },
          { status: 429, headers: { 'Retry-After': '120' } },
        ),
      ),
    )
    await clickResend()
    expect(await screen.findByRole('alert')).toHaveTextContent('Try again in 2 minutes.')
  })

  it('shows a generic wait when a 429 has no retry time', async () => {
    server.use(http.post(`${API}/auth/email/resend`, () => HttpResponse.json({}, { status: 429 })))
    await clickResend()
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many tries. Wait a minute')
  })

  it('shows a network message when the API cannot be reached', async () => {
    server.use(http.post(`${API}/auth/email/resend`, () => HttpResponse.error()))
    await clickResend()
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach Loomora')
    expect(screen.queryByText(/We sent/)).not.toBeInTheDocument()
  })
})
