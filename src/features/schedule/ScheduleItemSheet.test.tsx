import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { AppProviders } from '@/app/AppProviders'
import { createQueryClient } from '@/app/queryClient'
import { GuestDatabase, GuestScheduleRepository, useScheduleRepository } from '@/lib/storage'
import { ScheduleItemSheet, type ScheduleTarget } from './ScheduleItemSheet'
import { scheduleKeys, useScheduleDay } from './useSchedule'
import { useUndoableDelete } from './useUndoableDelete'
import { UndoDeleteToast } from './UndoDeleteToast'

// 2026-10-26 is a Monday; 2026-11-02 is the next one.
const MON = '2026-10-26'
const NEXT_MON = '2026-11-02'
const UNDO_MS = 200

let repo: GuestScheduleRepository
let db: GuestDatabase

beforeEach(() => {
  db = new GuestDatabase(`test-${crypto.randomUUID()}`)
  repo = new GuestScheduleRepository({ db, now: () => new Date('2026-10-20T08:00:00.000Z') })
})

afterEach(async () => {
  await db.delete()
})

/** Stands in for the Week and Today screens, which come in F-009 and F-010. */
function Host() {
  const itemsRepo = useScheduleRepository()
  const { data: items = [] } = useQuery({
    queryKey: [...scheduleKeys.all, 'items'],
    queryFn: () => itemsRepo.listItems(),
  })
  const day = useScheduleDay(MON)
  const [target, setTarget] = useState<ScheduleTarget | null>(null)
  const [last, setLast] = useState<ScheduleTarget>({ type: 'create' })
  const del = useUndoableDelete(UNDO_MS)

  function open(next: ScheduleTarget) {
    setLast(next)
    setTarget(next)
  }
  const visible = (day.data ?? []).filter(
    (o) =>
      !(
        del.pending &&
        del.pending.item.id === o.schedule_item_id &&
        (del.pending.scope === 'all' || del.pending.date === o.date)
      ),
  )

  return (
    <>
      <button onClick={() => open({ type: 'create' })}>open add</button>
      <ul aria-label="Monday">
        {visible.map((o) => {
          const item = items.find((i) => i.id === o.schedule_item_id)
          if (!item) return null
          return (
            <li key={o.schedule_item_id}>
              <span>
                {o.title} {o.start_time}-{o.end_time}
              </span>
              <button onClick={() => open({ type: 'occurrence', item, occurrence: o })}>
                edit today {o.title}
              </button>
              <button onClick={() => open({ type: 'item', item })}>edit week {o.title}</button>
            </li>
          )
        })}
      </ul>
      <ScheduleItemSheet
        open={target !== null}
        onClose={() => setTarget(null)}
        target={last}
        onDelete={(request) => void del.request(request)}
      />
      <UndoDeleteToast pending={del.pending} onUndo={del.undo} />
    </>
  )
}

async function setup(seed: Parameters<GuestScheduleRepository['create']>[0][] = []) {
  for (const input of seed) await repo.create(input)
  render(
    <AppProviders scheduleRepository={repo} queryClient={createQueryClient()}>
      <Host />
    </AppProviders>,
  )
}

const math = {
  title: 'Math',
  start_time: '09:00',
  end_time: '10:00',
  days: [0, 2] as never,
  category: 'study' as const,
  starts_on: '2026-10-01',
}

async function fillTitle(dialog: HTMLElement, title: string) {
  const field = within(dialog).getByLabelText('Title')
  await userEvent.clear(field)
  await userEvent.type(field, title)
}

describe('add a schedule item', () => {
  it('creates one item for several days at once, with a category', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'open add' }))
    const dialog = screen.getByRole('dialog', { name: 'Add to my schedule' })
    await fillTitle(dialog, 'Gym')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Monday' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Tuesday' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Health' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(await screen.findByText('Gym 09:00-10:00')).toBeInTheDocument()
    const items = await repo.listItems()
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ title: 'Gym', days: [0, 1], category: 'health' })
  })

  it('shows translated messages for a missing title, no days and a bad time range', async () => {
    await setup()
    await userEvent.click(screen.getByRole('button', { name: 'open add' }))
    const dialog = screen.getByRole('dialog', { name: 'Add to my schedule' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(within(dialog).getByText('Please enter a title.')).toBeInTheDocument()
    expect(within(dialog).getByText('Pick at least one day.')).toBeInTheDocument()

    fireEvent.change(within(dialog).getByLabelText('Starts'), { target: { value: '11:00' } })
    fireEvent.change(within(dialog).getByLabelText('Ends'), { target: { value: '10:00' } })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add' }))
    expect(within(dialog).getByText('End time must be after start time.')).toBeInTheDocument()
    expect(await repo.listItems()).toEqual([])
  })
})

describe('edit from Week (all repeats)', () => {
  it('opens the form directly and changes every repeat', async () => {
    await setup([math])
    await userEvent.click(await screen.findByRole('button', { name: 'edit week Math' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit schedule item' })
    expect(within(dialog).queryByText('Only today')).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Monday' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await fillTitle(dialog, 'Physics')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Physics 09:00-10:00')).toBeInTheDocument()
    expect((await repo.listForDate(NEXT_MON))[0]?.title).toBe('Physics')
  })
})

describe('edit from Today', () => {
  it('"Only today" shows title and times only, and changes that date only', async () => {
    await setup([math])
    await userEvent.click(await screen.findByRole('button', { name: 'edit today Math' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit schedule item' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Only today' }))
    expect(within(dialog).queryByRole('button', { name: 'Monday' })).not.toBeInTheDocument()
    await fillTitle(dialog, 'Math exam')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Math exam 09:00-10:00')).toBeInTheDocument()
    expect((await repo.listForDate(NEXT_MON))[0]).toMatchObject({
      title: 'Math',
      overridden: false,
    })
    expect((await repo.listItems())[0]?.title).toBe('Math')
  })

  it('"All repeats" opens the full form and changes every repeat', async () => {
    await setup([math])
    await userEvent.click(await screen.findByRole('button', { name: 'edit today Math' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit schedule item' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'All repeats' }))
    expect(within(dialog).getByRole('button', { name: 'Monday' })).toBeInTheDocument()
    await fillTitle(dialog, 'Physics')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Physics 09:00-10:00')).toBeInTheDocument()
    expect((await repo.listForDate(NEXT_MON))[0]?.title).toBe('Physics')
  })

  it('cancel closes the choice without changing anything', async () => {
    await setup([math])
    await userEvent.click(await screen.findByRole('button', { name: 'edit today Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect((await repo.listItems())[0]?.title).toBe('Math')
  })

  it('reopens at the choice step after closing', async () => {
    await setup([math])
    const trigger = await screen.findByRole('button', { name: 'edit today Math' })
    await userEvent.click(trigger)
    await userEvent.click(screen.getByRole('button', { name: 'Only today' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'edit today Math' }))
    expect(screen.getByRole('button', { name: 'All repeats' })).toBeInTheDocument()
  })
})

describe('delete with a 5-second undo', () => {
  it('from Week deletes all repeats after the undo window', async () => {
    await setup([math])
    await userEvent.click(await screen.findByRole('button', { name: 'edit week Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('Deleted “Math”')).toBeInTheDocument()
    expect(screen.queryByText('Math 09:00-10:00')).not.toBeInTheDocument()
    expect(await repo.listItems()).toHaveLength(1) // not written yet
    await waitFor(async () => expect(await repo.listItems()).toEqual([]))
    await waitFor(() => expect(screen.queryByText('Deleted “Math”')).not.toBeInTheDocument())
  })

  it('Undo brings the item back and writes nothing', async () => {
    await setup([math])
    await userEvent.click(await screen.findByRole('button', { name: 'edit week Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Undo' }))

    expect(await screen.findByText('Math 09:00-10:00')).toBeInTheDocument()
    await new Promise((resolve) => setTimeout(resolve, UNDO_MS * 2))
    expect(await repo.listItems()).toHaveLength(1)
    expect(screen.getByText('Math 09:00-10:00')).toBeInTheDocument()
  })

  it('from Today "Only today" skips that date only', async () => {
    await setup([math])
    await userEvent.click(await screen.findByRole('button', { name: 'edit today Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'Only today' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Only today' }))

    await waitFor(async () => expect(await repo.listForDate(MON)).toEqual([]))
    expect(await repo.listForDate(NEXT_MON)).toHaveLength(1)
    expect(await repo.listItems()).toHaveLength(1)
  })

  it('from Today "All repeats" removes the item', async () => {
    await setup([math])
    await userEvent.click(await screen.findByRole('button', { name: 'edit today Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'All repeats' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'All repeats' }))

    await waitFor(async () => expect(await repo.listItems()).toEqual([]))
  })

  it('commits a pending delete at once when a second delete starts', async () => {
    const second = { ...math, title: 'Gym', start_time: '17:00', end_time: '18:00' }
    await setup([math, second])
    await userEvent.click(await screen.findByRole('button', { name: 'edit week Math' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(await screen.findByRole('button', { name: 'edit week Gym' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(async () => expect(await repo.listItems()).toEqual([]))
  })
})
