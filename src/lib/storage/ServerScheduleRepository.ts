import type {
  CreateScheduleItemInput,
  ExceptionInput,
  Occurrence,
  ScheduleException,
  ScheduleItem,
  UpdateScheduleItemInput,
} from '@/features/schedule/types'
import type { LocalDate } from '@/features/todos/types'
import type { ScheduleApi } from '@/lib/api'
import type { ScheduleRepository } from './ScheduleRepository'
import { asValidation, toException, toOccurrence, toScheduleItem } from './serverMapping'

/** Account schedule via the API (docs/09 `/schedule`). */
export class ServerScheduleRepository implements ScheduleRepository {
  private readonly api: ScheduleApi

  constructor(api: ScheduleApi) {
    this.api = api
  }

  async listItems(): Promise<ScheduleItem[]> {
    return (await this.api.listItems()).map(toScheduleItem)
  }

  async listForDate(date: LocalDate): Promise<Occurrence[]> {
    return (await this.api.day(date)).map(toOccurrence)
  }

  async create(input: CreateScheduleItemInput): Promise<ScheduleItem> {
    return toScheduleItem(await asValidation(this.api.create(input)))
  }

  async update(id: string, patch: UpdateScheduleItemInput): Promise<ScheduleItem> {
    return toScheduleItem(await asValidation(this.api.update(id, patch)))
  }

  delete(id: string): Promise<void> {
    return this.api.remove(id)
  }

  async setException(
    id: string,
    date: LocalDate,
    input: ExceptionInput,
  ): Promise<ScheduleException> {
    return toException(await asValidation(this.api.setException(id, date, input)))
  }

  removeException(id: string, date: LocalDate): Promise<void> {
    return this.api.removeException(id, date)
  }

  async setCheckin(id: string, date: LocalDate, done: boolean): Promise<void> {
    await (done ? this.api.setCheckin(id, date) : this.api.removeCheckin(id, date))
  }
}
