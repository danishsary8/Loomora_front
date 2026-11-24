import { webcrypto } from 'node:crypto'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/AppProviders'
import { GuestDatabase } from '@/lib/storage/db'
import { FocusPage } from './FocusPage'

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
  const custom = await screen.findByRole('button', { name: 'Custom' })
  expect(screen.getByRole('timer')).toHaveTextContent('25:00')
  await user.click(screen.getByRole('button', { name: '50 min' }))
  expect(screen.getByRole('timer')).toHaveTextContent('50:00')
  await user.click(screen.getByRole('button', { name: '90 min' }))
  expect(screen.getByRole('timer')).toHaveTextContent('90:00')
  await user.click(custom)
  const minutes = screen.getByRole('spinbutton', { name: 'Duration in minutes' })
  await user.clear(minutes)
  await user.type(minutes, '241')
  await user.click(screen.getByRole('button', { name: 'Start' }))
  expect(screen.getByText('Enter 1 to 240 whole minutes.')).toBeVisible()
  expect(minutes).toHaveFocus()
  await user.clear(minutes)
  await user.type(minutes, '1{Enter}')
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
