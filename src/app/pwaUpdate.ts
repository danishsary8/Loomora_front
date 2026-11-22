import { useEffect } from 'react'
import { create } from 'zustand'

export type PwaUpdateStatus = 'idle' | 'available' | 'confirming' | 'updating' | 'error'

const ACTIVATION_TIMEOUT_MS = 5000

interface PwaController {
  applyUpdate: () => Promise<void>
  reloadPage: () => void
  getRegistration: () => ServiceWorkerRegistration | undefined
}

const defaultController: PwaController = {
  applyUpdate: async () => {},
  reloadPage: () => window.location.reload(),
  getRegistration: () => undefined,
}

let controller: PwaController = { ...defaultController }
let activationTimer: ReturnType<typeof setTimeout> | undefined
let watchedWorker: ServiceWorker | null = null
let watchedListener: (() => void) | undefined

function clearActivationWatchers() {
  if (activationTimer !== undefined) {
    clearTimeout(activationTimer)
    activationTimer = undefined
  }
  if (watchedWorker && watchedListener) {
    watchedWorker.removeEventListener('statechange', watchedListener)
  }
  watchedWorker = null
  watchedListener = undefined
}

const activeDrafts = new Set<string>()
let dirtyFormFields = new WeakSet<HTMLElement>()

if (typeof document !== 'undefined') {
  const trackFieldInput = (event: Event) => {
    const target = event.target
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      if (target.value.trim() === '') {
        dirtyFormFields.delete(target)
      } else {
        dirtyFormFields.add(target)
      }
    }
  }
  document.addEventListener('input', trackFieldInput, true)
  document.addEventListener('change', trackFieldInput, true)
  document.addEventListener(
    'reset',
    (event) => {
      const form = event.target
      if (form instanceof HTMLFormElement) {
        for (const el of Array.from(form.elements)) {
          if (el instanceof HTMLElement) {
            dirtyFormFields.delete(el)
          }
        }
      }
    },
    true,
  )
}

/** Checks whether an editable sheet or unsaved form draft is currently open. */
export function hasUnsavedEditableWork(): boolean {
  if (activeDrafts.size > 0) return true
  if (typeof document === 'undefined') return false

  const openEditableSheet = document.querySelector(
    '[role="dialog"] form, [role="dialog"] textarea, [role="dialog"] select, [role="dialog"] input:not([type="checkbox"]):not([type="radio"])',
  )
  if (openEditableSheet) return true

  const formFields = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
    'form input:not([type="checkbox"]):not([type="radio"]), form textarea',
  )
  for (const field of formFields) {
    if (
      field.value.trim() !== '' &&
      (dirtyFormFields.has(field) || field.value !== field.defaultValue)
    ) {
      return true
    }
  }

  return false
}

/** Registers whether a stateful editor currently holds unsaved input. */
export function useUnsavedDraft(key: string, dirty: boolean): void {
  useEffect(() => {
    if (!dirty) {
      activeDrafts.delete(key)
      return
    }
    activeDrafts.add(key)
    return () => {
      activeDrafts.delete(key)
    }
  }, [key, dirty])
}

interface PwaUpdateState {
  status: PwaUpdateStatus
  waitingWorker: ServiceWorker | null
  dismissedWorker: ServiceWorker | null
  dismissed: boolean
  reloadAuthorized: boolean
  hasReloaded: boolean
  externalActivated: boolean
  attachController: (next: Partial<PwaController>) => void
  setReloadHandler: (reloadPage: () => void) => void
  notifyAvailable: (waitingWorker?: ServiceWorker | null) => void
  dismiss: () => void
  requestUpdate: () => void
  cancelConfirmation: () => void
  confirmUpdate: () => void
  handleNeedReload: () => void
  handleRegisterError: () => void
  reset: () => void
}

export const usePwaUpdate = create<PwaUpdateState>((set, get) => ({
  status: 'idle',
  waitingWorker: null,
  dismissedWorker: null,
  dismissed: false,
  reloadAuthorized: false,
  hasReloaded: false,
  externalActivated: false,

  attachController(next) {
    controller = { ...controller, ...next }
  },

  setReloadHandler(reloadPage) {
    controller = { ...controller, reloadPage }
  },

  notifyAvailable(waitingWorker = null) {
    const state = get()
    if (state.status === 'confirming' || state.status === 'updating') {
      return
    }
    if (state.status === 'available') {
      if (waitingWorker && waitingWorker !== state.waitingWorker) {
        set({ waitingWorker, externalActivated: false })
      }
      return
    }
    if (state.dismissed) {
      if (waitingWorker && state.dismissedWorker && waitingWorker !== state.dismissedWorker) {
        set({
          status: 'available',
          waitingWorker,
          dismissed: false,
          dismissedWorker: null,
          externalActivated: false,
        })
      }
      return
    }
    set({
      status: 'available',
      waitingWorker: waitingWorker ?? state.waitingWorker,
      externalActivated: false,
    })
  },

  dismiss() {
    clearActivationWatchers()
    set((state) => ({
      status: 'idle',
      dismissed: true,
      dismissedWorker: state.waitingWorker,
      reloadAuthorized: false,
    }))
  },

  requestUpdate() {
    if (get().status === 'updating') return
    if (hasUnsavedEditableWork()) {
      set({ status: 'confirming', reloadAuthorized: false })
      return
    }
    get().confirmUpdate()
  },

  cancelConfirmation() {
    if (get().status !== 'confirming') return
    set({ status: 'available', reloadAuthorized: false })
  },

  confirmUpdate() {
    const state = get()
    if (state.status === 'updating' || state.hasReloaded) return

    clearActivationWatchers()

    if (state.externalActivated) {
      set({ hasReloaded: true, reloadAuthorized: false })
      controller.reloadPage()
      return
    }

    const registration = controller.getRegistration()
    const waiting = registration?.waiting ?? state.waitingWorker

    if (registration && !waiting && !registration.installing) {
      set({ status: 'error', reloadAuthorized: false })
      return
    }

    set({ status: 'updating', reloadAuthorized: true, waitingWorker: waiting ?? null })

    if (waiting) {
      if (waiting.state === 'redundant') {
        set({ status: 'error', reloadAuthorized: false })
        return
      }
      const onStateChange = () => {
        if (waiting.state === 'redundant' && get().status === 'updating') {
          clearActivationWatchers()
          set({ status: 'error', reloadAuthorized: false })
        }
      }
      watchedWorker = waiting
      watchedListener = onStateChange
      waiting.addEventListener('statechange', onStateChange)
    }

    activationTimer = setTimeout(() => {
      if (get().status === 'updating' && !get().hasReloaded) {
        clearActivationWatchers()
        set({ status: 'error', reloadAuthorized: false })
      }
    }, ACTIVATION_TIMEOUT_MS)

    void controller.applyUpdate().catch(() => {
      if (get().status === 'updating') {
        clearActivationWatchers()
        set({ status: 'error', reloadAuthorized: false })
      }
    })
  },

  handleNeedReload() {
    clearActivationWatchers()
    const state = get()
    if (!state.reloadAuthorized || state.hasReloaded) {
      set({ externalActivated: true, waitingWorker: null })
      return
    }
    set({ hasReloaded: true, reloadAuthorized: false })
    controller.reloadPage()
  },

  handleRegisterError() {
    clearActivationWatchers()
    set((state) =>
      state.status === 'updating' ? { status: 'error', reloadAuthorized: false } : state,
    )
  },

  reset() {
    clearActivationWatchers()
    activeDrafts.clear()
    dirtyFormFields = new WeakSet<HTMLElement>()
    controller = { ...defaultController }
    set({
      status: 'idle',
      waitingWorker: null,
      dismissedWorker: null,
      dismissed: false,
      reloadAuthorized: false,
      hasReloaded: false,
      externalActivated: false,
    })
  },
}))
