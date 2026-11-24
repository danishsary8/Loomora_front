import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'
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

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center gap-2 rounded-lg px-2 py-6 text-center [container-type:inline-size] sm:py-10',
        phaseType && phaseType !== 'focus' ? 'bg-category-rest/25' : 'bg-primary-soft',
      )}
    >
      <p className="text-sm font-semibold text-ink">{heading}</p>
      <div
        role="timer"
        aria-label={t(stopwatch ? 'focus.elapsed' : 'focus.remaining')}
        className={cn(
          'max-w-full text-4xl font-bold leading-tight tracking-tight text-ink tabular-nums [overflow-wrap:anywhere]',
          expanded
            ? 'supports-[width:1cqi]:text-[min(5.5rem,16cqi)]'
            : 'supports-[width:1cqi]:text-[min(3.75rem,18cqi)]',
        )}
      >
        {value}
      </div>
      {snapshot && !stopwatch && (
        <p className="text-sm text-muted">
          {t('focus.cycle', readCountdownCycle(snapshot.phase.index))}
        </p>
      )}
    </div>
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
