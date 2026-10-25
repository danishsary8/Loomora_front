import { isLocalDate, isTime, toLocalDate, toLocalTime, weekdayOf } from './date'

describe('date helpers', () => {
  it('formats the device-local calendar date', () => {
    expect(toLocalDate(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24')
    expect(toLocalDate(new Date(2026, 0, 1, 0, 0))).toBe('2026-01-01')
  })

  it('accepts only real YYYY-MM-DD dates', () => {
    expect(isLocalDate('2026-10-24')).toBe(true)
    expect(isLocalDate('2028-02-29')).toBe(true)
    expect(isLocalDate('2026-02-29')).toBe(false)
    expect(isLocalDate('2026-13-01')).toBe(false)
    expect(isLocalDate('2026-1-01')).toBe(false)
    expect(isLocalDate('')).toBe(false)
  })

  it('formats the device-local time of day', () => {
    expect(toLocalTime(new Date(2026, 9, 24, 7, 5))).toBe('07:05')
    expect(toLocalTime(new Date(2026, 9, 24, 23, 59))).toBe('23:59')
  })

  it('accepts only 24-hour HH:MM times', () => {
    expect(isTime('00:00')).toBe(true)
    expect(isTime('23:59')).toBe(true)
    expect(isTime('24:00')).toBe(false)
    expect(isTime('9:30')).toBe(false)
    expect(isTime('09:60')).toBe(false)
    expect(isTime('')).toBe(false)
  })

  it('numbers weekdays from Monday = 0', () => {
    expect(weekdayOf('2026-10-19')).toBe(0)
    expect(weekdayOf('2026-10-24')).toBe(5)
    expect(weekdayOf('2026-10-25')).toBe(6)
    expect(weekdayOf('2026-10-26')).toBe(0)
  })
})
