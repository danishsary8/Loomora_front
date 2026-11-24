import { webcrypto } from 'node:crypto'
import { act, render, waitFor } from '@testing-library/react'
import { useContext } from 'react'
import { expect, it, vi } from 'vitest'
import { FocusRuntimeContext } from '@/features/focus/focusRuntimeContext'
import type { FocusRuntime } from '@/features/focus/focusRuntime'
import { useSession } from '@/lib/api/session'
import { GuestDatabase } from '@/lib/storage/db'
import { makeTokenResponse, makeUser } from '@/test/apiMocks'
import { AppProviders } from './AppProviders'

it('binds the application runtime to the active auth session and isolates the guest timer', async () => {
  vi.stubGlobal('crypto', webcrypto)
  const db = new GuestDatabase(crypto.randomUUID())
  let runtime: FocusRuntime | null | undefined
  function Probe() {
    runtime = useContext(FocusRuntimeContext)
    return null
  }

  async function getRuntime(previous?: FocusRuntime) {
    return waitFor(() => {
      if (!runtime || runtime === previous) throw new Error('Waiting for current Focus runtime')
      return runtime
    })
  }

  const owner = makeTokenResponse(makeUser({ id: 'owner' }))
  const other = { ...makeTokenResponse(makeUser({ id: 'other' })), token: '2|other' }
  const view = render(
    <AppProviders guestDatabase={db}>
      <Probe />
    </AppProviders>,
  )
  try {
    const guest = await getRuntime()
    const deviceTimer = await guest.start({ mode: 'stopwatch' })
    act(() => useSession.getState().signIn(owner))
    const account = await getRuntime(guest)
    const accountTimer = await account.start({ mode: 'stopwatch', label: 'Owner session' })
    act(() => useSession.getState().signIn(other))
    const otherAccount = await getRuntime(account)
    expect(await otherAccount.read()).toBeNull()
    await expect(account.read()).rejects.toMatchObject({ status: 401 })

    act(() => useSession.getState().signOut())
    const guestAgain = await getRuntime(otherAccount)
    await expect(guestAgain.read()).resolves.toMatchObject({ id: deviceTimer.id })
    act(() => useSession.getState().signIn({ ...owner, token: '3|owner-returned' }))
    const returning = await getRuntime(guestAgain)
    await expect(returning.read()).resolves.toMatchObject({
      id: accountTimer.id,
      config: { label: 'Owner session' },
      phase: { status: 'paused' },
    })
    expect(JSON.stringify(await db.focus_timers.toArray())).not.toContain(owner.token)

    act(() =>
      useSession.getState().signIn({
        ...owner,
        token: '4|expiring',
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      }),
    )
    const expiring = await getRuntime(returning)
    await expiring.reconcile()
    const recovered = await expiring.read()
    if (!recovered) throw new Error('Expected the owner timer')
    await expiring.command(recovered, 'resume')
    const afterExpiry = Date.now() + 61_000
    const now = vi.spyOn(Date, 'now').mockReturnValue(afterExpiry)
    try {
      window.dispatchEvent(new Event('pageshow'))
      await waitFor(async () => {
        expect(await db.focus_timers.get('account:owner')).toMatchObject({
          phase: { status: 'paused' },
        })
      })
      await expect(expiring.read()).rejects.toMatchObject({ status: 401 })
    } finally {
      now.mockRestore()
    }

    act(() => useSession.getState().signOut())
    const finalGuest = await getRuntime(expiring)
    const recoveredGuest = await finalGuest.read()
    if (!recoveredGuest) throw new Error('Expected the device timer')
    await finalGuest.command(recoveredGuest, 'finish')
    expect(await db.focus_sessions.get(deviceTimer.id)).toMatchObject({ id: deviceTimer.id })
  } finally {
    view.unmount()
    await db.delete()
    vi.unstubAllGlobals()
  }
})
