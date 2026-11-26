import type { LocalDate } from '@/features/todos/types'
import type { StatsDayRow } from '@/lib/api'
import { colors } from '@/styles/tokens'

const RHYTHM_BAR_COLORS = [
  colors.primary,
  colors.primaryLight,
  colors.accent,
  colors.primary,
  colors.primaryLight,
  colors.accent,
  colors.primary,
] as const

export const RHYTHM_CHART_HEIGHT = 96
const MIN_ACTIVE_BAR_HEIGHT = 16
const INACTIVE_BAR_HEIGHT = 10

interface RhythmBarDatum {
  date: LocalDate
  label: string
  active: boolean
  barHeight: number
  fill: string
}

/** Weighted activity score for a day (focus duration + completed tasks/blocks). */
export function dayActivityScore(day: StatsDayRow): number {
  return day.focus_ms + day.todos_done * 300_000 + day.blocks_checked * 300_000
}

/** Compute normalized bar geometry and accessible labels for up to 7 recent days. */
export function buildRhythmBars(days: readonly StatsDayRow[], locale: string): RhythmBarDatum[] {
  const recent = days.slice(-7)
  if (recent.length === 0) return []

  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    weekday: 'narrow',
  })

  const scores = recent.map(dayActivityScore)
  const maxScore = Math.max(...scores, 1)

  return recent.map((day, index) => {
    const score = scores[index] ?? 0
    const active = score > 0
    const barHeight = active
      ? Math.max(MIN_ACTIVE_BAR_HEIGHT, Math.round((score / maxScore) * (RHYTHM_CHART_HEIGHT - 8)))
      : INACTIVE_BAR_HEIGHT
    const fill = active
      ? (RHYTHM_BAR_COLORS[index % RHYTHM_BAR_COLORS.length] ?? colors.primary)
      : colors.subtle
    const parts = day.local_date.split('-').map(Number)
    const [y = 2000, month = 1, d = 1] = parts
    const utcDate = new Date(Date.UTC(y, month - 1, d))
    const label = Number.isNaN(utcDate.getTime()) ? '' : weekdayFmt.format(utcDate)
    return { date: day.local_date, label, active, barHeight, fill }
  })
}
