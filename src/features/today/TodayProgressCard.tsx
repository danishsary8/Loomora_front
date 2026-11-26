import { useTranslation } from 'react-i18next'
import { colors } from '@/styles/tokens'

const SIZE = 64
const STROKE = 6

/** Concept "Today's progress" card: done count, bar, and percentage ring on deep forest. */
export function TodayProgressCard({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation()
  const ratio = total > 0 ? Math.min(done, total) / total : 0
  const percent = Math.round(ratio * 100)
  const label = t('progress.doneOfTotal', { done, total })
  const radius = SIZE / 2 - STROKE / 2
  const circumference = 2 * Math.PI * radius

  return (
    <section
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={label}
      aria-label={label}
      className="flex items-center gap-4 rounded-lg bg-primary p-5 text-white shadow-soft-md"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1" aria-hidden="true">
        <p className="text-sm font-medium text-white/80">{t('today.progressTitle')}</p>
        <p className="text-2xl font-bold tabular-nums leading-tight">{label}</p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-category-health transition-[width] duration-slow ease-elemental"
            style={{ width: `${percent}%` }}
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
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={STROKE}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={radius}
            fill="none"
            stroke={colors.category.health}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            className="transition-[stroke-dashoffset] duration-slow ease-elemental"
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center text-sm font-bold tabular-nums">
          {percent}%
        </span>
      </div>
    </section>
  )
}
