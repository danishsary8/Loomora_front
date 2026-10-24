import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toLocalDate } from '@/lib/date'
import type { GuestTodoRepository } from '@/lib/storage'
import { createTestRepository, renderRoute } from '@/test/renderRoute'

let repo: GuestTodoRepository
const today = toLocalDate()

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalDate(d)
}

beforeEach(() => {
  repo = createTestRepository().repo
})

async function openToday() {
  const view = renderRoute('/today', repo)
  await screen.findByRole('heading', { level: 1, name: 'Today' })
  return view
}

describe('Today screen', () => {
  describe('empty (S2, US-1.2)', () => {
    it('shows two equal buttons, with "Add to my schedule" disabled for now', async () => {
      await openToday()
      const addTodo = await screen.findByRole('button', { name: 'Add a to-do' })
      const addSchedule = screen.getByRole('button', { name: 'Add to my schedule' })
      expect(addSchedule).toBeDisabled()
      // Equal weight (D26): same size classes.
      expect(addTodo.className).toContain('min-h-[52px]')
      expect(addSchedule.className).toContain('min-h-[52px]')
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    })

    it('shows the date in the header', async () => {
      await openToday()
      const expected = new Intl.DateTimeFormat('en', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(new Date())
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })

  describe('add a to-do (US-2.1)', () => {
    it('opens the sheet with the title focused, adds the to-do, and hides the empty prompt', async () => {
      await openToday()
      await userEvent.click(await screen.findByRole('button', { name: 'Add a to-do' }))
      const dialog = screen.getByRole('dialog', { name: 'Add a to-do' })
      const title = within(dialog).getByLabelText('Title')
      expect(title).toHaveFocus()

      await userEvent.type(title, 'Read chapter 3')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }))

      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findByText('Read chapter 3')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Add to my schedule' })).not.toBeInTheDocument()
      expect(screen.getByRole('progressbar', { name: '0 of 1 done' })).toBeInTheDocument()
    })

    it('defaults the due date to today and saves category when picked', async () => {
      await openToday()
      await userEvent.click(await screen.findByRole('button', { name: 'Add a to-do' }))
      const dialog = screen.getByRole('dialog')
      expect(within(dialog).getByLabelText('Due date (optional)')).toHaveValue(today)
      await userEvent.type(within(dialog).getByLabelText('Title'), 'Gym')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Health' }))
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
      await screen.findByText('Gym')

      const [saved] = await repo.listForDate(today)
      expect(saved).toMatchObject({ title: 'Gym', due_date: today, category: 'health' })
    })

    it('can add a to-do with no due date', async () => {
      await openToday()
      await userEvent.click(await screen.findByRole('button', { name: 'Add a to-do' }))
      const dialog = screen.getByRole('dialog')
      await userEvent.type(within(dialog).getByLabelText('Title'), 'Someday')
      await userEvent.click(within(dialog).getByRole('button', { name: 'No due date' }))
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
      await screen.findByText('Someday')
      expect((await repo.listForDate(today))[0]).toMatchObject({
        due_date: null,
        category: 'other',
      })
    })

    it('asks for a title instead of saving an empty one', async () => {
      await openToday()
      await userEvent.click(await screen.findByRole('button', { name: 'Add a to-do' }))
      const dialog = screen.getByRole('dialog')
      await userEvent.type(within(dialog).getByLabelText('Title'), '   ')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
      expect(within(dialog).getByLabelText('Title')).toHaveAccessibleDescription(
        'Please enter a title.',
      )
      expect(await repo.listForDate(today)).toEqual([])
    })

    it('adds from the floating + once the list has items', async () => {
      await repo.create({ title: 'First', due_date: today })
      await openToday()
      await screen.findByText('First')
      await userEvent.click(screen.getByRole('button', { name: 'Add a to-do' }))
      expect(screen.getByRole('dialog', { name: 'Add a to-do' })).toBeInTheDocument()
    })
  })

  describe('check off (US-2.2)', () => {
    it('marks done with a stamp, updates the ring, and undoes on a second tap', async () => {
      await repo.create({ title: 'Read', due_date: today })
      await repo.create({ title: 'Run', due_date: today })
      await openToday()

      const box = await screen.findByRole('checkbox', { name: 'Mark “Read” done' })
      expect(screen.getByRole('progressbar', { name: '0 of 2 done' })).toBeInTheDocument()

      await userEvent.click(box)
      expect(box).toBeChecked()
      expect(await screen.findByText('Done!')).toBeInTheDocument()
      expect(screen.getByRole('progressbar', { name: '1 of 2 done' })).toBeInTheDocument()
      await waitFor(async () =>
        expect(
          (await repo.listForDate(today)).find((t) => t.title === 'Read')?.done_at,
        ).not.toBeNull(),
      )

      await userEvent.click(box)
      expect(box).not.toBeChecked()
      expect(screen.getByRole('progressbar', { name: '0 of 2 done' })).toBeInTheDocument()
      await waitFor(() => expect(screen.queryByText('Done!')).not.toBeInTheDocument())
      await waitFor(async () =>
        expect((await repo.listForDate(today)).find((t) => t.title === 'Read')?.done_at).toBeNull(),
      )
    })

    it('rolls the check back if saving fails', async () => {
      await repo.create({ title: 'Flaky', due_date: today })
      vi.spyOn(repo, 'setDone').mockRejectedValueOnce(new Error('disk full'))
      await openToday()
      const box = await screen.findByRole('checkbox', { name: 'Mark “Flaky” done' })
      await userEvent.click(box)
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not save')
      await waitFor(() => expect(box).not.toBeChecked())
    })
  })

  describe('Overdue (US-2.4)', () => {
    it('lists overdue items first with an Overdue badge, and Old after 30 days', async () => {
      await repo.create({ title: 'Today item', due_date: today })
      await repo.create({ title: 'Yesterday item', due_date: daysAgo(1) })
      await repo.create({ title: 'Ancient item', due_date: daysAgo(45) })
      await openToday()

      await screen.findByText('Today item')
      const rows = screen.getAllByTestId('todo-row')
      expect(rows.map((r) => within(r).getByRole('checkbox').getAttribute('aria-label'))).toEqual([
        'Mark “Ancient item” done',
        'Mark “Yesterday item” done',
        'Mark “Today item” done',
      ])
      expect(within(rows[0] as HTMLElement).getByText('Overdue')).toBeInTheDocument()
      expect(within(rows[0] as HTMLElement).getByText('Old')).toBeInTheDocument()
      expect(within(rows[1] as HTMLElement).getByText('Overdue')).toBeInTheDocument()
      expect(within(rows[1] as HTMLElement).queryByText('Old')).not.toBeInTheDocument()
      expect(within(rows[2] as HTMLElement).queryByText('Overdue')).not.toBeInTheDocument()
    })
  })

  it('shows an error with retry when loading fails', async () => {
    vi.spyOn(repo, 'listForDate').mockRejectedValue(new Error('boom'))
    renderRoute('/today', repo)
    expect(await screen.findByRole('alert', {}, { timeout: 4000 })).toHaveTextContent(
      'Something went wrong',
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })
})
