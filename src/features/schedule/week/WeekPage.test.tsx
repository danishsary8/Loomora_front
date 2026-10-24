import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuestDatabase, GuestScheduleRepository } from '@/lib/storage'
import { createTestRepository, renderRoute } from '@/test/renderRoute'
import type { Weekday } from '../types'

let schedule: GuestScheduleRepository
let db: GuestDatabase

beforeEach(() => {
  db = createTestRepository().db
  schedule = new GuestScheduleRepository({ db })
})

afterEach(async () => {
  await db.delete()
})

async function openWeek() {
  renderRoute('/week', undefined, schedule)
  await screen.findByRole('heading', { level: 1, name: 'Week' })
}

const day = (name: string) => screen.getByRole('region', { name })

async function seed(title: string, days: Weekday[], start = '09:00', end = '10:00') {
  return schedule.create({ title, start_time: start, end_time: end, days })
}

describe('Week screen', () => {
  it('shows an empty state with an add button', async () => {
    await openWeek()
    expect(await screen.findByText('Build your week')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add to my schedule' }))
    expect(await screen.findByRole('dialog', { name: 'Add to my schedule' })).toBeInTheDocument()
  })

  it('lists each item under every day it repeats on, earliest first', async () => {
    await seed('Lecture', [0, 2], '10:00', '11:00')
    await seed('Gym', [0], '07:00', '08:00')
    await openWeek()
    const monday = await screen.findByRole('region', { name: 'Monday' })
    const buttons = within(monday).getAllByRole('button', { name: /^Edit / })
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Edit Gym, 07:00 to 08:00',
      'Edit Lecture, 10:00 to 11:00',
    ])
    expect(within(day('Wednesday')).getByText('Lecture')).toBeInTheDocument()
    expect(within(day('Tuesday')).getByText('Nothing planned.')).toBeInTheDocument()
  })

  it('adds an item for several days with the + button', async () => {
    await seed('Existing', [4])
    await openWeek()
    await userEvent.click(await screen.findByRole('button', { name: 'Add to my schedule' }))
    const sheet = screen.getByRole('dialog')
    await userEvent.type(within(sheet).getByLabelText('Title'), 'Class')
    for (const name of ['Monday', 'Tuesday', 'Wednesday']) {
      await userEvent.click(within(sheet).getByRole('button', { name }))
    }
    await userEvent.click(within(sheet).getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    for (const name of ['Monday', 'Tuesday', 'Wednesday']) {
      expect(await within(day(name)).findByText('Class')).toBeInTheDocument()
    }
    expect(within(day('Thursday')).queryByText('Class')).not.toBeInTheDocument()
  })

  it('edits all repeats when an item is tapped', async () => {
    await seed('Lecture', [0, 1])
    await openWeek()
    await userEvent.click(
      await within(await findDay('Monday')).findByRole('button', { name: /Lecture/ }),
    )
    const sheet = screen.getByRole('dialog', { name: 'Edit schedule item' })
    const title = within(sheet).getByLabelText('Title')
    await userEvent.clear(title)
    await userEvent.type(title, 'Seminar')
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }))
    expect(await within(day('Tuesday')).findByText('Seminar')).toBeInTheDocument()
    expect(within(day('Monday')).getByText('Seminar')).toBeInTheDocument()
  })

  it('deletes an item with a 5-second undo window', async () => {
    await seed('Lecture', [0])
    await openWeek()
    await userEvent.click(
      await within(await findDay('Monday')).findByRole('button', { name: /Lecture/ }),
    )
    await userEvent.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }),
    )
    expect(await screen.findByText('Deleted “Lecture”')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Edit Lecture/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(await screen.findByRole('button', { name: /^Edit Lecture/ })).toBeInTheDocument()
    expect(await schedule.listItems()).toHaveLength(1)
  })

  describe('Copy day to...', () => {
    it('copies a day onto the chosen days', async () => {
      await seed('Lecture', [0])
      await seed('Gym', [0, 2])
      await openWeek()
      await userEvent.click(await screen.findByRole('button', { name: 'Copy Monday to…' }))
      const sheet = screen.getByRole('dialog', { name: 'Copy Monday to…' })
      const copy = within(sheet).getByRole('button', { name: 'Copy' })
      expect(copy).toBeDisabled()
      expect(within(sheet).queryByRole('button', { name: 'Monday' })).not.toBeInTheDocument()
      await userEvent.click(within(sheet).getByRole('button', { name: 'Tuesday' }))
      await userEvent.click(within(sheet).getByRole('button', { name: 'Friday' }))
      await userEvent.click(copy)
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      for (const name of ['Tuesday', 'Friday']) {
        expect(await within(day(name)).findByText('Lecture')).toBeInTheDocument()
        expect(within(day(name)).getByText('Gym')).toBeInTheDocument()
      }
      expect(within(day('Wednesday')).queryByText('Lecture')).not.toBeInTheDocument()
    })

    it('is offered only on days that have items', async () => {
      await seed('Lecture', [0])
      await openWeek()
      await screen.findByRole('region', { name: 'Monday' })
      expect(screen.getAllByRole('button', { name: /^Copy .* to…$/ })).toHaveLength(1)
    })
  })

  describe('phone layout', () => {
    it('has a day strip, today selected, and a week overview toggle', async () => {
      await seed('Lecture', [0])
      await openWeek()
      const strip = await screen.findByRole('group', { name: 'Days of the week' })
      const pressed = within(strip).getAllByRole('button', { pressed: true })
      expect(pressed).toHaveLength(1)
      await userEvent.click(within(strip).getByRole('button', { name: 'Tuesday' }))
      expect(within(strip).getByRole('button', { name: 'Tuesday' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      const toggle = screen.getByRole('button', { name: 'Week overview' })
      await userEvent.click(toggle)
      expect(screen.getByRole('button', { name: 'Single day' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
  })
})

function findDay(name: string) {
  return screen.findByRole('region', { name })
}
