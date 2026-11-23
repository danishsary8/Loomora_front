import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/queryClient'
import { GuestDatabase } from '@/lib/storage/db'
import { GuestTodoRepository } from '@/lib/storage'
import type { Todo } from '@/features/todos/types'
import { AddTodoSheet, type TodoSheetTarget } from './AddTodoSheet'

const TODAY = '2026-10-26'

let db: GuestDatabase
let repo: GuestTodoRepository

beforeEach(() => {
  db = new GuestDatabase(`test-${crypto.randomUUID()}`)
  repo = new GuestTodoRepository({ db, now: () => new Date('2026-10-26T08:00:00.000Z') })
})

afterEach(async () => {
  await db.delete()
})

function renderSheet(target: TodoSheetTarget, onClose = vi.fn()) {
  return render(
    <AppProviders todoRepository={repo} queryClient={createQueryClient()}>
      <AddTodoSheet open onClose={onClose} today={TODAY} target={target} />
    </AppProviders>,
  )
}

describe('AddTodoSheet progressive disclosure & accessibility', () => {
  it('starts with advanced fields collapsed on quick add and tracks active count', async () => {
    renderSheet({ type: 'create' })
    const dialog = within(screen.getByRole('dialog', { name: 'Add a to-do' }))

    expect(dialog.getByLabelText('Title')).toHaveFocus()
    expect(dialog.getByLabelText('Due date (optional)')).toBeVisible()
    expect(dialog.getByRole('button', { name: 'Study' })).toBeVisible()

    const toggle = dialog.getByRole('button', { name: 'More options' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(dialog.queryByLabelText('Priority')).not.toBeInTheDocument()
    expect(dialog.queryByLabelText('Notes')).not.toBeInTheDocument()

    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Hide options')
    expect(dialog.getByLabelText('Priority')).toBeVisible()
    expect(dialog.getByLabelText('Notes')).toBeVisible()
    expect(dialog.getByRole('combobox', { name: 'Repeat' })).toBeVisible()

    await userEvent.selectOptions(dialog.getByLabelText('Priority'), 'high')
    await userEvent.type(dialog.getByLabelText('Notes'), 'Bring notebook')
    await userEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAccessibleName('More options (2)')
  })

  it('auto-opens advanced options when editing a to-do that already has advanced fields', () => {
    const existing: Todo = {
      id: 'todo-1',
      title: 'Review lecture',
      done_at: null,
      due_date: TODAY,
      category: 'study',
      parent_id: null,
      priority: 'high',
      notes: 'Chapter 4',
      repeat_rule: null,
      remind_at: null,
      next_todo_id: null,
      created_at: '2026-10-26T08:00:00.000Z',
      updated_at: '2026-10-26T08:00:00.000Z',
    }
    renderSheet({ type: 'edit', todo: existing })
    const dialog = within(screen.getByRole('dialog', { name: 'Edit to-do' }))

    expect(dialog.getByRole('button', { name: 'Hide options' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(dialog.getByLabelText('Priority')).toHaveValue('high')
    expect(dialog.getByLabelText('Notes')).toHaveValue('Chapter 4')
  })

  it('shows priority and notes directly when adding a subtask', () => {
    const parent: Todo = {
      id: 'parent-1',
      title: 'Project',
      done_at: null,
      due_date: TODAY,
      category: 'work',
      parent_id: null,
      priority: 'normal',
      notes: null,
      repeat_rule: null,
      remind_at: null,
      next_todo_id: null,
      created_at: '2026-10-26T08:00:00.000Z',
      updated_at: '2026-10-26T08:00:00.000Z',
    }
    renderSheet({ type: 'subtask', parent })
    const dialog = within(screen.getByRole('dialog', { name: 'Add subtask' }))

    expect(dialog.queryByRole('button', { name: /More options/i })).not.toBeInTheDocument()
    expect(dialog.getByLabelText('Priority')).toBeVisible()
    expect(dialog.getByLabelText('Notes')).toBeVisible()
  })
})
