import { occurrencesForDate, occursOn } from '@/features/schedule/occurrences'
import {
  DEFAULT_SCHEDULE_CATEGORY,
  MAX_SCHEDULE_ITEMS,
  type CreateScheduleItemInput,
  type ExceptionInput,
  type Occurrence,
  type ScheduleCheckin,
  type ScheduleException,
  type ScheduleItem,
  type UpdateScheduleItemInput,
} from '@/features/schedule/types'
import type { LocalDate } from '@/features/todos/types'
import { toLocalDate } from '@/lib/date'
import { newId } from '@/lib/id'
import type { GuestDatabase } from './db'
import { openGuestDatabase } from './openGuestDatabase'
import { NotFoundError, ValidationError } from './errors'
import type { ScheduleRepository } from './ScheduleRepository'
import {
  checkCategory,
  checkDate,
  checkDays,
  checkTime,
  checkTimeRange,
  normalizeDays,
} from './scheduleValidation'
import { cleanTitle } from './validation'

export interface GuestScheduleRepositoryOptions {
  db?: GuestDatabase
  /** Clock for timestamps and the default start date; tests pass a fixed one. */
  now?: () => Date
}

/** Schedule for guests, stored on this device in IndexedDB. */
export class GuestScheduleRepository implements ScheduleRepository {
  private readonly open: () => Promise<GuestDatabase>
  private readonly now: () => Date

  constructor({ db, now = () => new Date() }: GuestScheduleRepositoryOptions = {}) {
    this.open = db ? () => Promise.resolve(db) : openGuestDatabase
    this.now = now
  }

  async listItems(): Promise<ScheduleItem[]> {
    return (await this.open()).schedule_items.toArray()
  }

  async listExceptions(): Promise<ScheduleException[]> {
    return (await this.open()).schedule_exceptions.toArray()
  }

  async listCheckins(): Promise<ScheduleCheckin[]> {
    return (await this.open()).schedule_checkins.toArray()
  }

  /** Keep items with their exceptions and check-ins if the local schedule changed during import. */
  async clearImported(snapshot: {
    items: ScheduleItem[]
    exceptions: ScheduleException[]
    checkins: ScheduleCheckin[]
  }): Promise<void> {
    const { items, exceptions, checkins } = snapshot
    if (items.length + exceptions.length + checkins.length === 0) return
    const db = await this.open()
    const tables = [db.schedule_items, db.schedule_exceptions, db.schedule_checkins] as const
    await db.transaction('rw', tables, async () => {
      const current = await Promise.all(tables.map((table) => table.toArray()))
      if (JSON.stringify(current) === JSON.stringify([items, exceptions, checkins])) {
        await Promise.all(tables.map((table) => table.clear()))
      }
    })
  }

  async listForDate(date: LocalDate): Promise<Occurrence[]> {
    const db = await this.open()
    const [items, exceptions, checkins] = await Promise.all([
      db.schedule_items.toArray(),
      db.schedule_exceptions.where('date').equals(date).toArray(),
      db.schedule_checkins.where('date').equals(date).toArray(),
    ])
    return occurrencesForDate(items, exceptions, checkins, date)
  }

  async create(input: CreateScheduleItemInput): Promise<ScheduleItem> {
    const title = cleanTitle(input.title)
    const category = input.category ?? DEFAULT_SCHEDULE_CATEGORY
    const starts_on = input.starts_on ?? toLocalDate(this.now())
    const ends_on = input.ends_on ?? null
    checkCategory(category)
    checkTimeRange(input.start_time, input.end_time)
    checkDays(input.days)
    checkDate('starts_on', starts_on)
    checkEndsOn(starts_on, ends_on)

    const stamp = this.now().toISOString()
    const item: ScheduleItem = {
      id: newId(),
      title,
      category,
      start_time: input.start_time,
      end_time: input.end_time,
      days: normalizeDays(input.days),
      starts_on,
      ends_on,
      created_at: stamp,
      updated_at: stamp,
    }
    // Errors are thrown outside Dexie transactions (see GuestTodoRepository.create).
    const db = await this.open()
    const added = await db.transaction('rw', db.schedule_items, async () => {
      if ((await db.schedule_items.count()) >= MAX_SCHEDULE_ITEMS) return false
      await db.schedule_items.add(item)
      return true
    })
    if (!added)
      throw new ValidationError(
        'title',
        `You can keep at most ${MAX_SCHEDULE_ITEMS} schedule items.`,
      )
    return item
  }

  async update(id: string, patch: UpdateScheduleItemInput): Promise<ScheduleItem> {
    const db = await this.open()
    const saved = await db.transaction('rw', db.schedule_items, async () => {
      const current = await db.schedule_items.get(id)
      if (!current) return undefined
      const next: ScheduleItem = {
        ...current,
        title: patch.title === undefined ? current.title : cleanTitle(patch.title),
        category: patch.category ?? current.category,
        start_time: patch.start_time ?? current.start_time,
        end_time: patch.end_time ?? current.end_time,
        days: patch.days === undefined ? current.days : normalizeDays(patch.days),
        ends_on: patch.ends_on === undefined ? current.ends_on : patch.ends_on,
        updated_at: this.now().toISOString(),
      }
      checkCategory(next.category)
      checkTimeRange(next.start_time, next.end_time)
      checkDays(next.days)
      checkEndsOn(next.starts_on, next.ends_on)
      await db.schedule_items.put(next)
      return next
    })
    // Dexie wraps errors named NotFoundError inside a transaction.
    if (!saved) throw new NotFoundError('Schedule item', id)
    return saved
  }

  async delete(id: string): Promise<void> {
    const db = await this.open()
    const { schedule_items: items, schedule_exceptions, schedule_checkins } = db
    await db.transaction('rw', items, schedule_exceptions, schedule_checkins, async () => {
      await schedule_exceptions.where('schedule_item_id').equals(id).delete()
      await schedule_checkins.where('schedule_item_id').equals(id).delete()
      await items.delete(id)
    })
  }

  async setException(
    id: string,
    date: LocalDate,
    input: ExceptionInput,
  ): Promise<ScheduleException> {
    const db = await this.open()
    const saved = await db.transaction(
      'rw',
      db.schedule_items,
      db.schedule_exceptions,
      async () => {
        const item = await this.findOccurringItem(db, id, date)
        if (!item) return undefined
        const exception = this.buildException(item, date, input)
        const existing = await db.schedule_exceptions
          .where('[schedule_item_id+date]')
          .equals([id, date])
          .first()
        const row = existing ? { ...exception, id: existing.id } : exception
        await db.schedule_exceptions.put(row)
        return row
      },
    )
    if (!saved) throw new NotFoundError('Schedule item', id)
    return saved
  }

  async removeException(id: string, date: LocalDate): Promise<void> {
    const db = await this.open()
    await db.schedule_exceptions.where('[schedule_item_id+date]').equals([id, date]).delete()
  }

  async setCheckin(id: string, date: LocalDate, done: boolean): Promise<void> {
    const db = await this.open()
    if (!done) {
      await db.schedule_checkins.where('[schedule_item_id+date]').equals([id, date]).delete()
      return
    }
    const found = await db.transaction('rw', db.schedule_items, db.schedule_checkins, async () => {
      if (!(await this.findOccurringItem(db, id, date))) return false
      const existing = await db.schedule_checkins
        .where('[schedule_item_id+date]')
        .equals([id, date])
        .first()
      if (!existing) {
        await db.schedule_checkins.add({
          id: newId(),
          schedule_item_id: id,
          date,
          done_at: this.now().toISOString(),
        })
      }
      return true
    })
    if (!found) throw new NotFoundError('Schedule item', id)
  }

  private buildException(item: ScheduleItem, date: LocalDate, input: ExceptionInput) {
    const base = { id: newId(), schedule_item_id: item.id, date }
    if (input.type === 'skip')
      return { ...base, type: 'skip', title: null, start_time: null, end_time: null } as const
    if (input.title === undefined && input.start_time === undefined && input.end_time === undefined)
      throw new ValidationError('type', 'An override must change the title or a time.')
    const title = input.title === undefined ? null : cleanTitle(input.title)
    if (input.start_time !== undefined) checkTime('start_time', input.start_time)
    if (input.end_time !== undefined) checkTime('end_time', input.end_time)
    checkTimeRange(input.start_time ?? item.start_time, input.end_time ?? item.end_time)
    return {
      ...base,
      type: 'override',
      title,
      start_time: input.start_time ?? null,
      end_time: input.end_time ?? null,
    } as const
  }

  private async findOccurringItem(
    db: GuestDatabase,
    id: string,
    date: LocalDate,
  ): Promise<ScheduleItem | undefined> {
    checkDate('date', date)
    const item = await db.schedule_items.get(id)
    if (item && !occursOn(item, date))
      throw new ValidationError('date', 'This item does not occur on that date.')
    return item
  }
}

function checkEndsOn(startsOn: LocalDate, endsOn: LocalDate | null): void {
  if (endsOn === null) return
  checkDate('ends_on', endsOn)
  if (endsOn < startsOn)
    throw new ValidationError('ends_on', 'End date must not be before the start date.')
}
