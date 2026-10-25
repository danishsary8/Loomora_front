import { useEffect, useState } from 'react'

const MINUTE_MS = 60_000

/** The current time, refreshed every minute so Now/Next stay right. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), MINUTE_MS)
    return () => clearInterval(id)
  }, [])
  return now
}
