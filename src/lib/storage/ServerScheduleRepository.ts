import type { NowNext, Occurrence, ScheduleItem } from '@/features/schedule/types'
import type { ScheduleRepository } from './ScheduleRepository'

/**
 * Account schedule via the API (docs/09 `/schedule`). Stub until the account tasks (P4/P5);
 * every method rejects so it cannot be used by mistake.
 */
export class ServerScheduleRepository implements ScheduleRepository {
  listItems(): Promise<ScheduleItem[]> {
    return notYet('listItems')
  }

  listForDate(): Promise<Occurrence[]> {
    return notYet('listForDate')
  }

  listForWeek(): Promise<Occurrence[][]> {
    return notYet('listForWeek')
  }

  nowAndNext(): Promise<NowNext> {
    return notYet('nowAndNext')
  }

  createItem(): Promise<ScheduleItem> {
    return notYet('createItem')
  }

  updateItem(): Promise<ScheduleItem> {
    return notYet('updateItem')
  }

  deleteItem(): Promise<void> {
    return notYet('deleteItem')
  }

  setOverride(): Promise<void> {
    return notYet('setOverride')
  }

  skipDate(): Promise<void> {
    return notYet('skipDate')
  }

  restoreDate(): Promise<void> {
    return notYet('restoreDate')
  }

  setCheckin(): Promise<void> {
    return notYet('setCheckin')
  }
}

function notYet(method: string): Promise<never> {
  return Promise.reject(new Error(`ServerScheduleRepository.${method} is not implemented yet`))
}
