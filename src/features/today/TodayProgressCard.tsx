import { m, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { progressDrawTransition, useCountUp } from '@/styles/motion'
import { colors } from '@/styles/tokens'

const SIZE = 64
const STROKE = 6

/** Concept "Today's progress" card: forest gradient, soft inner glow, bar, and percentage ring. */
export function TodayProgressCard({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const reduced = Boolean(reduceMotion)
  const ratio = total > 0 ? Math.min(done, total) / total : 0
  const percent = Math.round(ratio * 100)
  const displayedPercent = useCountUp(percent, { reduced })
  const label = t('progress.doneOfTotal', { done, total })
  const radius = SIZE / 2 - STROKE / 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference * (1 - ratio)
  const drawTransition = progressDrawTransition(reduced)

  return (
    <section
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={label}
      aria-label={label}
      className="relative flex items-center gap-4 overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary-light p-5 text-white shadow-soft-md ring-1 ring-inset ring-white/15"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 size-36 rounded-full bg-white/10 blur-2xl"
      />
      <div className="relative flex min-w-0 flex-1 flex-col gap-1" aria-hidden="true">
        <p className="text-sm font-medium text-white/85">{t('today.progressTitle')}</p>
        <p className="text-2xl font-bold tabular-nums leading-tight">{label}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
          <m.div
            className="h-full rounded-full bg-category-health"
            initial={reduced ? false : { width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={drawTransition}
          />
        </div>
      </div>
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }} aria-hidden="true">
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth={STROKE}
          />
          <m.circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke={colors.category.health}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduced ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={drawTransition}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">
          {displayedPercent}%
        </span>
      </div>
    </section>
  )
}
