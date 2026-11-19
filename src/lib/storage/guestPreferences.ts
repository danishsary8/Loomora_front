import { createContext } from 'react'
import { DEFAULT_TIME_PREFERENCES, type TimePreferences } from '@/lib/time/time'
import type { GuestDatabase } from './db'

const KEY = 'timePreferences'

export const GuestPreferenceDatabaseContext = createContext<GuestDatabase | undefined>(undefined)

export async function readGuestPreferences(db: GuestDatabase): Promise<TimePreferences> {
  const stored = await db.meta.get(KEY)
  return stored?.value ?? DEFAULT_TIME_PREFERENCES
}

export function writeGuestPreferences(db: GuestDatabase, changes: Partial<TimePreferences>) {
  return db.transaction('rw', db.meta, async () => {
    const value = { ...(await readGuestPreferences(db)), ...changes }
    await db.meta.put({ key: KEY, value })
    return value
  })
}
