import {
  countdownPresetsMs,
  formatCentiseconds,
  getElapsedMs,
  getLap,
  isValidCustomDurationMs,
  pauseTiming,
  readCountdown,
  resumeTiming,
  type TimingSnapshot,
} from './timerMath'

const start = 1_800_000_000_000
const frozen: TimingSnapshot = { accumulatedMs: 0, runStartedAtMs: null }

describe('countdown math', () => {
  it('provides the 25, 50, and 90 minute presets in milliseconds', () => {
    expect(countdownPresetsMs).toEqual({ 25: 1_500_000, 50: 3_000_000, 90: 5_400_000 })
  })

  it.each([1, 1_000, 86_400_001])('represents positive whole milliseconds (%s)', (durationMs) => {
    expect(isValidCustomDurationMs(durationMs)).toBe(true)
  })

  it.each([0, -1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid custom duration (%s)',
    (durationMs) => {
      expect(isValidCustomDurationMs(durationMs)).toBe(false)
    },
  )

  it('starts with the full duration and retains only active time during a pause', () => {
    const durationMs = countdownPresetsMs[25]
    const running = resumeTiming(frozen, start)
    expect(readCountdown(running, start, durationMs)).toEqual({
      elapsedMs: 0,
      remainingMs: 1_500_000,
      expired: false,
    })

    const paused = pauseTiming(running, start + 600_000)
    expect(readCountdown(paused, start + 700_000, durationMs).remainingMs).toBe(900_000)

    const resumed = resumeTiming(paused, start + 700_000)
    expect(readCountdown(resumed, start + 701_234, durationMs)).toEqual({
      elapsedMs: 601_234,
      remainingMs: 898_766,
      expired: false,
    })
  })

  it('retains elapsed time when stopped early', () => {
    const running = resumeTiming(frozen, start)
    const stopped = pauseTiming(running, start + 12_345)

    expect(readCountdown(stopped, start + 2_000_000, countdownPresetsMs[25])).toEqual({
      elapsedMs: 12_345,
      remainingMs: 1_487_655,
      expired: false,
    })
  })

  it.each([
    [0, 0, 0, true],
    [1_000, 999, 1, false],
    [1_000, 1_000, 0, true],
    [1_000, 26_789, 0, true],
  ])(
    'reads duration %s at offset %s with %s remaining and expired=%s',
    (durationMs, offsetMs, remainingMs, expired) => {
      const running = resumeTiming(frozen, start)
      expect(readCountdown(running, start + offsetMs, durationMs)).toEqual({
        elapsedMs: durationMs - remainingMs,
        remainingMs,
        expired,
      })
    },
  )

  it.each([-1, 10.5, NaN, Infinity])('rejects invalid countdown math duration %s', (durationMs) => {
    expect(() => readCountdown(frozen, start, durationMs)).toThrow(RangeError)
  })

  it('caps a very late reading before elapsed time can exceed the safe integer range', () => {
    const running = { accumulatedMs: 999, runStartedAtMs: 0 }
    expect(readCountdown(running, Number.MAX_SAFE_INTEGER, 1_000)).toEqual({
      elapsedMs: 1_000,
      remainingMs: 0,
      expired: true,
    })
  })
})

describe('timing snapshots', () => {
  it('accumulates repeated pause and resume cycles without counting an interval twice', () => {
    const running = resumeTiming(frozen, start)
    const firstPause = pauseTiming(running, start + 123)
    expect(pauseTiming(firstPause, start + 1_000)).toEqual(firstPause)

    const resumed = resumeTiming(firstPause, start + 2_000)
    expect(resumeTiming(resumed, start + 2_100)).toEqual(resumed)
    const secondPause = pauseTiming(resumed, start + 2_234)
    expect(getElapsedMs(secondPause, start + 9_000)).toBe(357)

    const finalRun = resumeTiming(secondPause, start + 10_000)
    expect(getElapsedMs(finalRun, start + 10_345)).toBe(702)
    expect(getElapsedMs(finalRun, start + 10_345)).toBe(702)
    expect(running).toEqual({ accumulatedMs: 0, runStartedAtMs: start })
    expect(frozen).toEqual({ accumulatedMs: 0, runStartedAtMs: null })
  })

  it.each([true, false])('reconstructs an identical reading with running=%s', (running) => {
    const paused = pauseTiming(resumeTiming(frozen, start), start + 123)
    const snapshot = running ? resumeTiming(paused, start + 500) : paused
    const recovered: TimingSnapshot = JSON.parse(JSON.stringify(snapshot))
    const now = start + 12_345

    expect(getElapsedMs(recovered, now)).toBe(running ? 11_968 : 123)
    expect(getElapsedMs(recovered, now)).toBe(getElapsedMs(snapshot, now))
    expect(readCountdown(recovered, now, 2_000)).toEqual(readCountdown(snapshot, now, 2_000))
    expect(readCountdown(recovered, now, 2_000).expired).toBe(running)
  })

  it('accepts a timestamp of zero as a running anchor', () => {
    expect(getElapsedMs(resumeTiming(frozen, 0), 123)).toBe(123)
  })

  it('signals a backwards reading before the running anchor without folding it into elapsed', () => {
    const running = resumeTiming({ ...frozen, accumulatedMs: 25 }, start)
    expect(() => getElapsedMs(running, start - 1)).toThrow(RangeError)
    expect(() => pauseTiming(running, start - 1)).toThrow(RangeError)
    expect(() => resumeTiming(running, start - 1)).toThrow(RangeError)
    expect(getElapsedMs(running, start)).toBe(25)
  })

  it.each([-1, 0.1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'rejects invalid readings or snapshot fields (%s)',
    (invalid) => {
      expect(() => getElapsedMs(frozen, invalid)).toThrow(RangeError)
      expect(() => resumeTiming(frozen, invalid)).toThrow(RangeError)
      expect(() => getElapsedMs({ ...frozen, accumulatedMs: invalid }, start)).toThrow(RangeError)
      expect(() => getElapsedMs({ ...frozen, runStartedAtMs: invalid }, start)).toThrow(RangeError)
    },
  )

  it('rejects elapsed time outside the safe integer range', () => {
    expect(() =>
      getElapsedMs({ accumulatedMs: Number.MAX_SAFE_INTEGER, runStartedAtMs: 0 }, 1),
    ).toThrow(RangeError)
  })
})

describe('stopwatch laps', () => {
  it('keeps split and cumulative milliseconds across pauses', () => {
    const running = resumeTiming(frozen, start)
    const firstLap = getLap(0, getElapsedMs(running, start + 1_237))
    expect(firstLap).toEqual({ splitMs: 1_237, cumulativeMs: 1_237 })
    const resumed = resumeTiming(pauseTiming(running, start + 2_003), start + 4_000)
    const secondLap = getLap(firstLap.cumulativeMs, getElapsedMs(resumed, start + 4_499))
    expect(secondLap).toEqual({ splitMs: 1_265, cumulativeMs: 2_502 })
    expect(formatCentiseconds(secondLap.splitMs)).toBe('00:01.26')
    expect(formatCentiseconds(secondLap.cumulativeMs)).toBe('00:02.50')
  })

  it('keeps a zero split and rejects decreasing or invalid cumulative values', () => {
    expect(getLap(1_237, 1_237)).toEqual({ splitMs: 0, cumulativeMs: 1_237 })
    expect(() => getLap(1_237, 1_236)).toThrow(RangeError)
    expect(() => getLap(-1, 0)).toThrow(RangeError)
    expect(() => getLap(0, NaN)).toThrow(RangeError)
    expect(() => formatCentiseconds(-1)).toThrow(RangeError)
  })

  it.each([
    [0, '00:00.00'],
    [9, '00:00.00'],
    [10, '00:00.01'],
    [999, '00:00.99'],
    [1_000, '00:01.00'],
    [59_999, '00:59.99'],
    [60_000, '01:00.00'],
    [3_600_010, '60:00.01'],
  ])('formats %s ms as %s', (elapsedMs, formatted) => {
    expect(formatCentiseconds(elapsedMs)).toBe(formatted)
  })
})
