import { create } from 'zustand'

const KEY = 'loomora.savePlanIntent'

function read(): boolean {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function write(pending: boolean) {
  try {
    if (pending) sessionStorage.setItem(KEY, '1')
    else sessionStorage.removeItem(KEY)
  } catch {
    // Private mode: the intent then only lasts until the page reloads.
  }
}

interface SavePlanIntent {
  /** The visitor asked to save the plan; it moves to the account as soon as they are signed in. */
  pending: boolean
  request: () => void
  clear: () => void
}

/** Survives the Google redirect (same tab) but not a closed tab. */
export const useSavePlanIntent = create<SavePlanIntent>((set) => ({
  pending: read(),
  request: () => {
    write(true)
    set({ pending: true })
  },
  clear: () => {
    write(false)
    set({ pending: false })
  },
}))
