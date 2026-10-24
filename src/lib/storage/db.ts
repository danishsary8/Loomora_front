import Dexie, { type EntityTable } from 'dexie'
import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { Todo } from '@/features/todos/types'

export const GUEST_DB_NAME = 'loomora-guest'

/** Guest data in IndexedDB (A8-4). Rows keep their client UUIDs for the later import. */
export class GuestDatabase extends Dexie {
  todos!: EntityTable<Todo, 'id'>
  schedule_items!: EntityTable<ScheduleItem, 'id'>
  schedule_exceptions!: EntityTable<ScheduleException, 'id'>
  schedule_checkins!: EntityTable<ScheduleCheckin, 'id'>

  constructor(name: string = GUEST_DB_NAME) {
    super(name)
    this.version(1).stores({
      todos: 'id, due_date, created_at',
    })
    // Unique (item, date) pairs match docs/08 for exceptions and check-ins.
    this.version(2).stores({
      schedule_items: 'id',
      schedule_exceptions: 'id, schedule_item_id, date, &[schedule_item_id+date]',
      schedule_checkins: 'id, schedule_item_id, date, &[schedule_item_id+date]',
    })
  }
}
