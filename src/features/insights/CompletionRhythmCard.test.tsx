import { render, screen } from '@testing-library/react'
import { domAnimation, LazyMotion } from 'framer-motion'
import type { StatsDayRow, StatsSummary } from '@/lib/api'
import { colors } from '@/styles/tokens'
import { CompletionRhythmCard } from './CompletionRhythmCard'
import { buildRhythmBars, dayActivityScore } from './completionRhythm'

function makeDay(date: string, overrides: Partial<StatsDayRow> = {}): StatsDayRow {
  return {
    local_date: date,
    streak: 0,
    streak_may_be_longer: false,
    focus_ms: 0,
    break_ms: 0,
    sessions: 0,
    todos_done: 0,
    todos_due: 0,
    planned_block_minutes: 0,
    blocks_checked: 0,
    focus_ms_linked: 0,
    focus_ms_unplanned: 0,
    ...overrides,
  }
}

function makeSummary(days: StatsDayRow[]): StatsSummary {
  return {
    opening_streak: 0,
    opening_streak_may_be_longer: false,
    days,
    totals: {
      focus_ms: 0,
      break_ms: 0,
      sessions: 0,
      todos_done: 0,
      todos_due: 0,
      planned_block_minutes: 0,
      blocks_checked: 0,
      focus_ms_linked: 0,
      focus_ms_unplanned: 0,
    },
    by_mode: { countdown: 0, stopwatch: 0 },
  }
}

describe('CompletionRhythmCard', () => {
  it('computes weighted daily activity score from focus, todos, and blocks', () => {
    const day = makeDay('2026-11-23', { focus_ms: 600_000, todos_done: 2, blocks_checked: 1 })
    expect(dayActivityScore(day)).toBe(1_500_000)
  })

  it('builds at most 7 recent bars with inactive fallback height and color', () => {
    const days = Array.from({ length: 9 }, (_, i) =>
      makeDay(`2026-11-${String(19 + i).padStart(2, '0')}`, {
        focus_ms: i === 8 ? 1_200_000 : 0,
      }),
    )
    const bars = buildRhythmBars(days, 'en')
    expect(bars).toHaveLength(7)
    expect(bars[0]?.date).toBe('2026-11-21')
    expect(bars[0]?.active).toBe(false)
    expect(bars[0]?.fill).toBe(colors.subtle)
    expect(bars[0]?.barHeight).toBe(10)
    expect(bars[6]?.date).toBe('2026-11-27')
    expect(bars[6]?.active).toBe(true)
    expect(bars[6]?.barHeight).toBeGreaterThan(16)
  })

  it('handles empty days and malformed dates safely without throwing', () => {
    expect(buildRhythmBars([], 'en')).toEqual([])
    const bars = buildRhythmBars([makeDay('not-a-date', { todos_done: 1 })], 'en')
    expect(bars).toHaveLength(1)
    expect(bars[0]?.label).toBe('')
    expect(bars[0]?.active).toBe(true)
  })

  it('renders an accessible chart image and returns null when there are no days', () => {
    const empty = render(
      <LazyMotion features={domAnimation}>
        <CompletionRhythmCard summary={makeSummary([])} locale="en" />
      </LazyMotion>,
    )
    expect(empty.container).toBeEmptyDOMElement()

    const days = [
      makeDay('2026-11-23', { focus_ms: 900_000 }),
      makeDay('2026-11-24', { todos_done: 2 }),
      makeDay('2026-11-25'),
    ]
    render(
      <LazyMotion features={domAnimation}>
        <CompletionRhythmCard summary={makeSummary(days)} locale="en" />
      </LazyMotion>,
    )
    expect(screen.getByRole('heading', { name: /completion rhythm/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /3 days/i })).toBeInTheDocument()
  })
})
