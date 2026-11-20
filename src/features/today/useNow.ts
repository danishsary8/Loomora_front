import { useEffect, useState } from 'react'

const MINUTE_MS = 60_000

/** Refresh at the next minute boundary and when a suspended tab is visible again. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function schedule() {
      timer = setTimeout(refresh, MINUTE_MS - (Date.now() % MINUTE_MS))
    }
    function refresh() {
      clearTimeout(timer)
      setNow(new Date())
      schedule()
    }
    schedule()
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return now
}
