import type {
  CreateScheduleItemInput,
  LocalTime,
  NowNext,
  Occurrence,
  OverrideInput,
  ScheduleItem,
  UpdateScheduleItemInput,
} from '@/features/schedule/types'
import type { LocalDate } from '@/features/todos/types'

/**
 * Storage adapter for the schedule (A8-5): the UI talks to this interface and does not know
 * whether data lives on the device (guest) or on the server (account).
 */
export interface ScheduleRepository {
  /** The repeat definitions. */
  listItems(): Promise<ScheduleItem[]>
  /** Occurrences on `date`, exceptions applied and check-in state included (docs/08 rule 4). */
  listForDate(date: LocalDate): Promise<Occurrence[]>
  /** Occurrences for the 7 days from `start`, one list per day. */
  listForWeek(start: LocalDate): Promise<Occurrence[][]>
  /** Now and Next on `date` at `time` (docs/08 rule 6). */
  nowAndNext(date: LocalDate, time: LocalTime): Promise<NowNext>
  createItem(input: CreateScheduleItemInput): Promise<ScheduleItem>
  /** "All repeats" edit (docs/08 rule 5). */
  updateItem(id: string, patch: UpdateScheduleItemInput): Promise<ScheduleItem>
  /** Delete "all repeats": the item with its exceptions and check-ins (docs/08 rule 5). */
  deleteItem(id: string): Promise<void>
  /** "Only today" edit: change title or times for `date` only (docs/08 rule 5). */
  setOverride(id: string, date: LocalDate, changes: OverrideInput): Promise<void>
  /** Delete "only today": hide the occurrence on `date` only (docs/08 rule 5). */
  skipDate(id: string, date: LocalDate): Promise<void>
  /** Remove the exception for `date`, so the item looks as usual again. */
  restoreDate(id: string, date: LocalDate): Promise<void>
  /** Mark the occurrence on `date` done or not done (docs/08 rule 7). */
  setCheckin(id: string, date: LocalDate, done: boolean): Promise<void>
}
