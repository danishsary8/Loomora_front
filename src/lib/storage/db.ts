import Dexie, { type EntityTable } from 'dexie'
import type { Todo } from '@/features/todos/types'

export const GUEST_DB_NAME = 'loomora-guest'

/** Guest data in IndexedDB (A8-4). Rows keep their client UUIDs for the later import. */
export class GuestDatabase extends Dexie {
  todos!: EntityTable<Todo, 'id'>

  constructor(name: string = GUEST_DB_NAME) {
    super(name)
    this.version(1).stores({
      todos: 'id, due_date, created_at',
    })
  }
}
