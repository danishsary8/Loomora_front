import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Sheet } from '@/components/ui'
import { PwaUpdateBanner } from '@/app/layout/PwaUpdateBanner'
import { registerServiceWorker, resetServiceWorkerForTests } from '@/app/registerServiceWorker'
import { usePwaUpdate, useUnsavedDraft } from '@/app/pwaUpdate'

type SwCallbacks = {
  immediate?: boolean
  onNeedRefresh?: () => void
  onNeedReload?: () => void
  onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void
  onRegisterError?: (error: unknown) => void
}

const registerSwMock = vi.fn<(options?: SwCallbacks) => (reloadPage?: boolean) => Promise<void>>()
let capturedOptions: SwCallbacks | undefined
let updateSwMock: ReturnType<typeof vi.fn<(reloadPage?: boolean) => Promise<void>>>

vi.mock('virtual:pwa-register', () => ({
  registerSW: (options?: SwCallbacks) => {
    capturedOptions = options
    return registerSwMock(options)
  },
}))

function createMockWaitingWorker(initialState: ServiceWorkerState = 'installed') {
  const listeners = new Map<string, Set<EventListener>>()
  const worker = {
    state: initialState,
    scriptURL: 'https://loomora.test/sw.js',
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      const set = listeners.get(type) ?? new Set()
      set.add(listener)
      listeners.set(type, set)
    }),
    removeEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.get(type)?.delete(listener)
    }),
    dispatchState(next: ServiceWorkerState) {
      worker.state = next
      for (const listener of listeners.get('statechange') ?? []) {
        listener(new Event('statechange'))
      }
    },
  }
  return worker
}

function createMockRegistration(waiting: ServiceWorker | null = null): ServiceWorkerRegistration {
  return {
    waiting,
    installing: null,
    active: null,
    scope: 'https://loomora.test/',
  } as unknown as ServiceWorkerRegistration
}

describe('QA-019 safe PWA updates', () => {
  const reloadSpy = vi.fn()

  beforeEach(() => {
    capturedOptions = undefined
    updateSwMock = vi.fn().mockResolvedValue(undefined)
    registerSwMock.mockReset()
    registerSwMock.mockImplementation(() => updateSwMock)
    reloadSpy.mockReset()
    resetServiceWorkerForTests()
    usePwaUpdate.getState().reset()
    usePwaUpdate.getState().setReloadHandler(reloadSpy)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    resetServiceWorkerForTests()
    usePwaUpdate.getState().reset()
  })

  it('registers once without auto-reloading when an update arrives', () => {
    registerServiceWorker()
    registerServiceWorker()

    expect(registerSwMock).toHaveBeenCalledTimes(1)
    expect(capturedOptions?.immediate).toBe(true)
    expect(typeof capturedOptions?.onNeedRefresh).toBe('function')
    expect(typeof capturedOptions?.onNeedReload).toBe('function')

    const waiting = createMockWaitingWorker()
    act(() => {
      capturedOptions?.onRegisteredSW?.(
        '/sw.js',
        createMockRegistration(waiting as unknown as ServiceWorker),
      )
      capturedOptions?.onNeedRefresh?.()
    })

    expect(reloadSpy).not.toHaveBeenCalled()
    expect(updateSwMock).not.toHaveBeenCalled()
    expect(usePwaUpdate.getState().status).toBe('available')
  })

  it('deduplicates repeated update notifications and respects Later for the same waiting worker', async () => {
    const waiting = createMockWaitingWorker() as unknown as ServiceWorker
    registerServiceWorker()
    render(<PwaUpdateBanner />)

    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(waiting))
      capturedOptions?.onNeedRefresh?.()
      capturedOptions?.onNeedRefresh?.()
    })

    expect(screen.getAllByRole('button', { name: 'Update now' })).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('A new version of Loomora is available.')

    await userEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(screen.queryByRole('button', { name: 'Update now' })).not.toBeInTheDocument()
    expect(reloadSpy).not.toHaveBeenCalled()

    // Duplicate event for the same waiting worker stays dismissed.
    act(() => {
      capturedOptions?.onNeedRefresh?.()
    })
    expect(screen.queryByRole('button', { name: 'Update now' })).not.toBeInTheDocument()

    // A brand new waiting worker (e.g. v3) surfaces the prompt again.
    const nextWaiting = createMockWaitingWorker() as unknown as ServiceWorker
    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(nextWaiting))
      capturedOptions?.onNeedRefresh?.()
    })
    expect(screen.getByRole('button', { name: 'Update now' })).toBeInTheDocument()
  })

  it('activates waiting SW and reloads only after Update now when no form is open', async () => {
    const waiting = createMockWaitingWorker() as unknown as ServiceWorker
    registerServiceWorker()
    render(<PwaUpdateBanner />)

    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(waiting))
      capturedOptions?.onNeedRefresh?.()
    })

    // Unconfirmed controller change (e.g. triggered by another tab) must NOT auto-reload.
    act(() => {
      capturedOptions?.onNeedReload?.()
    })
    expect(reloadSpy).not.toHaveBeenCalled()

    // Re-trigger a new waiting worker and click Update now explicitly.
    const v3Waiting = createMockWaitingWorker() as unknown as ServiceWorker
    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(v3Waiting))
      capturedOptions?.onNeedRefresh?.()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(updateSwMock).toHaveBeenCalledTimes(1)
    expect(reloadSpy).not.toHaveBeenCalled()

    act(() => {
      capturedOptions?.onNeedReload?.()
    })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('asks for explicit confirmation before discarding an open editable sheet or unsaved form', async () => {
    function SheetAndBanner() {
      const [draft, setDraft] = useState('Draft task')
      return (
        <>
          <PwaUpdateBanner />
          <Sheet open onClose={() => {}} title="Add a to-do">
            <form>
              <input aria-label="Title" value={draft} onChange={(e) => setDraft(e.target.value)} />
            </form>
          </Sheet>
        </>
      )
    }

    const waiting = createMockWaitingWorker() as unknown as ServiceWorker
    registerServiceWorker()
    render(<SheetAndBanner />)

    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(waiting))
      capturedOptions?.onNeedRefresh?.()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(updateSwMock).not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveValue('Draft task')
    expect(screen.getByRole('button', { name: 'Discard and update' })).toBeInTheDocument()

    // Keep editing preserves draft and cancels reload.
    await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(updateSwMock).not.toHaveBeenCalled()
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Title')).toHaveValue('Draft task')
    expect(screen.getByRole('button', { name: 'Update now' })).toBeInTheDocument()

    // Explicit confirmation activates the waiting SW and reloads on controller change.
    await userEvent.click(screen.getByRole('button', { name: 'Update now' }))
    await userEvent.click(screen.getByRole('button', { name: 'Discard and update' }))
    expect(updateSwMock).toHaveBeenCalledTimes(1)

    act(() => {
      capturedOptions?.onNeedReload?.()
    })
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('handles registration and activation failures without reload loops', async () => {
    registerServiceWorker()
    render(<PwaUpdateBanner />)

    // Registration failure stays silent/safe with zero reloads.
    act(() => {
      capturedOptions?.onRegisterError?.(new Error('sw failed'))
    })
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(usePwaUpdate.getState().status).toBe('idle')

    // Activation rejection enters recoverable error state without reloading.
    const waiting = createMockWaitingWorker()
    updateSwMock.mockRejectedValueOnce(new Error('skipWaiting rejected'))
    act(() => {
      capturedOptions?.onRegisteredSW?.(
        '/sw.js',
        createMockRegistration(waiting as unknown as ServiceWorker),
      )
      capturedOptions?.onNeedRefresh?.()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Update now' }))
    await waitFor(() =>
      expect(screen.getByText('Could not update right now. Your work is safe.')).toBeVisible(),
    )
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Later' })).toBeInTheDocument()

    // Redundant waiting worker also stops without reload.
    updateSwMock.mockResolvedValueOnce(undefined)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    act(() => {
      waiting.dispatchState('redundant')
    })
    await waitFor(() =>
      expect(screen.getByText('Could not update right now. Your work is safe.')).toBeVisible(),
    )
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('times out stalled activation cleanly without reloading', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const waiting = createMockWaitingWorker() as unknown as ServiceWorker
    registerServiceWorker()
    render(<PwaUpdateBanner />)

    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(waiting))
      capturedOptions?.onNeedRefresh?.()
    })

    act(() => {
      usePwaUpdate.getState().requestUpdate()
    })
    expect(usePwaUpdate.getState().status).toBe('updating')

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })

    expect(usePwaUpdate.getState().status).toBe('error')
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('supports keyboard navigation, Escape to cancel discard confirmation, and useUnsavedDraft guard', async () => {
    function InlineDraftHarness() {
      const [dirty, setDirty] = useState(true)
      useUnsavedDraft('inline-editor', dirty)
      return (
        <>
          <PwaUpdateBanner />
          <button type="button" onClick={() => setDirty(false)}>
            Mark saved
          </button>
        </>
      )
    }

    const waiting = createMockWaitingWorker() as unknown as ServiceWorker
    registerServiceWorker()
    render(<InlineDraftHarness />)

    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(waiting))
      capturedOptions?.onNeedRefresh?.()
    })

    // Tab to Update now and activate via Enter while dirty draft is active.
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Update now' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('button', { name: 'Keep editing' })).toHaveFocus()
    expect(updateSwMock).not.toHaveBeenCalled()

    // Escape cancels confirmation and returns to Update now / Later.
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Update now' })).toBeInTheDocument()

    // Once saved, Update now proceeds without discard confirmation.
    await userEvent.click(screen.getByRole('button', { name: 'Mark saved' }))
    await userEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(updateSwMock).toHaveBeenCalledTimes(1)
  })

  it('protects unsaved inline <form> input and allows delayed reload after cross-tab activation', async () => {
    function InlineFormHarness() {
      const [email, setEmail] = useState('')
      return (
        <>
          <PwaUpdateBanner />
          <form>
            <input aria-label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </form>
        </>
      )
    }

    const waiting = createMockWaitingWorker() as unknown as ServiceWorker
    registerServiceWorker()
    render(<InlineFormHarness />)

    act(() => {
      capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(waiting))
      capturedOptions?.onNeedRefresh?.()
    })

    await userEvent.type(screen.getByLabelText('Email'), 'user@example.test')

    // Another tab activates the SW: current tab must NOT reload and lose typed email.
    act(() => {
      capturedOptions?.onNeedReload?.()
    })
    expect(reloadSpy).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Email')).toHaveValue('user@example.test')

    // Clicking Update now while email is typed asks confirmation first, then reloads on confirm.
    await userEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(screen.getByRole('button', { name: 'Discard and update' })).toBeInTheDocument()
    expect(reloadSpy).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Discard and update' }))
    expect(reloadSpy).toHaveBeenCalledTimes(1)
  })

  it('ignores initial clientsClaim controllerchange and reloads on same-session update controllerchange', async () => {
    const target = new EventTarget()
    const swContainer = Object.assign(target, { controller: null as ServiceWorker | null })
    const originalSw = navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', { value: swContainer, configurable: true })

    try {
      const waiting = createMockWaitingWorker() as unknown as ServiceWorker
      registerServiceWorker()
      render(<PwaUpdateBanner />)

      // First-visit clientsClaim transitions controller null -> v1: must NOT reload or flip externalActivated.
      act(() => {
        swContainer.controller = waiting
        swContainer.dispatchEvent(new Event('controllerchange'))
      })
      expect(reloadSpy).not.toHaveBeenCalled()
      expect(usePwaUpdate.getState().externalActivated).toBe(false)

      // Later in the same session, v2 arrives and user confirms Update now: controllerchange triggers reload
      // even when vite-plugin-pwa's onNeedReload is skipped because Workbox._isUpdate was false.
      act(() => {
        capturedOptions?.onRegisteredSW?.('/sw.js', createMockRegistration(waiting))
        capturedOptions?.onNeedRefresh?.()
      })
      await userEvent.click(screen.getByRole('button', { name: 'Update now' }))
      expect(reloadSpy).not.toHaveBeenCalled()

      act(() => {
        swContainer.dispatchEvent(new Event('controllerchange'))
      })
      expect(reloadSpy).toHaveBeenCalledTimes(1)
    } finally {
      Object.defineProperty(navigator, 'serviceWorker', { value: originalSw, configurable: true })
    }
  })
})
