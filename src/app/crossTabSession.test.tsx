import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from '@/lib/api'
import { toLocalDate } from '@/lib/date'
import { GuestScheduleRepository } from '@/lib/storage'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { createTestRepository, renderRoute } from '@/test/renderRoute'

const today = toLocalDate()

const accountAUser = makeUser({
  id: 'user-a',
  name: 'Account A',
  email: 'a@example.com',
  survey_done: true,
})
const accountA = { ...makeTokenResponse(accountAUser), token: '1|token-a' }

const accountBUser = makeUser({
  id: 'user-b',
  name: 'Account B',
  email: 'b@example.com',
  survey_done: true,
})
const accountB = { ...makeTokenResponse(accountBUser), token: '2|token-b' }

function serializeSession(answer: typeof accountA) {
  return JSON.stringify({
    token: answer.token,
    expiresAt: answer.expires_at,
    user: answer.user,
  })
}

function dispatchCrossTabStorage(next: typeof accountA | null) {
  const newValue = next ? serializeSession(next) : null
  if (newValue) localStorage.setItem('loomora.session', newValue)
  else localStorage.removeItem('loomora.session')
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: 'loomora.session',
      newValue,
      storageArea: localStorage,
    }),
  )
}

function makeTodoRow(id: string, title: string) {
  return {
    id,
    title,
    category: 'work',
    priority: 'normal',
    notes: null,
    parent_id: null,
    repeat_rule: null,
    next_todo_id: null,
    remind_at: null,
    subtasks: [],
    due_date: today,
    done_at: null,
    overdue: false,
    old: false,
    created_at: '2026-11-20T01:00:00Z',
  }
}

describe('Cross-tab session synchronization', () => {
  it('clears authenticated Today UI and preserves guest Dexie data when another tab signs out', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })
    const guestTodo = await repo.create({ title: 'Guest local plan', due_date: today })

    useSession.getState().signIn(accountA)
    server.use(
      http.get(`${API}/todos`, () =>
        HttpResponse.json({ data: [makeTodoRow('a-1', 'Account A secret todo')] }),
      ),
      http.get(`${API}/schedule/day`, () => HttpResponse.json({ date: today, data: [] })),
      http.get(`${API}/streak`, () =>
        HttpResponse.json({ data: { current_streak: 7, longest_streak: 7, today_counted: true } }),
      ),
      http.get(`${API}/days/:date/intention`, () =>
        HttpResponse.json({ data: { date: today, text: 'Account A intention' } }),
      ),
    )

    const view = renderRoute('/today', repo, schedule, db)
    try {
      expect(
        await screen.findByText('Account A secret todo', undefined, { timeout: 4000 }),
      ).toBeInTheDocument()
      expect(await screen.findByDisplayValue('Account A intention')).toBeInTheDocument()
      expect(await screen.findByText('7')).toBeInTheDocument()

      act(() => {
        dispatchCrossTabStorage(null)
      })

      await waitFor(() => {
        expect(screen.queryByText('Account A secret todo')).not.toBeInTheDocument()
      })
      expect(screen.queryByDisplayValue('Account A intention')).not.toBeInTheDocument()
      expect(await screen.findByText('Guest local plan')).toBeInTheDocument()
      expect(await repo.listAll()).toMatchObject([{ id: guestTodo.id, title: 'Guest local plan' }])
    } finally {
      view.unmount()
      await db.delete()
    }
  })

  it('clears Profile account UI on cross-tab sign-out and isolates direct Account A to Account B switches', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })

    useSession.getState().signIn(accountA)
    server.use(
      http.get(`${API}/todos`, ({ request }) => {
        const auth = request.headers.get('Authorization')
        return HttpResponse.json({
          data:
            auth === `Bearer ${accountA.token}`
              ? [makeTodoRow('a-1', 'Account A task')]
              : [makeTodoRow('b-1', 'Account B task')],
        })
      }),
      http.get(`${API}/schedule/day`, () => HttpResponse.json({ date: today, data: [] })),
      http.get(`${API}/streak`, ({ request }) => {
        const auth = request.headers.get('Authorization')
        return HttpResponse.json({
          data:
            auth === `Bearer ${accountA.token}`
              ? { current_streak: 9, longest_streak: 9, today_counted: true }
              : { current_streak: 2, longest_streak: 2, today_counted: false },
        })
      }),
    )

    const view = renderRoute('/profile', repo, schedule, db)
    try {
      expect(await screen.findByText('a@example.com')).toBeInTheDocument()
      expect(await screen.findByText('9 days')).toBeInTheDocument()

      // Switch directly from Account A to Account B via storage event (no intermediate guest render).
      act(() => {
        dispatchCrossTabStorage(accountB)
      })

      expect(await screen.findByText('b@example.com')).toBeInTheDocument()
      expect(screen.queryByText('a@example.com')).not.toBeInTheDocument()
      expect(screen.queryByText('9 days')).not.toBeInTheDocument()
      expect(await screen.findByText('2 days')).toBeInTheDocument()

      // Sign out from another tab -> Profile switches to guest UI immediately.
      act(() => {
        dispatchCrossTabStorage(null)
      })

      expect(await screen.findByText('Data lives on this device only.')).toBeInTheDocument()
      expect(screen.queryByText('b@example.com')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument()
    } finally {
      view.unmount()
      await db.delete()
    }
  })

  it('ignores retired login, survey, logout, and data responses after another tab changes the session', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })

    let releaseLogin!: () => void
    const loginPending = new Promise<void>((resolve) => {
      releaseLogin = resolve
    })
    server.use(
      http.post(`${API}/auth/login`, async () => {
        await loginPending
        return HttpResponse.json(accountA)
      }),
      http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/schedule/day`, () => HttpResponse.json({ date: today, data: [] })),
      http.get(`${API}/streak`, () =>
        HttpResponse.json({ data: { current_streak: 0, longest_streak: 0, today_counted: false } }),
      ),
    )

    const view = renderRoute('/sign-in', repo, schedule, db)
    try {
      const user = userEvent.setup()
      await user.type(await screen.findByLabelText('Email'), 'a@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Sign in' }))

      // Another tab signs in as Account B while Tab A's login request is still pending.
      act(() => {
        dispatchCrossTabStorage(accountB)
      })
      expect(await screen.findByRole('heading', { level: 1, name: 'Today' })).toBeInTheDocument()

      releaseLogin()
      await act(async () => {
        await loginPending
      })
      expect(useSession.getState().token).toBe(accountB.token)
      expect(useSession.getState().user?.id).toBe(accountBUser.id)
    } finally {
      view.unmount()
      await db.delete()
    }
  })

  it('ignores a retired logout response when another tab already switched to Account B', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })
    useSession.getState().signIn(accountA)

    let releaseLogout!: () => void
    const logoutPending = new Promise<void>((resolve) => {
      releaseLogout = resolve
    })
    server.use(
      http.post(`${API}/auth/logout`, async () => {
        await logoutPending
        return new HttpResponse(null, { status: 204 })
      }),
      http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/schedule/day`, () => HttpResponse.json({ date: today, data: [] })),
      http.get(`${API}/streak`, () =>
        HttpResponse.json({ data: { current_streak: 0, longest_streak: 0, today_counted: false } }),
      ),
    )

    const view = renderRoute('/profile', repo, schedule, db)
    try {
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Sign out' }))

      act(() => {
        dispatchCrossTabStorage(accountB)
      })
      expect(await screen.findByText('b@example.com')).toBeInTheDocument()

      releaseLogout()
      await act(async () => {
        await logoutPending
      })
      expect(useSession.getState().token).toBe(accountB.token)
      expect(screen.getByText('b@example.com')).toBeInTheDocument()
    } finally {
      view.unmount()
      await db.delete()
    }
  })

  it('does not leak a retired Account A streak response into Account B', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })
    useSession.getState().signIn(accountA)

    let releaseStreakA!: () => void
    const streakAPending = new Promise<void>((resolve) => {
      releaseStreakA = resolve
    })
    server.use(
      http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/schedule/day`, () => HttpResponse.json({ date: today, data: [] })),
      http.get(`${API}/streak`, async ({ request }) => {
        if (request.headers.get('Authorization') === `Bearer ${accountA.token}`) {
          await streakAPending
          return HttpResponse.json({
            data: { current_streak: 42, longest_streak: 42, today_counted: true },
          })
        }
        return HttpResponse.json({
          data: { current_streak: 1, longest_streak: 1, today_counted: false },
        })
      }),
    )

    const view = renderRoute('/profile', repo, schedule, db)
    try {
      expect(await screen.findByText('a@example.com')).toBeInTheDocument()
      act(() => {
        dispatchCrossTabStorage(accountB)
      })
      expect(await screen.findByText('1 day')).toBeInTheDocument()

      releaseStreakA()
      await act(async () => {
        await streakAPending
      })
      expect(screen.queryByText('42 days')).not.toBeInTheDocument()
      expect(screen.getByText('1 day')).toBeInTheDocument()
    } finally {
      view.unmount()
      await db.delete()
    }
  })

  it('does not trigger duplicate sign-out when logout returns 401 and keeps DeleteAccountSheet closed after sign-out', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })
    useSession.getState().signIn(accountA)

    server.use(
      http.post(`${API}/auth/logout`, () =>
        HttpResponse.json({ message: 'Unauthenticated.' }, { status: 401 }),
      ),
      http.get(`${API}/todos`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/schedule/day`, () => HttpResponse.json({ date: today, data: [] })),
      http.get(`${API}/streak`, () =>
        HttpResponse.json({ data: { current_streak: 0, longest_streak: 0, today_counted: false } }),
      ),
    )

    const view = renderRoute('/profile', repo, schedule, db)
    try {
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Delete my account' }))
      expect(await screen.findByRole('dialog', { name: 'Delete your account' })).toBeInTheDocument()

      // Sign out from another tab closes the delete sheet and keeps it closed on later sign-in.
      act(() => {
        dispatchCrossTabStorage(null)
      })
      expect(await screen.findByText('Data lives on this device only.')).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Delete your account' })).not.toBeInTheDocument()

      act(() => {
        dispatchCrossTabStorage(accountB)
      })
      expect(await screen.findByText('b@example.com')).toBeInTheDocument()
      expect(screen.queryByRole('dialog', { name: 'Delete your account' })).not.toBeInTheDocument()

      const generationBeforeLogout = useSession.getState().generation
      await user.click(screen.getByRole('button', { name: 'Sign out' }))
      expect(await screen.findByRole('link', { name: 'Try it now' })).toBeInTheDocument()
      expect(useSession.getState().token).toBeNull()
      expect(useSession.getState().generation).toBe(generationBeforeLogout + 1)
    } finally {
      view.unmount()
      await db.delete()
    }
  })

  it('ignores a retired survey submission after another tab signs out', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })
    const newUser = makeUser({ id: 'user-a', name: 'New A', survey_done: false })
    useSession.getState().signIn({ ...accountA, user: newUser })

    let releaseSurvey!: () => void
    const surveyPending = new Promise<void>((resolve) => {
      releaseSurvey = resolve
    })
    server.use(
      http.post(`${API}/me/survey`, async () => {
        await surveyPending
        return HttpResponse.json({ data: { ...newUser, survey_done: true } })
      }),
    )

    const view = renderRoute('/sign-up/survey', repo, schedule, db)
    try {
      const user = userEvent.setup()
      await user.click(await screen.findByRole('button', { name: 'Skip for now' }))

      act(() => {
        dispatchCrossTabStorage(null)
      })
      expect(await screen.findByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument()

      releaseSurvey()
      await act(async () => {
        await surveyPending
      })
      expect(useSession.getState().token).toBeNull()
      expect(useSession.getState().user).toBeNull()
    } finally {
      view.unmount()
      await db.delete()
    }
  })
})
