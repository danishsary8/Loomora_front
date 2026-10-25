import { nowAndNext, occurrencesForDate } from '@/features/schedule/occurrences'
import {
  MAX_SCHEDULE_ITEMS,
  type CreateScheduleItemInput,
  type LocalTime,
  type NowNext,
  type Occurrence,
  type OverrideInput,
  type ScheduleException,
  type ScheduleItem,
  type UpdateScheduleItemInput,
} from '@/features/schedule/types'
import { DEFAULT_CATEGORY, type LocalDate } from '@/features/todos/types'
import { toLocalDate } from '@/lib/date'
import { newId } from '@/lib/id'
import { GuestDatabase } from './db'
import { NotFoundError, ValidationError } from './errors'
import type { ScheduleRepository } from './ScheduleRepository'
import {
  checkCategory,
  checkDate,
  checkDays,
  checkTime,
  checkTimeOrder,
} from './scheduleValidation'
import { cleanTitle } from './validation'

export interface GuestScheduleRepositoryOptions {
  db?: GuestDatabase
  /** Clock for timestamps and the default `starts_on`; tests pass a fixed one. */
  now?: () => Date
}

const WEEK_LENGTH = 7

/** The schedule for guests, stored on this device in IndexedDB. */
export class GuestScheduleRepository implements ScheduleRepository {
  private readonly db: GuestDatabase
  private readonly now: () => Date

  constructor({
    db = new GuestDatabase(),
    now = () => new Date(),
  }: GuestScheduleRepositoryOptions = {}) {
    this.db = db
    this.now = now
  }

  listItems(): Promise<ScheduleItem[]> {
    return this.db.schedule_items.toArray()
  }

  async listForDate(date: LocalDate): Promise<Occurrence[]> {
    checkDate('date', date)
    // R1 caps guests at 100 items, so filtering in memory is fine.
    const [items, exceptions, checkins] = await Promise.all([
      this.db.schedule_items.toArray(),
      this.db.schedule_exceptions.where('date').equals(date).toArray(),
      this.db.schedule_checkins.where('date').equals(date).toArray(),
    ])
    return occurrencesForDate(items, exceptions, checkins, date)
  }

  async listForWeek(start: LocalDate): Promise<Occurrence[][]> {
    checkDate('start', start)
    return Promise.all(
      Array.from({ length: WEEK_LENGTH }, (_, i) => this.listForDate(addDays(start, i))),
    )
  }

  async nowAndNext(date: LocalDate, time: LocalTime): Promise<NowNext> {
    checkTime('time', time)
    return nowAndNext(await this.listForDate(date), time)
  }

  async createItem(input: CreateScheduleItemInput): Promise<ScheduleItem> {
    checkCategory(input.category)
    checkTime('start_time', input.start_time)
    checkTime('end_time', input.end_time)
    checkTimeOrder(input.start_time, input.end_time)
    checkDays(input.days)
    checkDate('starts_on', input.starts_on)
    checkDate('ends_on', input.ends_on)
    const title = cleanTitle(input.title)
    const startsOn = input.starts_on ?? toLocalDate(this.now())
    const endsOn = input.ends_on ?? null
    checkDateOrder(startsOn, endsOn)

    const stamp = this.now().toISOString()
    const item: ScheduleItem = {
      id: newId(),
      title,
      category: input.category ?? DEFAULT_CATEGORY,
      start_time: input.start_time,
      end_time: input.end_time,
      days: normalizeDays(input.days),
      starts_on: startsOn,
      ends_on: endsOn,
      created_at: stamp,
      updated_at: stamp,
    }
    // Errors are thrown outside Dexie transactions: Dexie rewraps errors whose names
    // match its own (e.g. NotFoundError), so callers would get a DexieError instead.
    const added = await this.db.transaction('rw', this.db.schedule_items, async () => {
      if ((await this.db.schedule_items.count()) >= MAX_SCHEDULE_ITEMS) return false
      await this.db.schedule_items.add(item)
      return true
    })
    if (!added)
      throw new ValidationError(
        'title',
        `You can keep at most ${MAX_SCHEDULE_ITEMS} schedule items.`,
      )
    return item
  }

  async updateItem(id: string, patch: UpdateScheduleItemInput): Promise<ScheduleItem> {
    checkCategory(patch.category)
    checkTime('start_time', patch.start_time)
    checkTime('end_time', patch.end_time)
    checkDate('ends_on', patch.ends_on)
    if (patch.days !== undefined) checkDays(patch.days)
    const title = patch.title === undefined ? undefined : cleanTitle(patch.title)

    const current = await this.db.schedule_items.get(id)
    if (!current) throw new NotFoundError('Schedule item', id)
    const updated: ScheduleItem = {
      ...current,
      ...(title !== undefined && { title }),
      ...(patch.category !== undefined && { category: patch.category }),
      ...(patch.start_time !== undefined && { start_time: patch.start_time }),
      ...(patch.end_time !== undefined && { end_time: patch.end_time }),
      ...(patch.days !== undefined && { days: normalizeDays(patch.days) }),
      ...(patch.ends_on !== undefined && { ends_on: patch.ends_on }),
      updated_at: this.now().toISOString(),
    }
    checkTimeOrder(updated.start_time, updated.end_time)
    checkDateOrder(updated.starts_on, updated.ends_on)
    await this.db.schedule_items.put(updated)
    return updated
  }

  async deleteItem(id: string): Promise<void> {
    const { schedule_items, schedule_exceptions, schedule_checkins } = this.db
    await this.db.transaction(
      'rw',
      schedule_items,
      schedule_exceptions,
      schedule_checkins,
      async () => {
        await schedule_exceptions.where('schedule_item_id').equals(id).delete()
        await schedule_checkins.where('schedule_item_id').equals(id).delete()
        await schedule_items.delete(id)
      },
    )
  }

  async setOverride(id: string, date: LocalDate, changes: OverrideInput): Promise<void> {
    checkDate('date', date)
    checkTime('start_time', changes.start_time)
    checkTime('end_time', changes.end_time)
    const title = changes.title === undefined ? null : cleanTitle(changes.title)
    const item = await this.requireItem(id)
    checkTimeOrder(changes.start_time ?? item.start_time, changes.end_time ?? item.end_time)
    await this.saveException(id, date, {
      type: 'override',
      title,
      start_time: changes.start_time ?? null,
      end_time: changes.end_time ?? null,
    })
  }

  async skipDate(id: string, date: LocalDate): Promise<void> {
    checkDate('date', date)
    await this.requireItem(id)
    await this.saveException(id, date, {
      type: 'skip',
      title: null,
      start_time: null,
      end_time: null,
    })
  }

  async restoreDate(id: string, date: LocalDate): Promise<void> {
    checkDate('date', date)
    await this.db.schedule_exceptions.where('[schedule_item_id+date]').equals([id, date]).delete()
  }

  async setCheckin(id: string, date: LocalDate, done: boolean): Promise<void> {
    checkDate('date', date)
    const key = [id, date]
    if (!done) {
      await this.db.schedule_checkins.where('[schedule_item_id+date]').equals(key).delete()
      return
    }
    await this.requireItem(id)
    const stamp = this.now().toISOString()
    await this.db.transaction('rw', this.db.schedule_checkins, async () => {
      const existing = await this.db.schedule_checkins
        .where('[schedule_item_id+date]')
        .equals(key)
        .first()
      if (existing) return
      await this.db.schedule_checkins.add({
        id: newId(),
        schedule_item_id: id,
        date,
        done_at: stamp,
      })
    })
  }

  private async requireItem(id: string): Promise<ScheduleItem> {
    const item = await this.db.schedule_items.get(id)
    if (!item) throw new NotFoundError('Schedule item', id)
    return item
  }

  /** One exception per item and date: a new one replaces the old one (docs/08). */
  private async saveException(
    id: string,
    date: LocalDate,
    fields: Pick<ScheduleException, 'type' | 'title' | 'start_time' | 'end_time'>,
  ): Promise<void> {
    await this.db.transaction('rw', this.db.schedule_exceptions, async () => {
      const existing = await this.db.schedule_exceptions
        .where('[schedule_item_id+date]')
        .equals([id, date])
        .first()
      await this.db.schedule_exceptions.put({
        id: existing?.id ?? newId(),
        schedule_item_id: id,
        date,
        ...fields,
      })
    })
  }
}

function checkDateOrder(startsOn: LocalDate, endsOn: LocalDate | null): void {
  if (endsOn !== null && endsOn < startsOn)
    throw new ValidationError('ends_on', 'End date must not be before the start date.')
}

/** Sorted and without duplicates, so equal schedules look equal. */
function normalizeDays(days: readonly number[]): number[] {
  return [...new Set(days)].sort((a, b) => a - b)
}

/** `date` moved by `count` calendar days (no DST drift: works on the UTC calendar). */
function addDays(date: LocalDate, count: number): LocalDate {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d + count)).toISOString().slice(0, 10)
}
