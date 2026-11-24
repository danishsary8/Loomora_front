import { useEffect, useState, type ReactNode } from 'react'
import type { GuestDatabase } from '@/lib/storage/db'
import type { GuestFocusSessionRepository } from '@/lib/storage/GuestFocusSessionRepository'
import type { ServerFocusSessionRepository } from '@/lib/storage/ServerFocusSessionRepository'
import type { FocusRuntime } from './focusRuntime'
import { FocusRuntimeContext } from './focusRuntimeContext'

interface Props {
  children: ReactNode
  database?: GuestDatabase
  repository: GuestFocusSessionRepository | ServerFocusSessionRepository
  generation: number
}

export function FocusRuntimeProvider({ children, database, repository, generation }: Props) {
  const [ready, setReady] = useState<{ generation: number; runtime: FocusRuntime | null }>()
  useEffect(() => {
    let cancelled = false
    let disconnect: (() => void) | undefined
    void import('./focusRuntimeBrowser')
      .then(({ connectFocusRuntime }) => {
        if (!cancelled) return connectFocusRuntime(database, repository, generation)
      })
      .then((connection) => {
        if (!connection) {
          if (!cancelled) setReady({ generation, runtime: null })
          return
        }
        if (cancelled) {
          connection.disconnect()
          return
        }
        disconnect = connection.disconnect
        setReady({ generation, runtime: connection.runtime })
      })
      .catch(() => {
        if (!cancelled) setReady({ generation, runtime: null })
      })
    return () => {
      cancelled = true
      disconnect?.()
    }
  }, [database, repository, generation])

  return (
    <FocusRuntimeContext.Provider
      value={ready?.generation === generation ? ready.runtime : undefined}
    >
      {children}
    </FocusRuntimeContext.Provider>
  )
}
