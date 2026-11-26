import type { FocusSession } from '@/features/focus/types'
import { occurrencesForDate, weekdayOf } from '@/features/schedule/occurrences'
import type { ScheduleCheckin, ScheduleException, ScheduleItem } from '@/features/schedule/types'
import type { LocalDate, Todo } from '@/features/todos/types'
import type { StatsDayRow, StatsMetrics, StatsSummary } from '@/lib/api/types'
import { addDaysLocalDate, daysBetweenLocalDates, isLocalDate, localDateIn } from '@/lib/date'
import type { WeekStart } from '@/lib/time/time'

export const MAX_STATS_RANGE_DAYS = 92
const STREAK_LOOKBACK_DAYS = 400
const FIRST_SUPPORTED_DATE = '0001-01-01'

function emptyMetrics(): StatsMetrics {
  return {
    focus_ms: 0,
    break_ms: 0,
    sessions: 0,
    todos_done: 0,
    todos_due: 0,
    planned_block_minutes: 0,
    blocks_checked: 0,
    focus_ms_linked: 0,
    focus_ms_unplanned: 0,
  }
}

function minutesSinceMidnight(time: string): number {
  const [hours, minutes] = time.split(':').map(Number) as [number, number]
  return hours * 60 + minutes
}

/** Inclusive `[from, to]` 7-day calendar week containing `anchorDate`, honoring `weekStartsOn`. */
export function weekBoundsForDate(
  anchorDate: LocalDate,
  weekStartsOn: WeekStart = 1,
): { from: LocalDate; to: LocalDate } {
  const day = weekdayOf(anchorDate) + 1
  const offset = (day - weekStartsOn + 7) % 7
  const from = addDaysLocalDate(anchorDate, -offset)
  return { from, to: addDaysLocalDate(from, 6) }
}

export interface GuestStatsInput {
  from: LocalDate
  to: LocalDate
  timeZone: string
  today: LocalDate
  todos: readonly Todo[]
  items: readonly ScheduleItem[]
  exceptions: readonly ScheduleException[]
  checkins: readonly ScheduleCheckin[]
  sessions: readonly FocusSession[]
}

/**
 * Pure guest-mode calculation matching backend B-047 and B-051 `GET /stats/summary` (`StatsSummaryService`).
 */
export function computeGuestStatsSummary({
  from,
  to,
  timeZone,
  today,
  todos,
  items,
  exceptions,
  checkins,
  sessions,
}: GuestStatsInput): StatsSummary {
  if (!isLocalDate(from) || !isLocalDate(to) || from < FIRST_SUPPORTED_DATE || to < from) {
    throw new RangeError('Invalid date range for stats summary.')
  }
  const span = daysBetweenLocalDates(to, from) + 1
  if (span > MAX_STATS_RANGE_DAYS) {
    throw new RangeError(`Stats summary range cannot exceed ${MAX_STATS_RANGE_DAYS} days.`)
  }

  const itemIds = new Set(items.map((item) => item.id))
  const counted = new Set(
    checkins
      .filter((checkin) => itemIds.has(checkin.schedule_item_id))
      .map((checkin) => checkin.date),
  )
  const planned = new Set<LocalDate>()
  const schedulePlan = new Map<LocalDate, boolean>()

  function streakAt(date: LocalDate): Pick<StatsDayRow, 'streak' | 'streak_may_be_longer'> {
    let streak = 0
    for (let offset = 0; offset <= STREAK_LOOKBACK_DAYS; offset += 1) {
      const day = addDaysLocalDate(date, -offset)
      if (day < FIRST_SUPPORTED_DATE) return { streak, streak_may_be_longer: false }
      if (counted.has(day)) {
        streak += 1
      } else if (day !== today) {
        let hasSchedule = schedulePlan.get(day)
        if (hasSchedule === undefined) {
          hasSchedule = occurrencesForDate(items, exceptions, [], day).length > 0
          schedulePlan.set(day, hasSchedule)
        }
        if (planned.has(day) || hasSchedule) return { streak, streak_may_be_longer: false }
      }
      if (day === FIRST_SUPPORTED_DATE) return { streak, streak_may_be_longer: false }
    }
    return { streak, streak_may_be_longer: streak > 0 }
  }

  const byDate = new Map<LocalDate, StatsMetrics>()
  for (let i = 0; i < span; i += 1) {
    const date = addDaysLocalDate(from, i)
    const metrics = emptyMetrics()
    const occurrences = occurrencesForDate(items, exceptions, checkins, date)
    schedulePlan.set(date, occurrences.length > 0)
    for (const occurrence of occurrences) {
      metrics.planned_block_minutes +=
        minutesSinceMidnight(occurrence.end_time) - minutesSinceMidnight(occurrence.start_time)
      if (occurrence.done) metrics.blocks_checked += 1
    }
    byDate.set(date, metrics)
  }

  const byMode = { countdown: 0, stopwatch: 0 }
  for (const session of sessions) {
    const day = byDate.get(session.local_date)
    if (!day) continue
    const linked = session.todo_id !== null || session.schedule_item_id !== null
    day.focus_ms += session.focus_ms
    day.break_ms += session.break_ms
    day.sessions += 1
    if (linked) day.focus_ms_linked += session.focus_ms
    else day.focus_ms_unplanned += session.focus_ms
    byMode[session.mode] += session.focus_ms
  }

  for (const todo of todos) {
    if (todo.deleted_at) continue
    if (todo.due_date !== null) {
      planned.add(todo.due_date)
      const dueDay = byDate.get(todo.due_date)
      if (dueDay) dueDay.todos_due += 1
    }
    if (todo.done_at !== null) {
      const doneDate = localDateIn(todo.done_at, timeZone)
      counted.add(doneDate)
      const doneDay = byDate.get(doneDate)
      if (doneDay) doneDay.todos_done += 1
    }
  }

  const totals = emptyMetrics()
  const days: StatsDayRow[] = []
  for (const [local_date, metrics] of byDate) {
    totals.focus_ms += metrics.focus_ms
    totals.break_ms += metrics.break_ms
    totals.sessions += metrics.sessions
    totals.todos_done += metrics.todos_done
    totals.todos_due += metrics.todos_due
    totals.planned_block_minutes += metrics.planned_block_minutes
    totals.blocks_checked += metrics.blocks_checked
    totals.focus_ms_linked += metrics.focus_ms_linked
    totals.focus_ms_unplanned += metrics.focus_ms_unplanned
    days.push({ local_date, ...metrics, ...streakAt(local_date) })
  }

  const opening = streakAt(addDaysLocalDate(from, -1))
  return {
    opening_streak: opening.streak,
    opening_streak_may_be_longer: opening.streak_may_be_longer,
    days,
    totals,
    by_mode: byMode,
  }
}

/** True when every total metric in the summary is zero. */
export function isEmptyStatsSummary(summary: StatsSummary): boolean {
  const { totals } = summary
  return (
    totals.focus_ms === 0 &&
    totals.break_ms === 0 &&
    totals.sessions === 0 &&
    totals.todos_done === 0 &&
    totals.todos_due === 0 &&
    totals.planned_block_minutes === 0 &&
    totals.blocks_checked === 0
  )
}
