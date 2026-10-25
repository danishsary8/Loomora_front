import type { Occurrence, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { ScheduleRepository } from './ScheduleRepository'

/**
 * Account schedule via the API (docs/09 `/schedule`). Stub until the account tasks;
 * every method rejects so it cannot be used by mistake.
 */
export class ServerScheduleRepository implements ScheduleRepository {
  listItems(): Promise<ScheduleItem[]> {
    return notYet('listItems')
  }

  listForDate(): Promise<Occurrence[]> {
    return notYet('listForDate')
  }

  create(): Promise<ScheduleItem> {
    return notYet('create')
  }

  update(): Promise<ScheduleItem> {
    return notYet('update')
  }

  delete(): Promise<void> {
    return notYet('delete')
  }

  setException(): Promise<ScheduleException> {
    return notYet('setException')
  }

  removeException(): Promise<void> {
    return notYet('removeException')
  }

  setCheckin(): Promise<void> {
    return notYet('setCheckin')
  }
}

function notYet(method: string): Promise<never> {
  return Promise.reject(new Error(`ServerScheduleRepository.${method} is not implemented yet`))
}
