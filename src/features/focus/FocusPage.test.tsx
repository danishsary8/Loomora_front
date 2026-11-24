import { webcrypto } from 'node:crypto'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { GuestDatabase } from '@/lib/storage/db'
import { FocusPage } from './FocusPage'
import { FocusRuntime } from './focusRuntime'

let db: GuestDatabase

beforeEach(() => {
  vi.stubGlobal('crypto', webcrypto)
  db = new GuestDatabase(crypto.randomUUID())
})

afterEach(async () => {
  await db.delete()
  vi.unstubAllGlobals()
})

function openFocus() {
  return render(
    <AppProviders guestDatabase={db}>
      <FocusPage />
    </AppProviders>,
  )
}

it('validates whole minutes and preserves keyboard focus through start and pause', async () => {
  const user = userEvent.setup()
  openFocus()
  const presets = await screen.findByRole('group', { name: 'Countdown duration' })
  const first = within(presets).getByRole('radio', { name: '25 min', checked: true })
  expect(within(presets).getAllByRole('radio')).toHaveLength(4)
  expect(screen.getByRole('timer')).toHaveTextContent('25:00')
  first.focus()
  await user.keyboard('{ArrowRight}')
  expect(within(presets).getByRole('radio', { name: '50 min', checked: true })).toHaveFocus()
  expect(screen.getByRole('timer')).toHaveTextContent('50:00')
  await user.keyboard('{ArrowRight}')
  expect(within(presets).getByRole('radio', { name: '90 min', checked: true })).toHaveFocus()
  expect(screen.getByRole('timer')).toHaveTextContent('90:00')
  await user.keyboard('{ArrowRight}')
  expect(within(presets).getByRole('radio', { name: 'Custom', checked: true })).toHaveFocus()
  const minutes = screen.getByRole('spinbutton', { name: 'Duration in minutes' })
  await user.clear(minutes)
  await user.type(minutes, '241')
  await user.click(screen.getByRole('button', { name: 'Start' }))
  expect(screen.getByText('Enter 1 to 240 whole minutes.')).toBeVisible()
  expect(minutes).toHaveFocus()
  await user.clear(minutes)
  await user.type(minutes, '1')
  await user.click(first)
  expect(screen.getByRole('timer')).toHaveTextContent('25:00')
  await user.click(within(presets).getByRole('radio', { name: 'Custom' }))
  expect(screen.getByRole('spinbutton', { name: 'Duration in minutes' })).toHaveValue(1)
  await user.click(screen.getByRole('button', { name: 'Start' }))
  const pause = await screen.findByRole('button', { name: 'Pause' })
  expect(pause).toHaveFocus()
  await waitFor(() => expect(pause).toHaveAttribute('aria-disabled', 'false'))
  await user.keyboard('{Enter}')
  expect(await screen.findByRole('button', { name: 'Resume' })).toHaveFocus()
  expect(screen.getByText('Paused', { exact: true })).toBeVisible()
})

it('persists a paused stopwatch and its lap when the screen is reopened', async () => {
  const user = userEvent.setup()
  const initial = openFocus()
  await user.click(await screen.findByRole('button', { name: 'Stopwatch' }))
  await user.click(screen.getByRole('button', { name: 'Start' }))
  const lap = await screen.findByRole('button', { name: 'Lap' })
  await waitFor(() => expect(lap).toHaveAttribute('aria-disabled', 'false'))
  await user.click(lap)
  await screen.findByText('Lap 1')
  await waitFor(() => expect(lap).toHaveAttribute('aria-disabled', 'false'))
  await user.click(screen.getByRole('button', { name: 'Pause' }))
  await screen.findByRole('button', { name: 'Resume' })
  initial.unmount()

  openFocus()
  expect(await screen.findByText('Session restored.')).toBeVisible()
  expect(screen.getByRole('timer')).toHaveTextContent(/^\d{2}:\d{2}\.\d{2}$/)
  expect(screen.getByText('Lap 1')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Resume' })).toBeVisible()
})

it('lets keyboard users mute and unmute with a stable name and pressed state', async () => {
  const user = userEvent.setup()
  const initial = openFocus()
  const mute = await screen.findByRole('button', { name: 'Mute timer sound', pressed: false })
  mute.focus()
  await user.keyboard(' ')
  expect(mute).toHaveAttribute('aria-pressed', 'true')
  expect(mute).toHaveFocus()
  initial.unmount()

  openFocus()
  const restored = await screen.findByRole('button', { name: 'Mute timer sound', pressed: true })
  restored.focus()
  await user.keyboard('{Enter}')
  expect(restored).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
})

it('restores the active timer in the normal layout after a timer read error', async () => {
  const user = userEvent.setup()
  const prototype = HTMLDialogElement.prototype
  const showModal = Object.getOwnPropertyDescriptor(prototype, 'showModal')
  const close = Object.getOwnPropertyDescriptor(prototype, 'close')
  Object.defineProperties(prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false
      },
    },
  })

  const observe = vi.spyOn(FocusRuntime.prototype, 'observe')
  const view = openFocus()
  try {
    await user.click(await screen.findByRole('button', { name: /^Start$/ }))
    const pause = await screen.findByRole('button', { name: 'Pause' })
    await waitFor(() => expect(pause).toHaveAttribute('aria-disabled', 'false'))
    await user.click(pause)
    await screen.findByRole('button', { name: 'Resume' })
    const expand = await screen.findByRole('button', { name: 'Expand timer' })
    await user.click(expand)
    expect(screen.getByRole('dialog', { name: 'Focus timer' })).toBeVisible()

    const reportReadError = observe.mock.lastCall?.[1]
    if (!reportReadError) throw new Error('Expected a timer observer')
    act(() => reportReadError(new Error('Timer read failed')))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Session restored.')).toBeVisible()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Expand timer' })).toBeVisible()
  } finally {
    view.unmount()
    observe.mockRestore()
    for (const [key, descriptor] of Object.entries({ showModal, close })) {
      if (descriptor) Object.defineProperty(prototype, key, descriptor)
      else Reflect.deleteProperty(prototype, key)
    }
  }
})

it('restores alarm sound, volume, and play mode after remount', async () => {
  const user = userEvent.setup()
  const initial = openFocus()
  const sound = await screen.findByRole('combobox', { name: 'Alarm sound' })
  const volume = screen.getByRole('slider', { name: 'Alarm volume' })
  const mode = screen.getByRole('combobox', { name: 'Alarm play mode' })
  expect(sound).toHaveDisplayValue('Chime')
  expect(volume).toHaveValue('50')
  expect(mode).toHaveDisplayValue('Once')
  await user.selectOptions(sound, 'wood')
  fireEvent.change(volume, { target: { value: '55' } })
  await user.selectOptions(mode, 'loop')
  expect(mode).toHaveAccessibleDescription('The alarm stops automatically after two minutes.')
  initial.unmount()

  openFocus()
  expect(await screen.findByRole('combobox', { name: 'Alarm sound' })).toHaveDisplayValue('Wood')
  expect(screen.getByRole('slider', { name: 'Alarm volume' })).toHaveValue('55')
  expect(screen.getByRole('combobox', { name: 'Alarm play mode' })).toHaveDisplayValue(
    'Until I stop',
  )
})
