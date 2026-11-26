import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSession, type StatsSummary } from '@/lib/api'
import { toLocalDate } from '@/lib/date'
import { GuestScheduleRepository } from '@/lib/storage'
import { GuestFocusSessionRepository } from '@/lib/storage/GuestFocusSessionRepository'
import { API, http, HttpResponse, makeTokenResponse, makeUser, server } from '@/test/apiMocks'
import { createTestRepository, renderRoute } from '@/test/renderRoute'
import { addDaysLocalDate, weekBoundsForDate } from './computeStatsSummary'

const today = toLocalDate()

function makeAccountSummary(from: string, to: string): StatsSummary {
  return {
    days: [
      {
        local_date: from,
        focus_ms: 1_500_000,
        break_ms: 300_000,
        sessions: 2,
        todos_done: 3,
        todos_due: 4,
        planned_block_minutes: 90,
        blocks_checked: 1,
        focus_ms_linked: 1_200_000,
        focus_ms_unplanned: 300_000,
      },
      ...(to !== from
        ? [
            {
              local_date: to,
              focus_ms: 0,
              break_ms: 0,
              sessions: 0,
              todos_done: 0,
              todos_due: 0,
              planned_block_minutes: 0,
              blocks_checked: 0,
              focus_ms_linked: 0,
              focus_ms_unplanned: 0,
            },
          ]
        : []),
    ],
    totals: {
      focus_ms: 1_500_000,
      break_ms: 300_000,
      sessions: 2,
      todos_done: 3,
      todos_due: 4,
      planned_block_minutes: 90,
      blocks_checked: 1,
      focus_ms_linked: 1_200_000,
      focus_ms_unplanned: 300_000,
    },
    by_mode: {
      countdown: 1_200_000,
      stopwatch: 300_000,
    },
  }
}

describe('InsightsPage (F-R4-01)', () => {
  it('shows empty state for a guest with no activity', async () => {
    const { db, repo } = createTestRepository()
    renderRoute('/insights', repo, new GuestScheduleRepository({ db }), db)

    expect(await screen.findByRole('heading', { level: 1, name: 'Insights' })).toBeInTheDocument()
    expect(await screen.findByText('No activity in this range yet')).toBeInTheDocument()
  })

  it('computes guest analytics, Weekly Recap, and Plan vs Reality from local data', async () => {
    const { db, repo } = createTestRepository()
    const schedule = new GuestScheduleRepository({ db })
    const focusRepo = new GuestFocusSessionRepository({ db })

    const todo = await repo.create({ title: 'Finish lab', due_date: today })
    await repo.setDone(todo.id, true)
    await repo.create({ title: 'Open task', due_date: today })

    const startedAt = `${today}T09:00:00.000Z`
    const endedAt = `${today}T09:25:00.000Z`
    await focusRepo.record({
      id: crypto.randomUUID(),
      mode: 'countdown',
      started_at: startedAt,
      ended_at: endedAt,
      end_reason: 'completed',
      planned_focus_ms: 1_500_000,
      todo_id: todo.id,
      label: 'Finish lab',
      segments: [{ type: 'focus', started_at: startedAt, ended_at: endedAt, active_ms: 1_500_000 }],
    })

    renderRoute('/insights', repo, schedule, db)

    expect(await screen.findByRole('heading', { name: 'Weekly recap' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plan vs reality' })).toBeInTheDocument()
    expect(screen.getByText('1 done / 2 due')).toBeInTheDocument()
    expect(screen.getByText('Linked to plan: 25 min')).toBeInTheDocument()
    expect(screen.getByText('Unplanned focus: 0 min')).toBeInTheDocument()
    expect(screen.getByText('Countdown: 25 min')).toBeInTheDocument()
    expect(screen.getByText('1 to-do')).toBeInTheDocument()

    // Navigate to previous week (empty) and back to current week.
    await userEvent.click(screen.getByRole('button', { name: 'Previous week' }))
    expect(await screen.findByText('No activity in this range yet')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next week' }))
    expect(await screen.findByRole('heading', { name: 'Weekly recap' })).toBeInTheDocument()

    // Switch to 30 days preset (hides Weekly Recap card, keeps Plan vs Reality, pluralizes active day).
    await userEvent.click(screen.getByRole('button', { name: '30 days' }))
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Weekly recap' })).not.toBeInTheDocument(),
    )
    expect(screen.getByText('Showing 1 active day out of 30.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Plan vs reality' })).toBeInTheDocument()
  })

  it('loads account stats from GET /stats/summary, displays longest streak, and recovers from errors', async () => {
    const user = makeUser({ survey_done: true, timezone: 'UTC', week_starts_on: 1 })
    useSession.getState().signIn(makeTokenResponse(user))
    const bounds = weekBoundsForDate(toLocalDate(new Date(), 'UTC'), 1)
    let shouldFail = true
    const queries: Array<{ from: string | null; to: string | null }> = []

    server.use(
      http.get(`${API}/reminders/due`, () => HttpResponse.json({ data: [] })),
      http.get(`${API}/streak`, () =>
        HttpResponse.json({
          data: { current_streak: 4, longest_streak: 12, today_counted: true },
        }),
      ),
      http.get(`${API}/stats/summary`, ({ request }) => {
        const url = new URL(request.url)
        queries.push({ from: url.searchParams.get('from'), to: url.searchParams.get('to') })
        if (shouldFail) {
          return HttpResponse.json({ message: 'Server error' }, { status: 500 })
        }
        return HttpResponse.json({
          data: makeAccountSummary(
            url.searchParams.get('from') ?? bounds.from,
            url.searchParams.get('to') ?? bounds.to,
          ),
        })
      }),
    )

    renderRoute('/insights')

    // Error state appears first, then Try again succeeds.
    expect(
      await screen.findByText('Loomora is having trouble right now. Please try again in a moment.'),
    ).toBeInTheDocument()
    shouldFail = false
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('3 done / 4 due')).toBeInTheDocument()
    expect(screen.getByText('Linked to plan: 20 min')).toBeInTheDocument()
    expect(screen.getByText('Unplanned focus: 5 min')).toBeInTheDocument()
    expect(screen.getByText('1 block')).toBeInTheDocument()
    expect(screen.getByText('Longest: 12')).toBeInTheDocument()
    expect(queries[0]).toEqual({ from: bounds.from, to: bounds.to })

    // Switching to 90 days sends a valid 90-day range within the 92-day limit.
    const countBeforeRangeSwitch = queries.length
    await userEvent.click(screen.getByRole('button', { name: '90 days' }))
    await waitFor(() => expect(queries.length).toBeGreaterThan(countBeforeRangeSwitch))
    const last = queries.at(-1)
    const utcToday = toLocalDate(new Date(), 'UTC')
    expect(last).toEqual({ from: addDaysLocalDate(utcToday, -89), to: utcToday })
  })
})
