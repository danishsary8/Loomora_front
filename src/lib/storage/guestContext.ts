import { createContext, useContext } from 'react'
import type { GuestStorage } from './saveGuestPlan'

export const GuestStorageContext = createContext<GuestStorage | null>(null)

/** The guest repositories, even while signed in (the guest plan is still on the device until imported). */
export function useGuestStorage(): GuestStorage {
  const guest = useContext(GuestStorageContext)
  if (!guest) throw new Error('useGuestStorage must be used inside <AppProviders>')
  return guest
}
