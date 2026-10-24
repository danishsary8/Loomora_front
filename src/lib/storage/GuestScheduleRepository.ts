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
import { GuestDatabase } from './db'
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

  listExceptions(): Promise<ScheduleException[]> {
    return this.db.schedule_exceptions.toArray()
  }

  listCheckins(): Promise<ScheduleCheckin[]> {
    return this.db.schedule_checkins.toArray()
  }

  async listForDate(date: LocalDate): Promise<Occurrence[]> {
    const [items, exceptions, checkins] = await Promise.all([
      this.db.schedule_items.toArray(),
      this.db.schedule_exceptions.where('date').equals(date).toArray(),
      this.db.schedule_checkins.where('date').equals(date).toArray(),
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

  async update(id: string, patch: UpdateScheduleItemInput): Promise<ScheduleItem> {
    const current = await this.requireItem(id)
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
    await this.db.schedule_items.put(next)
    return next
  }

  async delete(id: string): Promise<void> {
    const { schedule_items: items, schedule_exceptions, schedule_checkins } = this.db
    await this.db.transaction('rw', items, schedule_exceptions, schedule_checkins, async () => {
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
    const item = await this.requireOccurringItem(id, date)
    const exception = this.buildException(item, date, input)
    const stored = await this.db.transaction('rw', this.db.schedule_exceptions, async () => {
      const existing = await this.findException(id, date)
      const row = existing ? { ...exception, id: existing.id } : exception
      await this.db.schedule_exceptions.put(row)
      return row
    })
    return stored
  }

  async removeException(id: string, date: LocalDate): Promise<void> {
    await this.db.schedule_exceptions.where('[schedule_item_id+date]').equals([id, date]).delete()
  }

  async setCheckin(id: string, date: LocalDate, done: boolean): Promise<void> {
    if (!done) {
      await this.db.schedule_checkins.where('[schedule_item_id+date]').equals([id, date]).delete()
      return
    }
    await this.requireOccurringItem(id, date)
    await this.db.transaction('rw', this.db.schedule_checkins, async () => {
      const existing = await this.db.schedule_checkins
        .where('[schedule_item_id+date]')
        .equals([id, date])
        .first()
      if (existing) return
      await this.db.schedule_checkins.add({
        id: newId(),
        schedule_item_id: id,
        date,
        done_at: this.now().toISOString(),
      })
    })
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

  private findException(id: string, date: LocalDate) {
    return this.db.schedule_exceptions.where('[schedule_item_id+date]').equals([id, date]).first()
  }

  private async requireItem(id: string): Promise<ScheduleItem> {
    const item = await this.db.schedule_items.get(id)
    if (!item) throw new NotFoundError('Schedule item', id)
    return item
  }

  private async requireOccurringItem(id: string, date: LocalDate): Promise<ScheduleItem> {
    checkDate('date', date)
    const item = await this.requireItem(id)
    if (!occursOn(item, date))
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
