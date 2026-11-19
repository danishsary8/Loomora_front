import Dexie, { type EntityTable } from 'dexie'
import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import { DEFAULT_PRIORITY, type Todo } from '@/features/todos/types'

import type { DailyIntentionRecord } from '@/lib/api/types'
import type { TimePreferences } from '@/lib/time/time'

export const GUEST_DB_NAME = 'loomora-guest'

/** Guest data in IndexedDB (A8-4). Rows keep their client UUIDs for the later import. */
export class GuestDatabase extends Dexie {
  meta!: EntityTable<{ key: string; value: TimePreferences }, 'key'>
  dailyIntentions!: EntityTable<DailyIntentionRecord, 'date'>
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
    // Soft-delete support (F-022).
    this.version(3).stores({
      todos: 'id, due_date, created_at, deleted_at',
    })
    this.version(4)
      .stores({ todos: 'id, due_date, created_at, deleted_at, parent_id' })
      .upgrade((tx) =>
        tx.table<Todo>('todos').toCollection().modify({
          priority: DEFAULT_PRIORITY,
          notes: null,
          parent_id: null,
        }),
      )
    // Repeat fields are stored but do not need indexes.
    this.version(5).upgrade((tx) =>
      tx.table<Todo>('todos').toCollection().modify({ repeat_rule: null, next_todo_id: null }),
    )
    this.version(6).upgrade((tx) =>
      tx.table<Todo>('todos').toCollection().modify({ remind_at: null, remind_dismissed_at: null }),
    )
    this.version(7).stores({ meta: 'key' })
    this.version(8).stores({ dailyIntentions: 'date' })
  }
}
