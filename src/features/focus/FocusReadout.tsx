import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'
import { colors } from '@/styles/tokens'
import type { FocusRuntime } from './focusRuntime'
import { readCountdownCycle, type FocusTimerSnapshot, type TimerConfig } from './focusTimerState'
import { formatCentiseconds, getLap } from './timerMath'

interface ReadoutProps {
  runtime: FocusRuntime
  snapshot: FocusTimerSnapshot | null
  mode: TimerConfig['mode']
  minutes?: number
  expanded?: boolean
}

function sample(runtime: FocusRuntime, snapshot: FocusTimerSnapshot) {
  try {
    return runtime.readTime(snapshot)
  } catch {
    // The previous runtime can become invalid before React commits the new owner.
    return null
  }
}

export function FocusReadout({ runtime, snapshot, mode, minutes, expanded }: ReadoutProps) {
  const { t } = useTranslation()
  const [reading, setReading] = useState<{
    snapshot: FocusTimerSnapshot
    time: ReturnType<typeof sample>
  }>()
  useEffect(() => {
    if (!snapshot || snapshot.phase.status !== 'running') return
    let frame = 0
    let last: ReturnType<typeof sample>
    const update = () => {
      const time = sample(runtime, snapshot)
      if (
        time?.remainingMs == null ||
        last?.remainingMs == null ||
        Math.ceil(time.remainingMs / 1000) !== Math.ceil(last.remainingMs / 1000)
      ) {
        setReading({ snapshot, time })
      }
      last = time
      if (time) frame = requestAnimationFrame(update)
    }
    frame = requestAnimationFrame(update)
    return () => cancelAnimationFrame(frame)
  }, [runtime, snapshot])

  const time = snapshot
    ? reading?.snapshot === snapshot
      ? reading.time
      : sample(runtime, snapshot)
    : undefined
  const phaseType = time?.phaseType
  const stopwatch = mode === 'stopwatch'
  const value =
    time === null
      ? '—'
      : stopwatch
        ? formatCentiseconds(time?.elapsedMs ?? 0)
        : time?.remainingMs != null
          ? formatCentiseconds(Math.ceil(time.remainingMs / 1000) * 1000).slice(0, -3)
          : minutes === undefined
            ? '—'
            : t('focus.initialTime', { minutes: String(minutes).padStart(2, '0') })
  const heading = stopwatch ? t('focus.stopwatch') : t(`focus.phase.${phaseType ?? 'focus'}`)

  const total = (time?.elapsedMs ?? 0) + (time?.remainingMs ?? 0)
  const ratio = !stopwatch && time?.remainingMs != null && total > 0 ? time.remainingMs / total : 1
  const onBreak = Boolean(phaseType && phaseType !== 'focus')

  return (
    <div className="flex min-w-0 flex-col items-center gap-3 py-2 text-center">
      <div
        className={cn(
          'relative [container-type:inline-size]',
          expanded ? 'w-full max-w-[24rem]' : 'w-full max-w-[17rem]',
        )}
      >
        <TimerRing ratio={ratio} onBreak={onBreak} />
        <div className="absolute inset-0 flex min-w-0 flex-col items-center justify-center gap-1 px-[10%]">
          <div
            role="timer"
            aria-label={t(stopwatch ? 'focus.elapsed' : 'focus.remaining')}
            className="max-w-full text-4xl font-bold leading-none tracking-tight text-ink tabular-nums [overflow-wrap:anywhere] supports-[width:1cqi]:text-[min(5rem,19cqi)]"
          >
            {value}
          </div>
          <p className="text-sm font-semibold text-muted">{heading}</p>
        </div>
      </div>
      {snapshot && !stopwatch && (
        <p className="text-sm text-muted">
          {t('focus.cycle', readCountdownCycle(snapshot.phase.index))}
        </p>
      )}
    </div>
  )
}

const RING_VIEW = 100
const RING_STROKE = 4

/** Concept v3 progress ring: remaining share of the current phase (full for a stopwatch). */
function TimerRing({ ratio, onBreak }: { ratio: number; onBreak: boolean }) {
  const radius = RING_VIEW / 2 - RING_STROKE / 2
  const circumference = 2 * Math.PI * radius
  return (
    <svg
      viewBox={`0 0 ${RING_VIEW} ${RING_VIEW}`}
      className="block h-auto w-full -rotate-90"
      aria-hidden="true"
    >
      <circle
        cx={RING_VIEW / 2}
        cy={RING_VIEW / 2}
        r={radius}
        fill="none"
        stroke={colors.primarySoft}
        strokeWidth={RING_STROKE}
      />
      <circle
        cx={RING_VIEW / 2}
        cy={RING_VIEW / 2}
        r={radius}
        fill="none"
        stroke={onBreak ? colors.accent : colors.primary}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - Math.min(Math.max(ratio, 0), 1))}
        className="transition-[stroke-dashoffset] duration-slow ease-elemental motion-reduce:transition-none"
      />
    </svg>
  )
}

export function LapList({ laps }: { laps: number[] }) {
  const { t } = useTranslation()
  return (
    <Card>
      <h2 className="text-lg font-semibold">{t('focus.laps')}</h2>
      <ol className="mt-2 divide-y divide-border-subtle">
        {laps.map((cumulative, index) => {
          const { splitMs, cumulativeMs } = getLap(laps[index - 1] ?? 0, cumulative)
          return (
            <li
              key={cumulative}
              className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 text-sm tabular-nums [overflow-wrap:anywhere]"
            >
              <span className="font-semibold">{t('focus.lapNumber', { count: index + 1 })}</span>
              <span>{t('focus.split', { time: formatCentiseconds(splitMs) })}</span>
              <span className="text-muted">
                {t('focus.total', { time: formatCentiseconds(cumulativeMs) })}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
