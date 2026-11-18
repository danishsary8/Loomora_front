import type { GuestDatabase } from './db'

let shared: Promise<GuestDatabase> | undefined

/** Loads Dexie and opens the guest database the first time it is read, then reuses it. */
export function openGuestDatabase(): Promise<GuestDatabase> {
  shared ??= import('./db').then(({ GuestDatabase: Database }) => new Database())
  return shared
}
