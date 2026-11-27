import { m, useReducedMotion } from 'framer-motion'
import { progressDrawTransition } from '@/styles/motion'
import { colors } from '@/styles/tokens'

export interface ProgressRingProps {
  value: number
  max: number
  /** Accessible and visible label, e.g. "3 of 7 done". */
  label: string
  size?: number
}

const STROKE = 8

export function ProgressRing({ value, max, label, size = 112 }: ProgressRingProps) {
  const reduceMotion = useReducedMotion()
  const reduced = Boolean(reduceMotion)
  const clamped = Math.min(Math.max(value, 0), Math.max(max, 0))
  const ratio = max > 0 ? clamped / max : 0
  const center = size / 2
  const radius = center - STROKE / 2 - 2
  const circumference = 2 * Math.PI * radius
  const targetOffset = circumference * (1 - ratio)

  return (
    <figure className="inline-flex flex-col items-center gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clamped}
        aria-valuetext={label}
        aria-label={label}
        className="relative"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.borderSubtle}
            strokeWidth={STROKE}
          />
          <m.circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.primary}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={reduced ? false : { strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: targetOffset }}
            transition={progressDrawTransition(reduced)}
            transform={`rotate(-90 ${center} ${center})`}
          />
        </svg>
        <span
          className="absolute inset-0 grid place-items-center text-2xl font-bold tabular-nums text-ink"
          aria-hidden="true"
        >
          {clamped}/{max}
        </span>
      </div>
      <figcaption className="text-sm font-medium text-muted" aria-hidden="true">
        {label}
      </figcaption>
    </figure>
  )
}
