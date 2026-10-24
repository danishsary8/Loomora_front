import { isLocalDate, toLocalDate } from './date'

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
})
