import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession } from '@/lib/api'
import { API, http, HttpResponse, makeTokenResponse, server } from '@/test/apiMocks'
import { createTestRepository, renderRoute } from '@/test/renderRoute'

const now = '2026-11-19T17:01:00.000Z'
const later = '2026-11-19T17:01:30.000Z'
const row = {
  id: 'reminder-1',
  title: 'Call the bank',
  category: 'life',
  priority: 'normal',
  notes: null,
  parent_id: null,
  repeat_rule: null,
  next_todo_id: null,
  remind_at: now,
  due_date: null,
  done_at: null,
  overdue: false,
  old: false,
  subtasks: [],
  created_at: now,
}

describe('root reminder watcher', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows a guest reminder on the next 30-second poll and leaves it mounted on later checks', async () => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(now)
    const { db, repo } = createTestRepository()
    const request = vi.fn(() => HttpResponse.json({ data: [] }))
    server.use(http.get(`${API}/reminders/due`, request))
    await repo.create({ title: 'Future task', remind_at: later })
    const list = vi.spyOn(repo, 'listAll')
    const view = renderRoute('/privacy', repo)
    try {
      await waitFor(() => expect(list).toHaveBeenCalled(), { timeout: 3000 })
      expect(screen.queryByRole('region', { name: 'Reminder' })).not.toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000)
      })
      const banner = await screen.findByRole('region', { name: 'Reminder' })
      expect(banner).toHaveTextContent('Future task')
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000)
      })
      await waitFor(() => expect(list.mock.calls.length).toBeGreaterThanOrEqual(3))
      expect(screen.getByRole('region', { name: 'Reminder' })).toBe(banner)
      expect(request).not.toHaveBeenCalled()
    } finally {
      view.unmount()
      await db.delete()
    }
  })

  it('completes a guest to-do, advances the queue and moves focus to the next reminder', async () => {
    const { db, repo } = createTestRepository()
    const first = await repo.create({ title: 'Earlier task', remind_at: '2026-01-01T00:00:00Z' })
    await repo.create({ title: 'Later task', remind_at: '2026-01-01T00:01:00Z' })
    const view = renderRoute('/today', repo)
    try {
      const banner = await screen.findByRole('region', { name: 'Reminder' })
      expect(banner).toHaveTextContent('Earlier task')
      const check = await screen.findByRole('checkbox', { name: /Earlier task/ })
      await userEvent.click(within(banner).getByRole('button', { name: 'Done' }))
      const next = await screen.findByRole('heading', { name: 'Later task' })
      expect(next).toHaveFocus()
      expect(check).toBeChecked()
      expect(await db.todos.get(first.id)).toMatchObject({ done_at: expect.any(String) })
      await userEvent.click(screen.getByRole('checkbox', { name: /Later task/ }))
      await waitFor(() =>
        expect(screen.queryByRole('region', { name: 'Reminder' })).not.toBeInTheDocument(),
      )
    } finally {
      view.unmount()
      await db.delete()
    }
  })

  it('checks when the tab regains focus and after it becomes visible', async () => {
    useSession.getState().signIn(makeTokenResponse())
    let release = () => {}
    const held = new Promise<void>((resolve) => {
      release = resolve
    })
    let calls = 0
    const visibility = vi.spyOn(document, 'visibilityState', 'get')
    visibility.mockReturnValue('visible')
    server.use(
      http.get(`${API}/reminders/due`, async () => {
        calls += 1
        if (calls === 1) await held
        return HttpResponse.json({ data: calls > 1 ? [row] : [] })
      }),
    )
    const view = renderRoute('/privacy')
    try {
      await waitFor(() => expect(calls).toBe(1))
      act(() => {
        window.dispatchEvent(new Event('focus'))
        window.dispatchEvent(new Event('focus'))
      })
      expect(calls).toBe(1)
      release()
      await waitFor(() => expect(calls).toBe(1))
      visibility.mockReturnValue('hidden')
      act(() => document.dispatchEvent(new Event('visibilitychange')))
      visibility.mockReturnValue('visible')
      act(() => document.dispatchEvent(new Event('visibilitychange')))
      await screen.findByRole('region', { name: 'Reminder' })
      act(() => window.dispatchEvent(new Event('focus')))
      await waitFor(() => expect(calls).toBeGreaterThanOrEqual(3))
    } finally {
      release()
      view.unmount()
      visibility.mockRestore()
    }
  })

  it('keeps an account reminder available after a failed action and can retry it', async () => {
    useSession.getState().signIn(makeTokenResponse())
    let dismissed = false
    let attempts = 0
    server.use(
      http.get(`${API}/reminders/due`, () => HttpResponse.json({ data: dismissed ? [] : [row] })),
      http.post(`${API}/todos/${row.id}/reminder/dismiss`, () => {
        attempts += 1
        if (attempts === 1) {
          return HttpResponse.json({ message: 'Private backend details' }, { status: 503 })
        }
        dismissed = true
        return HttpResponse.json({ data: row })
      }),
    )
    renderRoute('/privacy')
    const user = userEvent.setup()
    const dismiss = await screen.findByRole('button', { name: 'Dismiss' })
    await user.click(dismiss)
    expect(await screen.findByRole('alert')).not.toHaveTextContent('Private backend details')
    expect(screen.getByRole('region', { name: 'Reminder' })).toHaveTextContent(row.title)
    await user.click(dismiss)
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Reminder' })).not.toBeInTheDocument(),
    )
    expect(attempts).toBe(2)
  })
})
