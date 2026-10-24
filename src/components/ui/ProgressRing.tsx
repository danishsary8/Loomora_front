import { colors } from '@/styles/tokens'

export interface ProgressRingProps {
  value: number
  max: number
  /** Accessible and visible label, e.g. "3 of 7 done". */
  label: string
  size?: number
}

const STROKE = 10

export function ProgressRing({ value, max, label, size = 112 }: ProgressRingProps) {
  const clamped = Math.min(Math.max(value, 0), Math.max(max, 0))
  const ratio = max > 0 ? clamped / max : 0
  const center = size / 2
  const radius = center - STROKE / 2 - 3
  const circumference = 2 * Math.PI * radius

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
            stroke={colors.paper}
            strokeWidth={STROKE}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.success}
            strokeWidth={STROKE}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-[stroke-dashoffset] duration-500 ease-out"
          />
          <circle
            cx={center}
            cy={center}
            r={radius + STROKE / 2}
            fill="none"
            stroke={colors.ink}
            strokeWidth={3}
          />
          <circle
            cx={center}
            cy={center}
            r={radius - STROKE / 2}
            fill="none"
            stroke={colors.ink}
            strokeWidth={3}
          />
        </svg>
        <span
          className="absolute inset-0 grid place-items-center text-2xl font-bold"
          aria-hidden="true"
        >
          {clamped}/{max}
        </span>
      </div>
      <figcaption className="text-sm font-semibold" aria-hidden="true">
        {label}
      </figcaption>
    </figure>
  )
}
