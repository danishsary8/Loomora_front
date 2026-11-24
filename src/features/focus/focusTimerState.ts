import {
  countdownPresetsMs,
  getElapsedMs,
  getLap,
  pauseTiming,
  readCountdown,
  resumeTiming,
  type TimingSnapshot,
} from './timerMath'
import { newFocusSessionId, type FocusSessionInput } from './types'

type Segment = FocusSessionInput['segments'][number]
type OccupiedPhase = {
  index: number
  status: 'running' | 'paused'
  startedAt: number
  timing: TimingSnapshot
}
type Phase = OccupiedPhase | { index: number; status: 'waiting' }

export type TimerConfig = Pick<FocusSessionInput, 'todo_id' | 'schedule_item_id' | 'label'> &
  ({ mode: 'countdown'; minutes: number } | { mode: 'stopwatch' })

export type TimerCommand = 'pause' | 'resume' | 'next' | 'lap' | 'finish' | 'endEarly'

export interface TimerClock {
  wall: number
  mono: number
  source: string
}

interface Checkpoint extends TimerClock {
  /** Nondecreasing epoch milliseconds used for payload timestamps and timer math. */
  at: number
}

export interface FocusTimerSnapshot {
  version: 1
  scope: string
  login: string | null
  id: string
  revision: number
  config: TimerConfig
  startedAt: number
  checkpoint: Checkpoint
  phase: Phase
  segments: Segment[]
  laps: number[]
}

interface Transition {
  timer: FocusTimerSnapshot | null
  payload?: FocusSessionInput
  countdownDeadline?: number
}

export const customDurationLimits = [1, 240] as const

export function isCountdownMinutes(minutes: number): boolean {
  const [min, max] = customDurationLimits
  return Number.isInteger(minutes) && minutes >= min && minutes <= max
}

const MINUTE = 60_000
const LONG_BREAK_INDEX = 7

export function readCountdownCycle(phaseIndex: number) {
  return { current: Math.floor(phaseIndex / 2) + 1, total: Math.ceil(LONG_BREAK_INDEX / 2) }
}

function phaseDuration(config: TimerConfig, index: number): number | null {
  if (config.mode === 'stopwatch') return null
  if (index === LONG_BREAK_INDEX) return 15 * MINUTE
  if (index % 2 !== 0) return 5 * MINUTE
  return (
    countdownPresetsMs[config.minutes as keyof typeof countdownPresetsMs] ?? config.minutes * MINUTE
  )
}

function openPhase(index: number, at: number): OccupiedPhase {
  return {
    index,
    status: 'running',
    startedAt: at,
    timing: { accumulatedMs: 0, runStartedAtMs: at },
  }
}

function iso(at: number): string {
  return new Date(at).toISOString()
}

function sampleClock(clock: TimerClock) {
  if (
    !Number.isSafeInteger(clock.wall) ||
    clock.wall < 0 ||
    clock.wall > Date.UTC(9999, 11, 31, 23, 59, 59, 999) ||
    !Number.isSafeInteger(clock.mono) ||
    clock.mono < 0
  ) {
    throw new RangeError('Invalid Focus timer clock sample')
  }
  return clock
}

export function startTimer(
  config: TimerConfig,
  scope: string,
  login: string | null,
  clock: TimerClock,
): FocusTimerSnapshot {
  if (config.mode === 'countdown' && !isCountdownMinutes(config.minutes)) {
    throw new RangeError('Use 1 to 240 whole minutes for a custom countdown')
  }
  const { wall: at } = sampleClock(clock)
  return {
    version: 1,
    scope,
    login,
    id: newFocusSessionId(),
    revision: 0,
    config,
    startedAt: at,
    checkpoint: { ...clock, at },
    phase: openPhase(0, at),
    segments: [],
    laps: [],
  }
}

export function phaseType(index: number): Segment['type'] {
  if (index === LONG_BREAK_INDEX) return 'long_break'
  return index % 2 === 0 ? 'focus' : 'short_break'
}

function segmentFor(phase: OccupiedPhase, endedAt: number, active: number): Segment {
  return {
    type: phaseType(phase.index),
    started_at: iso(phase.startedAt),
    ended_at: iso(endedAt),
    active_ms: active,
  }
}

function finishTimer(
  timer: FocusTimerSnapshot,
  segments: Segment[],
  at: number,
  reason: FocusSessionInput['end_reason'],
): Transition {
  if (!segments.some((segment) => segment.type === 'focus' && segment.active_ms > 0)) {
    return { timer: null }
  }
  const { mode, todo_id, schedule_item_id, label } = timer.config
  return {
    timer: null,
    payload: {
      id: timer.id,
      mode,
      started_at: iso(timer.startedAt),
      ended_at: iso(at),
      end_reason: reason,
      todo_id,
      schedule_item_id,
      label,
      segments,
      ...(mode === 'countdown'
        ? { planned_focus_ms: phaseDuration(timer.config, 0) }
        : { laps: timer.laps }),
    },
  }
}

function pausePhase(phase: OccupiedPhase, at: number): OccupiedPhase {
  return { ...phase, status: 'paused', timing: pauseTiming(phase.timing, at) }
}

/** Freeze an old login at its last verified sample before a fresh login can recover it. */
export function recoverLogin(timer: FocusTimerSnapshot, login: string | null): FocusTimerSnapshot {
  const phase = timer.phase
  return {
    ...timer,
    login,
    revision: timer.revision + 1,
    phase: phase.status === 'running' ? pausePhase(phase, timer.checkpoint.at) : phase,
  }
}

function elapsedSince(prior: Checkpoint, clock: TimerClock): number | null {
  const monotonic = clock.mono - prior.mono
  if (clock.source === prior.source) return monotonic
  const wall = clock.wall - prior.wall
  // Allow ordinary drift and quantization, but freeze when neither clock can
  // verify the other's reading across a document boundary.
  return Math.abs(monotonic - wall) <= 1000 ? Math.min(monotonic, wall) : null
}

export function readTimer(timer: FocusTimerSnapshot, sample: TimerClock) {
  const { phase, config, checkpoint } = timer
  const type = phaseType(phase.index)
  const duration = phaseDuration(config, phase.index)
  if (phase.status === 'waiting') return { phaseType: type, elapsedMs: 0, remainingMs: duration }

  const at = checkpoint.at + Math.max(0, elapsedSince(checkpoint, sampleClock(sample)) ?? 0)
  if (duration === null) {
    return { phaseType: type, elapsedMs: getElapsedMs(phase.timing, at), remainingMs: null }
  }
  const { elapsedMs, remainingMs } = readCountdown(phase.timing, at, duration)
  return { phaseType: type, elapsedMs, remainingMs }
}

export function updateTimer(
  timer: FocusTimerSnapshot,
  reading: TimerClock,
  command?: TimerCommand | 'suspend',
): Transition {
  const clock = sampleClock(reading)
  const prior = timer.checkpoint
  const delta = elapsedSince(prior, clock)
  const at = prior.at + Math.max(0, delta ?? 0)
  const current = { ...timer, checkpoint: { ...clock, at } }
  let phase = current.phase
  if ((delta === null || delta < 0) && phase.status === 'running') {
    phase = pausePhase(phase, at)
    return { timer: { ...current, phase, revision: timer.revision + 1 } }
  }

  const duration = phaseDuration(current.config, phase.index)
  if (phase.status === 'running' && duration !== null) {
    const reading = readCountdown(phase.timing, at, duration)
    if (reading.expired) {
      // Close this phase at its verified deadline, even when the page wakes up much later.
      const deadline = at - (getElapsedMs(phase.timing, at) - reading.elapsedMs)
      const segments = [...current.segments, segmentFor(phase, deadline, reading.elapsedMs)]
      const countdownDeadline =
        command === 'finish' || command === 'endEarly' || command === 'suspend'
          ? undefined
          : clock.mono - (at - deadline)
      if (phase.index === LONG_BREAK_INDEX)
        return { ...finishTimer(current, segments, deadline, 'completed'), countdownDeadline }
      const waiting: FocusTimerSnapshot = {
        ...current,
        phase: { index: phase.index + 1, status: 'waiting' },
        revision: timer.revision + 1,
        segments,
      }
      if (command === 'finish' || command === 'endEarly') {
        return finishTimer(waiting, segments, at, 'ended_early')
      }
      return { timer: waiting, countdownDeadline }
    }
  }

  if (command === 'finish' || command === 'endEarly') {
    const segments =
      phase.status === 'waiting'
        ? current.segments
        : [...current.segments, segmentFor(phase, at, getElapsedMs(phase.timing, at))]
    return finishTimer(
      current,
      segments,
      at,
      current.config.mode === 'stopwatch' && command === 'finish' ? 'completed' : 'ended_early',
    )
  }

  if (phase.status === 'waiting' && command === 'next') {
    phase = openPhase(phase.index, at)
  } else if (phase.status === 'running' && (command === 'pause' || command === 'suspend')) {
    phase = pausePhase(phase, at)
  } else if (phase.status === 'paused' && command === 'resume') {
    phase = { ...phase, status: 'running', timing: resumeTiming(phase.timing, at) }
  } else if (
    phase.status === 'running' &&
    current.config.mode === 'stopwatch' &&
    command === 'lap'
  ) {
    const previous = current.laps.at(-1) ?? 0
    const lap = getLap(previous, getElapsedMs(phase.timing, at))
    if (lap.splitMs > 0 && current.laps.length < 1000) {
      return {
        timer: {
          ...current,
          laps: [...current.laps, lap.cumulativeMs],
          revision: timer.revision + 1,
        },
      }
    }
  }

  return { timer: { ...current, phase, revision: timer.revision + Number(phase !== timer.phase) } }
}

export function checkpointDelay(timer: FocusTimerSnapshot): number | undefined {
  if (timer.phase.status !== 'running') return
  const duration = phaseDuration(timer.config, timer.phase.index)
  const remaining =
    duration === null
      ? Infinity
      : readCountdown(timer.phase.timing, timer.checkpoint.at, duration).remainingMs
  return Math.min(15_000, remaining)
}
