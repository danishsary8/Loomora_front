import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { todayWeekday } from '@/features/schedule/week/weekPlan'
import { toLocalDate } from '@/lib/date'
import { GuestDatabase, GuestScheduleRepository } from '@/lib/storage'
import { createTestRepository, renderRoute } from '@/test/renderRoute'

// The fake clock: Now/Next read the time from `useNow`, so each test just sets it.
const clock = vi.hoisted(() => ({ time: new Date() }))
vi.mock('./useNow', () => ({ useNow: () => clock.time }))

/** Today at the given local time. */
function setClock(hours: number, minutes = 0) {
  clock.time = new Date()
  clock.time.setHours(hours, minutes, 0, 0)
}

const TODAY = toLocalDate()
const TODAY_WEEKDAY = todayWeekday()

let db: GuestDatabase
let schedule: GuestScheduleRepository

beforeEach(() => {
  db = createTestRepository().db
  schedule = new GuestScheduleRepository({ db })
})

afterEach(async () => {
  db.close()
  await db.delete()
})

async function seed() {
  await schedule.create({
    title: 'Lecture',
    start_time: '09:00',
    end_time: '11:00',
    days: [TODAY_WEEKDAY],
  })
  await schedule.create({
    title: 'Lab',
    start_time: '14:00',
    end_time: '15:00',
    days: [TODAY_WEEKDAY],
  })
}

async function openToday() {
  const view = renderRoute('/today', undefined, schedule)
  await screen.findByRole('heading', { level: 1, name: 'Today' })
  return view
}

const strip = () => screen.findByRole('button', { name: 'Open today’s schedule' })

describe('Now/Next strip', () => {
  it('is hidden when nothing is scheduled today', async () => {
    setClock(10, 30)
    await openToday()
    await screen.findByRole('button', { name: 'Add a to-do' })
    expect(screen.queryByRole('button', { name: 'Open today’s schedule' })).not.toBeInTheDocument()
  })

  it('shows the current and the next item', async () => {
    await seed()
    setClock(10, 30)
    await openToday()
    const card = await strip()
    expect(within(card).getByText('Now')).toBeInTheDocument()
    expect(within(card).getByText('Lecture')).toBeInTheDocument()
    expect(within(card).getByText('09:00 to 11:00')).toBeInTheDocument()
    expect(within(card).getByText('Lab')).toBeInTheDocument()
  })

  it('shows Free between items', async () => {
    await seed()
    setClock(12)
    await openToday()
    const card = await strip()
    expect(within(card).getByText('Free')).toBeInTheDocument()
    expect(within(card).getByText('Lab')).toBeInTheDocument()
  })

  it('shows "Nothing more today" after the last item', async () => {
    await seed()
    setClock(16)
    await openToday()
    const card = await strip()
    expect(within(card).getByText('Free')).toBeInTheDocument()
    expect(within(card).getByText('Nothing more today')).toBeInTheDocument()
  })
})

describe('Add to my schedule (empty Today)', () => {
  it('opens the schedule sheet and the strip appears after saving', async () => {
    setClock(10, 30)
    await openToday()
    await userEvent.click(await screen.findByRole('button', { name: 'Add to my schedule' }))
    const sheet = screen.getByRole('dialog', { name: 'Add to my schedule' })
    await userEvent.type(within(sheet).getByLabelText('Title'), 'Study')
    await userEvent.click(
      within(sheet).getByRole('button', {
        name: new Intl.DateTimeFormat('en', { weekday: 'long' }).format(),
      }),
    )
    await userEvent.click(within(sheet).getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
      timeout: 3000,
    })
    expect(await strip()).toBeInTheDocument()
  })
})

describe('full day sheet (S5)', () => {
  it('lists the day in time order and checks items off', async () => {
    await seed()
    setClock(10, 30)
    await openToday()
    await userEvent.click(await strip())

    const sheet = screen.getByRole('dialog', { name: 'Today’s schedule' })
    const [first, second] = within(sheet).getAllByRole('checkbox')
    if (!first || !second) throw new Error('expected two schedule rows')
    expect([first, second].map((b) => b.getAttribute('aria-label'))).toEqual([
      'Mark “Lecture” done',
      'Mark “Lab” done',
    ])

    await userEvent.click(first)
    await waitFor(() => expect(first).toBeChecked())
    const day = await schedule.listForDate(TODAY)
    expect(day.map((o) => [o.title, o.done])).toEqual([
      ['Lecture', true],
      ['Lab', false],
    ])

    await userEvent.click(first)
    await waitFor(() => expect(first).not.toBeChecked())

    // Close the sheet so its exit animation finishes before the test ends.
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
