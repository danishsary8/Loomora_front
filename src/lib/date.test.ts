import { isLocalDate, localDateIn, previousDay, toLocalDate } from './date'

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

  it('steps back one day across month, year and leap-day boundaries', () => {
    expect(previousDay('2026-10-24')).toBe('2026-10-23')
    expect(previousDay('2026-11-01')).toBe('2026-10-31')
    expect(previousDay('2027-01-01')).toBe('2026-12-31')
    expect(previousDay('2028-03-01')).toBe('2028-02-29')
  })

  it('places an instant on the calendar day of a time zone', () => {
    const instant = '2026-10-25T20:30:00.000Z'
    expect(localDateIn(instant, 'UTC')).toBe('2026-10-25')
    expect(localDateIn(instant, 'Asia/Phnom_Penh')).toBe('2026-10-26')
    expect(localDateIn(instant, 'America/Los_Angeles')).toBe('2026-10-25')
  })
})
