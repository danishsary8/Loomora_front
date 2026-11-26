import type { FocusSession } from '@/features/focus/types'
import type {
  ScheduleCheckin,
  ScheduleException,
  ScheduleItem,
  Weekday,
} from '@/features/schedule/types'
import type { Todo } from '@/features/todos/types'
import fixture from './fixtures/stats-summary-cases.json'
import {
  addDaysLocalDate,
  computeGuestStatsSummary,
  isEmptyStatsSummary,
  weekBoundsForDate,
} from './computeStatsSummary'

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  const stamp = '2026-11-23T01:00:00.000Z'
  return {
    id: crypto.randomUUID(),
    title: 'Task',
    category: 'study',
    priority: 'normal',
    notes: null,
    parent_id: null,
    repeat_rule: null,
    next_todo_id: null,
    remind_at: null,
    remind_dismissed_at: null,
    due_date: '2026-11-23',
    done_at: null,
    created_at: stamp,
    updated_at: stamp,
    ...overrides,
  }
}

describe('computeGuestStatsSummary (B-047 guest parity)', () => {
  it('matches the shared backend stats-summary-cases.json fixture exactly', () => {
    const itemId = crypto.randomUUID()
    const items: ScheduleItem[] = [
      {
        id: itemId,
        title: 'Study block',
        category: 'study',
        start_time: fixture.schedule.start_time,
        end_time: fixture.schedule.end_time,
        days: fixture.schedule.days as Weekday[],
        starts_on: '2026-11-01',
        ends_on: null,
        created_at: '2026-11-01T00:00:00.000Z',
        updated_at: '2026-11-01T00:00:00.000Z',
      },
    ]
    const exceptions: ScheduleException[] = fixture.exceptions.map((ex) => ({
      id: crypto.randomUUID(),
      schedule_item_id: itemId,
      date: ex.date,
      type: ex.type as 'skip' | 'override',
      title: null,
      start_time: 'start_time' in ex ? (ex.start_time ?? null) : null,
      end_time: 'end_time' in ex ? (ex.end_time ?? null) : null,
    }))
    const checkins: ScheduleCheckin[] = fixture.checkins.map((date) => ({
      id: crypto.randomUUID(),
      schedule_item_id: itemId,
      date,
      done_at: `${date}T03:00:00.000Z`,
    }))
    const sessions: FocusSession[] = fixture.sessions.map((row) => ({
      id: crypto.randomUUID(),
      mode: row.mode as 'countdown' | 'stopwatch',
      started_at: `${row.local_date}T01:00:00.000Z`,
      ended_at: `${row.local_date}T01:30:00.000Z`,
      end_reason: 'completed',
      planned_focus_ms: row.mode === 'countdown' ? row.focus_ms : null,
      todo_id: row.linked ? crypto.randomUUID() : null,
      schedule_item_id: null,
      label: null,
      segments: [
        {
          type: 'focus',
          started_at: `${row.local_date}T01:00:00.000Z`,
          ended_at: `${row.local_date}T01:25:00.000Z`,
          active_ms: row.focus_ms,
        },
      ],
      laps: null,
      local_date: row.local_date,
      focus_ms: row.focus_ms,
      break_ms: row.break_ms,
      paused_ms: 0,
      created_at: `${row.local_date}T01:30:00.000Z`,
    }))

    const actual = computeGuestStatsSummary({
      from: fixture.from,
      to: fixture.to,
      timeZone: fixture.timezone,
      todos: [],
      items,
      exceptions,
      checkins,
      sessions,
    })

    expect(actual).toEqual(fixture.expected)
    expect(isEmptyStatsSummary(actual)).toBe(false)
  })

  it('places todo completions in the account/device timezone and excludes deleted todos', () => {
    const todos = [
      // 2026-11-23T17:30:00Z is 2026-11-24 00:30 in Asia/Phnom_Penh (+07:00)
      makeTodo({ due_date: '2026-11-23', done_at: '2026-11-23T17:30:00.000Z' }),
      makeTodo({
        due_date: '2026-11-23',
        done_at: '2026-11-23T05:00:00.000Z',
        deleted_at: '2026-11-23T06:00:00.000Z',
      }),
    ]
    const result = computeGuestStatsSummary({
      from: '2026-11-23',
      to: '2026-11-24',
      timeZone: 'Asia/Phnom_Penh',
      todos,
      items: [],
      exceptions: [],
      checkins: [],
      sessions: [],
    })

    expect(result.days[0]).toMatchObject({ local_date: '2026-11-23', todos_due: 1, todos_done: 0 })
    expect(result.days[1]).toMatchObject({ local_date: '2026-11-24', todos_due: 0, todos_done: 1 })
    expect(result.totals).toMatchObject({ todos_due: 1, todos_done: 1 })
  })

  it('allows exactly 92 days and rejects 93 days or reversed ranges', () => {
    const from = '2026-01-01'
    const ninetySecond = addDaysLocalDate(from, 91)
    const ninetyThird = addDaysLocalDate(from, 92)

    const valid = computeGuestStatsSummary({
      from,
      to: ninetySecond,
      timeZone: 'UTC',
      todos: [],
      items: [],
      exceptions: [],
      checkins: [],
      sessions: [],
    })
    expect(valid.days).toHaveLength(92)
    expect(isEmptyStatsSummary(valid)).toBe(true)

    expect(() =>
      computeGuestStatsSummary({
        from,
        to: ninetyThird,
        timeZone: 'UTC',
        todos: [],
        items: [],
        exceptions: [],
        checkins: [],
        sessions: [],
      }),
    ).toThrow(/92/)

    expect(() =>
      computeGuestStatsSummary({
        from: '2026-01-10',
        to: '2026-01-09',
        timeZone: 'UTC',
        todos: [],
        items: [],
        exceptions: [],
        checkins: [],
        sessions: [],
      }),
    ).toThrow(/Invalid/)
  })

  it('computes Monday-first and Sunday-first week boundaries accurately', () => {
    // 2026-11-26 is Thursday
    expect(weekBoundsForDate('2026-11-26', 1)).toEqual({ from: '2026-11-23', to: '2026-11-29' })
    expect(weekBoundsForDate('2026-11-26', 7)).toEqual({ from: '2026-11-22', to: '2026-11-28' })
    // Sunday itself
    expect(weekBoundsForDate('2026-11-29', 1)).toEqual({ from: '2026-11-23', to: '2026-11-29' })
    expect(weekBoundsForDate('2026-11-29', 7)).toEqual({ from: '2026-11-29', to: '2026-12-05' })
  })
})
