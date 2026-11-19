import type { LocalDate } from '@/features/todos/types'
import type { DailyIntentionRecord } from '@/lib/api/types'
import type { GuestDatabase } from './db'
import { openGuestDatabase } from './openGuestDatabase'

/** Each guest intention is keyed by its local calendar date. */
export class GuestDailyIntentionRepository {
  private readonly open: () => Promise<GuestDatabase>

  constructor(db?: GuestDatabase) {
    this.open = db ? () => Promise.resolve(db) : openGuestDatabase
  }

  async get(date: LocalDate): Promise<string | null> {
    const db = await this.open()
    return (await db.dailyIntentions.get(date))?.text ?? null
  }

  async save(date: LocalDate, text: string | null): Promise<string | null> {
    const db = await this.open()
    if (text === null) await db.dailyIntentions.delete(date)
    else await db.dailyIntentions.put({ date, text })
    return text
  }

  async list() {
    const db = await this.open()
    return db.dailyIntentions.toArray()
  }

  async clearImported(rows: DailyIntentionRecord[]) {
    if (rows.length === 0) return
    const db = await this.open()
    await db.transaction('rw', db.dailyIntentions, async () => {
      const dates = rows.map(({ date }) => date)
      const current = await db.dailyIntentions.bulkGet(dates)
      // Another tab can edit the guest plan while the import is in flight.
      await db.dailyIntentions.bulkDelete(
        rows.filter(({ text }, index) => current[index]?.text === text).map(({ date }) => date),
      )
    })
  }
}
