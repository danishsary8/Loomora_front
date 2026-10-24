import { buildTodayList, OLD_AFTER_DAYS } from './todayList'
import type { Todo } from './types'

const TODAY = '2026-10-24'
let seq = 0

function todo(overrides: Partial<Todo> = {}): Todo {
  seq += 1
  const stamp = `2026-10-01T08:00:${String(seq).padStart(2, '0')}.000Z`
  return {
    id: `t${seq}`,
    title: `Todo ${seq}`,
    category: 'other',
    due_date: null,
    done_at: null,
    created_at: stamp,
    updated_at: stamp,
    ...overrides,
  }
}

const DONE = '2026-10-24T09:00:00.000Z'
const ids = (list: { id: string }[]) => list.map((t) => t.id)

describe('buildTodayList (docs/08 rules 1 and 2)', () => {
  describe('rule 1: what is on Today', () => {
    it('includes a to-do due today that is not done', () => {
      const t = todo({ due_date: TODAY })
      expect(buildTodayList([t], TODAY)).toEqual([{ ...t, overdue: false, old: false }])
    })

    it('keeps a to-do due today after it is done, so the check stays visible', () => {
      const t = todo({ due_date: TODAY, done_at: DONE })
      expect(ids(buildTodayList([t], TODAY))).toEqual([t.id])
    })

    it('includes an undated to-do that is not done', () => {
      const t = todo({ due_date: null })
      expect(buildTodayList([t], TODAY)).toEqual([{ ...t, overdue: false, old: false }])
    })

    it('leaves out an undated to-do that is done', () => {
      expect(buildTodayList([todo({ due_date: null, done_at: DONE })], TODAY)).toEqual([])
    })

    it('hides a to-do due in the future until its day, done or not', () => {
      const future = [
        todo({ due_date: '2026-10-25' }),
        todo({ due_date: '2027-01-01', done_at: DONE }),
      ]
      expect(buildTodayList(future, TODAY)).toEqual([])
    })

    it('shows the future to-do once its day comes', () => {
      const t = todo({ due_date: '2026-10-25' })
      expect(ids(buildTodayList([t], '2026-10-25'))).toEqual([t.id])
    })
  })

  describe('rule 2: Overdue is computed, not stored', () => {
    it('flags a past, unfinished to-do as overdue', () => {
      const t = todo({ due_date: '2026-10-23' })
      expect(buildTodayList([t], TODAY)).toEqual([{ ...t, overdue: true, old: false }])
    })

    it('leaves out a past to-do that is done', () => {
      expect(buildTodayList([todo({ due_date: '2026-10-20', done_at: DONE })], TODAY)).toEqual([])
    })

    it('carries over day after day with no job: same item, later dates', () => {
      const t = todo({ due_date: '2026-10-23' })
      for (const day of ['2026-10-24', '2026-10-25', '2026-11-05']) {
        expect(buildTodayList([t], day)[0]?.overdue).toBe(true)
      }
    })

    it('is no longer overdue once checked off', () => {
      const t = todo({ due_date: '2026-10-23' })
      expect(buildTodayList([{ ...t, done_at: DONE }], TODAY)).toEqual([])
    })

    it(`marks overdue items as "Old" only after ${OLD_AFTER_DAYS} days`, () => {
      const exactly30 = todo({ due_date: '2026-09-24' })
      const days31 = todo({ due_date: '2026-09-23' })
      const list = buildTodayList([exactly30, days31], TODAY)
      expect(list.find((t) => t.id === exactly30.id)).toMatchObject({ overdue: true, old: false })
      expect(list.find((t) => t.id === days31.id)).toMatchObject({ overdue: true, old: true })
    })

    it('still shows very old overdue items', () => {
      const t = todo({ due_date: '2025-01-01' })
      expect(buildTodayList([t], TODAY)).toEqual([{ ...t, overdue: true, old: true }])
    })

    it('counts calendar days across month, year and DST changes', () => {
      expect(buildTodayList([todo({ due_date: '2026-02-28' })], '2026-03-01')[0]).toMatchObject({
        overdue: true,
        old: false,
      })
      expect(buildTodayList([todo({ due_date: '2025-12-31' })], '2026-01-01')[0]?.overdue).toBe(
        true,
      )
      // 2026-03-08 (US) and 2026-03-29 (EU) DST switches fall inside this 31-day span.
      expect(buildTodayList([todo({ due_date: '2026-03-01' })], '2026-04-01')[0]?.old).toBe(true)
      expect(buildTodayList([todo({ due_date: '2026-03-02' })], '2026-04-01')[0]?.old).toBe(false)
    })
  })

  describe('order (docs/04: Overdue first)', () => {
    it('puts overdue first, oldest due date first, then the rest by creation time', () => {
      const undatedFirst = todo({ due_date: null })
      const dueToday = todo({ due_date: TODAY })
      const overdueRecent = todo({ due_date: '2026-10-22' })
      const overdueOld = todo({ due_date: '2026-08-01' })
      const undatedLast = todo({ due_date: null })

      const list = buildTodayList(
        [undatedLast, dueToday, overdueRecent, undatedFirst, overdueOld],
        TODAY,
      )
      expect(ids(list)).toEqual([
        overdueOld.id,
        overdueRecent.id,
        undatedFirst.id,
        dueToday.id,
        undatedLast.id,
      ])
    })

    it('orders overdue items with the same due date by creation time', () => {
      const a = todo({ due_date: '2026-10-20' })
      const b = todo({ due_date: '2026-10-20' })
      expect(ids(buildTodayList([b, a], TODAY))).toEqual([a.id, b.id])
    })
  })

  it('breaks created_at ties by id, whatever order storage returns', () => {
    const stamp = '2026-10-24T08:00:00.000Z'
    const b = todo({ id: 'b', created_at: stamp })
    const a = todo({ id: 'a', created_at: stamp })
    expect(ids(buildTodayList([b, a], TODAY))).toEqual(['a', 'b'])
    expect(ids(buildTodayList([a, b], TODAY))).toEqual(['a', 'b'])
  })

  it('does not change its input', () => {
    const input = [todo({ due_date: '2026-10-01' }), todo()]
    const copy = structuredClone(input)
    buildTodayList(input, TODAY)
    expect(input).toEqual(copy)
  })

  it('returns an empty list for no to-dos', () => {
    expect(buildTodayList([], TODAY)).toEqual([])
  })
})
