import { createContext } from 'react'
import type { GuestFocusSessionRepository } from './GuestFocusSessionRepository'
import type { ServerFocusSessionRepository } from './ServerFocusSessionRepository'

export const FocusSessionRepositoryContext = createContext<
  GuestFocusSessionRepository | ServerFocusSessionRepository | null
>(null)
