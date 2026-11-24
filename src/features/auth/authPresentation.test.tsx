import { screen, within } from '@testing-library/react'
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

/** The live status region that holds `text`. */
async function statusWith(text: RegExp) {
  const status = (await screen.findByText(text)).closest('[role="status"]')
  expect(status).not.toBeNull()
  return status as HTMLElement
}

/** A response the test releases by hand, so the pending state can be checked. */
function heldResponse() {
  let release: () => void = () => undefined
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  return {
    release,
    resolver: async () => {
      await gate
      return HttpResponse.json({ message: 'ok' })
    },
  }
}

function primaryButtons(container: HTMLElement) {
  return [...container.querySelectorAll('a, button')].filter((el) =>
    el.className.split(' ').includes('bg-primary'),
  )
}

describe('Elemental auth layout (UX-011)', () => {
  it.each([
    ['/sign-in', 'Sign in', 'Welcome back. Pick up your plan where you left it.'],
    ['/sign-up', 'Create an account', 'Keep your plan safe and use it on every device.'],
  ])(
    'gives %s an Inter heading, a muted subtitle and one primary action',
    async (path, title, subtitle) => {
      renderRoute(path)
      const heading = await screen.findByRole('heading', { level: 1, name: title })
      expect(heading).toHaveClass('font-heading')
      expect(screen.getByText(subtitle)).toHaveClass('text-muted')
      expect(primaryButtons(screen.getByRole('main'))).toHaveLength(1)
    },
  )

  it('separates Google from the email form with a labelled hairline divider', async () => {
    renderRoute('/sign-in')
    const divider = await screen.findByRole('separator', { name: 'or' })
    expect(divider).toBeInTheDocument()
  })

  it('puts the form on an Elemental paper card', async () => {
    renderRoute('/sign-in')
    const form = (await screen.findByLabelText('Email')).closest('form')
    expect(form?.closest('.bg-paper.border-border-subtle')).not.toBeNull()
  })

  it('styles every auth text link the same way with a 44 px target', async () => {
    renderRoute('/sign-in')
    for (const name of ['Forgot your password?', 'New here? Create an account']) {
      const link = await screen.findByRole('link', { name })
      expect(link).toHaveClass('min-h-touch', 'text-primary', 'underline')
    }
  })

  it('reaches every control in reading order with the keyboard', async () => {
    renderRoute('/sign-in')
    await screen.findByLabelText('Email')
    const order = [
      screen.getByRole('link', { name: 'Sign in with Google' }),
      screen.getByLabelText('Email'),
      screen.getByLabelText('Password'),
      screen.getByRole('link', { name: 'Forgot your password?' }),
      screen.getByRole('button', { name: 'Sign in' }),
      screen.getByRole('link', { name: 'New here? Create an account' }),
    ]
    order[0]?.focus()
    for (const element of order.slice(1)) {
      await userEvent.tab()
      expect(element).toHaveFocus()
    }
  })
})

describe('Elemental auth messages (UX-011)', () => {
  it('shows a server error as a danger notice with an icon, not a thick box', async () => {
    server.use(http.post(`${API}/auth/login`, () => HttpResponse.error()))
    renderRoute('/sign-in')
    await userEvent.type(await screen.findByLabelText('Email'), 'sokha@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveClass('border-danger')
    expect(alert).not.toHaveClass('border-thick')
    expect(alert.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('keeps field errors next to their field', async () => {
    server.use(
      http.post(`${API}/auth/register`, () =>
        validationError('email', 'The email has already been taken.'),
      ),
    )
    renderRoute('/sign-up')
    await userEvent.type(await screen.findByLabelText('Email'), 'sokha@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'long-enough-password')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    const email = screen.getByLabelText('Email')
    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
    expect(email).toHaveAttribute('aria-invalid', 'true')
    expect(email).toHaveAccessibleDescription('The email has already been taken.')
  })

  it('shows the reset link answer as a success notice, not a category card', async () => {
    server.use(http.post(`${API}/auth/password/forgot`, () => HttpResponse.json({ message: 'ok' })))
    renderRoute('/forgot-password')
    await userEvent.type(await screen.findByLabelText('Email'), 'sokha@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    const status = await statusWith(/If an account exists/)
    expect(status.className).not.toMatch(/bg-category-/)
    expect(status.querySelector('svg[aria-hidden="true"]')).not.toBeNull()
  })

  it('shows a failed confirmation link as a danger notice, not a category card', async () => {
    renderRoute('/verify-email?id=abc')
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveClass('border-danger')
    expect(alert.className).not.toMatch(/bg-category-/)
  })

  it('shows a sent confirmation email as a success notice', async () => {
    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: true })))
    server.use(http.post(`${API}/auth/email/resend`, () => HttpResponse.json({ message: 'ok' })))
    renderRoute('/verify-email?id=abc')
    await userEvent.click(
      await screen.findByRole('button', { name: 'Send the confirmation email again' }),
    )
    const status = await statusWith(/We sent a new confirmation email/)
    expect(status).toHaveClass('text-ink')
  })
})

describe('Elemental auth pending states (UX-011)', () => {
  it('marks the sign-in form busy and disables its submit while signing in', async () => {
    const held = heldResponse()
    server.use(http.post(`${API}/auth/login`, held.resolver))
    renderRoute('/sign-in')
    await userEvent.type(await screen.findByLabelText('Email'), 'sokha@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'correct-horse')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    const submit = await screen.findByRole('button', { name: 'Signing in…' })
    expect(submit).toBeDisabled()
    expect(submit.closest('form')).toHaveAttribute('aria-busy', 'true')
    held.release()
  })

  it('says Sending… while the reset link request runs', async () => {
    const held = heldResponse()
    server.use(http.post(`${API}/auth/password/forgot`, held.resolver))
    renderRoute('/forgot-password')
    await userEvent.type(await screen.findByLabelText('Email'), 'sokha@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))

    const submit = await screen.findByRole('button', { name: 'Sending…' })
    expect(submit).toBeDisabled()
    expect(submit.closest('form')).toHaveAttribute('aria-busy', 'true')
    held.release()
    await statusWith(/If an account exists/)
  })

  it('says Saving… while the new password is saved', async () => {
    const held = heldResponse()
    server.use(http.post(`${API}/auth/password/reset`, held.resolver))
    renderRoute('/reset-password?token=abc&email=sokha%40example.com')
    await userEvent.type(await screen.findByLabelText('New password'), 'new-password-456')
    await userEvent.click(screen.getByRole('button', { name: 'Save password' }))

    const submit = await screen.findByRole('button', { name: 'Saving…' })
    expect(submit).toBeDisabled()
    held.release()
    await statusWith(/Your password is changed/)
  })

  it('marks the survey busy while it is saved', async () => {
    useSession.getState().signIn(makeTokenResponse(makeUser({ survey_done: false })))
    const held = heldResponse()
    server.use(http.post(`${API}/me/survey`, held.resolver))
    renderRoute('/sign-up/survey')
    await userEvent.click(await screen.findByRole('button', { name: 'Skip for now' }))

    const form = screen.getByRole('button', { name: 'Continue' }).closest('form')
    expect(form).toHaveAttribute('aria-busy', 'true')
    expect(within(form as HTMLElement).getByRole('button', { name: 'Continue' })).toBeDisabled()
    held.release()
  })
})
