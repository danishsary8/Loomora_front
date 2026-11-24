import { useEffect, useRef, useState } from 'react'
import type { FocusRuntime, PendingFocusSave } from './focusRuntime'
import type { FocusTimerSnapshot } from './focusTimerState'

interface Observation {
  snapshot: FocusTimerSnapshot | null
  restoredId?: string
  error?: boolean
}

type Action = 'update' | 'finish' | 'retry'

export function useFocusSession(runtime: FocusRuntime) {
  const [observed, setObserved] = useState<Observation>()
  const [pending, setPending] = useState<PendingFocusSave[] | null>()
  const [busy, setBusy] = useState<Action>()
  const [actionError, setActionError] = useState(false)
  const [subscription, setSubscription] = useState(0)
  const inFlight = useRef(false)

  useEffect(() => {
    let first = true
    const timer = runtime.observe(
      (snapshot) => {
        const restoredId = first ? snapshot?.id : undefined
        first = false
        setObserved((previous) => ({
          snapshot,
          restoredId: restoredId ?? previous?.restoredId,
        }))
      },
      () => setObserved({ snapshot: null, error: true }),
    )
    const saves = runtime.observePending(setPending, () => setPending(null))
    return () => {
      timer.unsubscribe()
      saves.unsubscribe()
    }
  }, [runtime, subscription])

  function run(operation: () => Promise<unknown>, action: Action = 'update') {
    if (inFlight.current) return
    inFlight.current = true
    setActionError(false)
    setBusy(action)
    void operation()
      .catch(() => setActionError(true))
      .finally(() => {
        inFlight.current = false
        setBusy(undefined)
      })
  }

  function reload() {
    setObserved(undefined)
    setPending(undefined)
    setSubscription((value) => value + 1)
  }

  return { observed, pending, busy, actionError, run, reload }
}
