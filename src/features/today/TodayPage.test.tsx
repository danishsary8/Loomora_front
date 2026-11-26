import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { localDateIn, toLocalDate } from '@/lib/date'
import { GuestTodoRepository } from '@/lib/storage'
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
    it('shows two equal buttons', async () => {
      await openToday()
      const addTodo = await screen.findByRole('button', { name: 'Add a to-do' })
      const addSchedule = screen.getByRole('button', { name: 'Add to my schedule' })
      expect(addSchedule).toBeEnabled()
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

  it('hides Add subtask when a checked undated parent will leave Today', async () => {
    await repo.create({ title: 'Undated' })
    await openToday()
    const addSubtask = await screen.findByRole('button', { name: /Add subtask to.*Undated/ })
    expect(addSubtask).toBeVisible()
    await userEvent.click(screen.getByText('Undated'))
    expect(screen.getByRole('checkbox', { name: /Undated/ })).toBeChecked()
    expect(addSubtask).not.toBeInTheDocument()
  })

  describe('add a to-do (US-2.1)', () => {
    it('opens the sheet with the title focused, adds the to-do, and hides the empty prompt', async () => {
      await openToday()
      await userEvent.click(await screen.findByRole('button', { name: 'Add a to-do' }))
      const dialog = await screen.findByRole('dialog', { name: 'Add a to-do' })
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

    it('defaults Repeat to None and requires an accessible due date when repeating', async () => {
      await openToday()
      await userEvent.click(await screen.findByRole('button', { name: 'Add a to-do' }))
      const dialog = within(screen.getByRole('dialog'))
      await userEvent.click(dialog.getByRole('button', { name: 'More options' }))
      const repeat = dialog.getByRole('combobox', { name: 'Repeat' })
      expect(repeat).toHaveDisplayValue('None')
      await userEvent.type(dialog.getByLabelText('Title'), 'Gym')
      await userEvent.selectOptions(repeat, 'daily')
      await userEvent.click(dialog.getByRole('button', { name: 'No due date' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Add' }))
      const due = dialog.getByLabelText('Due date')
      expect(due).toHaveAccessibleDescription('Choose a due date for a repeating to-do.')
      expect(due).toHaveFocus()
      expect(await repo.listAll()).toEqual([])
    })

    it('edits a daily rule to selected weekdays and can remove it', async () => {
      const todo = await repo.create({
        title: 'Gym',
        due_date: today,
        repeat_rule: { type: 'daily' },
      })
      await openToday()
      expect(await screen.findByText('Repeats daily')).toBeVisible()
      const edit = screen.getByRole('button', { name: /Edit.*Gym/ })
      await userEvent.click(edit)
      const dialog = within(screen.getByRole('dialog'))
      const repeat = dialog.getByRole('combobox', { name: 'Repeat' })
      expect(repeat).toHaveDisplayValue('Daily')
      await userEvent.selectOptions(repeat, 'weekly')
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))
      expect(dialog.getByText('Choose at least one weekday.')).toBeVisible()
      await userEvent.click(dialog.getByRole('button', { name: 'Sunday' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Monday' }))
      await userEvent.click(dialog.getByRole('button', { name: 'Save' }))
      expect(await screen.findByText('Repeats weekly: Mon, Sun')).toBeVisible()
      expect((await repo.listAll())[0]).toMatchObject({
        id: todo.id,
        repeat_rule: { type: 'weekly', days: [0, 6] },
      })
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await userEvent.click(edit)
      const editDialog = within(screen.getByRole('dialog'))
      expect(editDialog.getByRole('button', { name: 'Monday' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await userEvent.selectOptions(editDialog.getByRole('combobox', { name: 'Repeat' }), 'none')
      await userEvent.click(editDialog.getByRole('button', { name: 'Save' }))
      await waitFor(() =>
        expect(screen.queryByText('Repeats weekly: Mon, Sun')).not.toBeInTheDocument(),
      )
      expect((await repo.listAll())[0]?.repeat_rule).toBeNull()
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: /Add subtask to.*Gym/ }))
      const subtaskDialog = within(screen.getByRole('dialog', { name: 'Add subtask' }))
      expect(subtaskDialog.queryByRole('combobox', { name: 'Repeat' })).not.toBeInTheDocument()
      expect(subtaskDialog.queryByRole('group', { name: 'Remind me' })).not.toBeInTheDocument()
    })

    it('displays a saved reminder locally and can change and remove it', async () => {
      const initial = '2090-11-19T17:01:11.000Z'
      const changed = '2090-11-19T17:15:00.000Z'
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const clock = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      })
      const todo = await repo.create({ title: 'Call', remind_at: initial })
      await openToday()
      const edit = await screen.findByRole('button', { name: /Edit.*Call/ })
      const user = userEvent.setup()
      await user.click(edit)
      let dialog = within(screen.getByRole('dialog'))
      expect(dialog.getByLabelText('Reminder date')).toHaveValue(localDateIn(initial, zone))
      expect(dialog.getByLabelText('Reminder time')).toHaveValue(clock.format(new Date(initial)))
      await user.click(dialog.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect((await repo.listAll())[0]?.remind_at).toBe(initial)

      await user.click(edit)
      dialog = within(screen.getByRole('dialog'))
      fireEvent.change(dialog.getByLabelText('Reminder time'), {
        target: { value: clock.format(new Date(changed)) },
      })
      await user.click(dialog.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect((await repo.listAll())[0]).toMatchObject({ id: todo.id, remind_at: changed })

      await user.click(edit)
      dialog = within(screen.getByRole('dialog'))
      await user.click(dialog.getByRole('button', { name: 'Remove reminder' }))
      expect(dialog.getByLabelText('Reminder date')).toHaveFocus()
      await user.click(dialog.getByRole('button', { name: 'Save' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect((await repo.listAll())[0]?.remind_at).toBeNull()
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

describe('streak badge', () => {
  it('shows 0 at first, then lights up with 1 on the first check-off of the day', async () => {
    await repo.create({ title: 'Read', due_date: today })
    await openToday()
    const badge = await screen.findByTestId('streak-badge')
    expect(badge).toHaveAttribute('data-today-counted', 'false')
    expect(badge).toHaveTextContent('0')

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Mark “Read” done' }))

    await waitFor(() => expect(badge).toHaveAttribute('data-today-counted', 'true'))
    expect(badge).toHaveTextContent('1')
    expect(badge).toHaveAttribute('data-celebrating', 'true')
  })

  it('keeps yesterday’s streak while today is not counted yet', async () => {
    const noonYesterday = new Date()
    noonYesterday.setDate(noonYesterday.getDate() - 1)
    noonYesterday.setHours(12, 0, 0, 0)
    const { db, repo: past } = createTestRepository({ now: () => noonYesterday })
    const old = await past.create({ title: 'Old', due_date: daysAgo(1) })
    await past.setDone(old.id, true)
    repo = new GuestTodoRepository({ db })
    await repo.create({ title: 'Now', due_date: today })

    await openToday()
    const badge = await screen.findByTestId('streak-badge')
    await waitFor(() => expect(badge).toHaveTextContent('1'))
    expect(badge).toHaveAttribute('data-today-counted', 'false')
  })
})

describe('delete with undo (F-022)', () => {
  it('deletes a to-do, shows undo toast, and restores when Undo is clicked', async () => {
    await repo.create({ title: 'Delete me', due_date: today })
    await openToday()
    expect(await screen.findByText('Delete me')).toBeInTheDocument()

    const deleteBtn = screen.getByRole('button', { name: 'Delete “Delete me”' })
    await userEvent.click(deleteBtn)

    expect(screen.queryByText('Delete me')).not.toBeInTheDocument()
    expect(await screen.findByText('Deleted “Delete me”')).toBeInTheDocument()
    const undoBtn = screen.getByRole('button', { name: 'Undo' })
    expect(undoBtn).toBeInTheDocument()

    await userEvent.click(undoBtn)
    expect(await screen.findByText('Delete me')).toBeInTheDocument()
    expect(screen.queryByText('Deleted “Delete me”')).not.toBeInTheDocument()
  })
})

describe('Elemental Today accessibility & interactions (UX-007)', () => {
  it('supports keyboard completion, accessible action targets, and Elemental row styling', async () => {
    const user = userEvent.setup()
    await repo.create({ title: 'Keyboard task', due_date: today, category: 'study' })
    await openToday()

    const listCard = await screen.findByTestId('todo-list-card')
    expect(listCard).toHaveClass('border-border-subtle', 'bg-paper', 'shadow-soft-sm', 'divide-y')
    const row = screen.getByTestId('todo-row')

    const checkbox = screen.getByRole('checkbox', { name: 'Mark “Keyboard task” done' })
    checkbox.focus()
    await user.keyboard(' ')

    await waitFor(() => expect(row).toHaveAttribute('data-done', 'true'))
    expect(row).toHaveClass('bg-paper/70')
    expect(screen.getByText('Done!')).toBeInTheDocument()

    const editBtn = screen.getByRole('button', { name: 'Edit “Keyboard task”' })
    const deleteBtn = screen.getByRole('button', { name: 'Delete “Keyboard task”' })
    expect(editBtn).toHaveClass('size-11')
    expect(deleteBtn).toHaveClass('size-11')
  })
})
