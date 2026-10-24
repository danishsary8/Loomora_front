import type {
  CreateScheduleItemInput,
  ExceptionInput,
  Occurrence,
  ScheduleCheckin,
  ScheduleException,
  ScheduleItem,
  UpdateScheduleItemInput,
} from '@/features/schedule/types'
import type { LocalDate } from '@/features/todos/types'

/**
 * Storage adapter for the schedule (A8-5): the UI does not know whether data lives on the
 * device (guest) or on the server (account). Mirrors docs/09 `/schedule`.
 */
export interface ScheduleRepository {
  /** The repeat definitions. */
  listItems(): Promise<ScheduleItem[]>
  /** Every one-day change (used by the streak). */
  listExceptions(): Promise<ScheduleException[]>
  /** Every check-in (used by the streak). */
  listCheckins(): Promise<ScheduleCheckin[]>
  /** Occurrences on `date`, exceptions applied, with check-in state (docs/08 rules 4, 5, 7). */
  listForDate(date: LocalDate): Promise<Occurrence[]>
  create(input: CreateScheduleItemInput): Promise<ScheduleItem>
  /** "All repeats" edit (docs/08 rule 5). */
  update(id: string, patch: UpdateScheduleItemInput): Promise<ScheduleItem>
  /** Delete the item with its exceptions and check-ins (docs/08 rule 5). */
  delete(id: string): Promise<void>
  /** "Only that day": skip or override. Replaces any earlier exception for that date. */
  setException(id: string, date: LocalDate, input: ExceptionInput): Promise<ScheduleException>
  /** Restore that day. */
  removeException(id: string, date: LocalDate): Promise<void>
  /** Mark an occurrence done or undo it (docs/08 rule 7). */
  setCheckin(id: string, date: LocalDate, done: boolean): Promise<void>
}
