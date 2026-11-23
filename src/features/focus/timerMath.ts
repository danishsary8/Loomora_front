const MS_PER_MINUTE = 60_000
const MS_PER_CENTISECOND = 10

export const countdownPresetsMs = Object.freeze({
  25: 25 * MS_PER_MINUTE,
  50: 50 * MS_PER_MINUTE,
  90: 90 * MS_PER_MINUTE,
})

export interface TimingSnapshot {
  /** Active time from intervals that already ended. */
  readonly accumulatedMs: number
  /** Timestamp of the current active interval, or null while time is frozen. */
  readonly runStartedAtMs: number | null
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0
}

function assertMilliseconds(value: number, field: string): void {
  if (!isNonNegativeInteger(value)) {
    throw new RangeError(`${field} must be a non-negative, safe integer in milliseconds`)
  }
}

/** Checks numeric representation. Product limits for custom durations are pending. */
export function isValidCustomDurationMs(durationMs: number): boolean {
  return isNonNegativeInteger(durationMs) && durationMs > 0
}

function getRunningMs(snapshot: TimingSnapshot, nowMs: number): number {
  const { accumulatedMs, runStartedAtMs } = snapshot
  assertMilliseconds(accumulatedMs, 'accumulatedMs')
  assertMilliseconds(nowMs, 'nowMs')
  if (runStartedAtMs === null) return 0

  assertMilliseconds(runStartedAtMs, 'runStartedAtMs')
  if (nowMs < runStartedAtMs) throw new RangeError('nowMs precedes the running interval')
  return nowMs - runStartedAtMs
}

/** Read active time at a supplied timestamp in the same clock domain as the snapshot. */
export function getElapsedMs(snapshot: TimingSnapshot, nowMs: number): number {
  const elapsedMs = snapshot.accumulatedMs + getRunningMs(snapshot, nowMs)
  assertMilliseconds(elapsedMs, 'elapsedMs')
  return elapsedMs
}

/** A deadline caps active countdown time even if the sample comes in late. */
export function readCountdown(snapshot: TimingSnapshot, nowMs: number, durationMs: number) {
  assertMilliseconds(durationMs, 'durationMs')
  const runningMs = getRunningMs(snapshot, nowMs)
  const remainingMs = Math.max(0, durationMs - snapshot.accumulatedMs - runningMs)
  const elapsedMs = durationMs - remainingMs
  return { elapsedMs, remainingMs, expired: remainingMs === 0 }
}

/** Freeze active time for a pause or an early stop. */
export function pauseTiming(snapshot: TimingSnapshot, nowMs: number): TimingSnapshot {
  const accumulatedMs = getElapsedMs(snapshot, nowMs)
  return { accumulatedMs, runStartedAtMs: null }
}

/** Begin another active interval. Calling this on a running snapshot preserves its anchor. */
export function resumeTiming(snapshot: TimingSnapshot, nowMs: number): TimingSnapshot {
  getElapsedMs(snapshot, nowMs)
  return { ...snapshot, runStartedAtMs: snapshot.runStartedAtMs ?? nowMs }
}

export function getLap(previousCumulativeMs: number, cumulativeMs: number) {
  assertMilliseconds(previousCumulativeMs, 'previousCumulativeMs')
  assertMilliseconds(cumulativeMs, 'cumulativeMs')
  if (cumulativeMs < previousCumulativeMs) {
    throw new RangeError('cumulativeMs precedes the previous lap')
  }

  return { splitMs: cumulativeMs - previousCumulativeMs, cumulativeMs }
}

/** Render completed centiseconds as minutes:seconds.centiseconds. */
export function formatCentiseconds(elapsedMs: number): string {
  assertMilliseconds(elapsedMs, 'elapsedMs')
  const minutes = Math.floor(elapsedMs / MS_PER_MINUTE)
  const seconds = Math.floor((elapsedMs % MS_PER_MINUTE) / 1_000)
  const centiseconds = Math.floor((elapsedMs % 1_000) / MS_PER_CENTISECOND)
  const twoDigits = (value: number) => String(value).padStart(2, '0')
  return `${twoDigits(minutes)}:${twoDigits(seconds)}.${twoDigits(centiseconds)}`
}
