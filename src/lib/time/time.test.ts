import { localDateIn } from '@/lib/date'
import { weekdayOf } from '@/features/schedule/occurrences'
import cases from './fixtures/local-date-cases.json'
import { formatInstantTime, formatWallTime, orderedWeekdays, parseWallTime } from './time'

describe('clock display', () => {
  it.each([
    ['00:00', '12:00 AM'],
    ['09:05', '9:05 AM'],
    ['12:00', '12:00 PM'],
    ['14:30', '2:30 PM'],
  ])('formats %s as %s in 12-hour mode', (time, expected) => {
    expect(formatWallTime(time, '12h', 'en')).toBe(expected)
  })

  it('defaults to 24-hour time and retains leading zeros', () => {
    expect(formatWallTime('00:00')).toBe('00:00')
    expect(formatWallTime('09:05', '24h', 'en')).toBe('09:05')
    expect(formatWallTime('14:30', '24h', 'en')).toBe('14:30')
  })

  it.each([
    ['12:00 am', '00:00'],
    ['12:00 PM', '12:00'],
    ['2:30 PM', '14:30'],
    ['09:05', '09:05'],
    ['24:00', null],
    ['0:30 AM', null],
    ['2:60 PM', null],
  ])('normalizes a typed clock value %s as %s', (time, expected) => {
    expect(parseWallTime(time)).toBe(expected)
  })

  it('formats real instants using the selected zone', () => {
    expect(formatInstantTime('2026-11-18T17:30:00Z', '12h', 'en', 'Asia/Phnom_Penh')).toBe(
      '12:30 AM',
    )
    expect(formatInstantTime('2026-11-18T17:30:00Z', '24h', 'en', 'America/Los_Angeles')).toBe(
      '09:30',
    )
  })
})

describe('fixed week order', () => {
  it('starts on Monday by default and rotates the existing Sunday ID to the front', () => {
    expect(orderedWeekdays()).toEqual([0, 1, 2, 3, 4, 5, 6])
    expect(orderedWeekdays(7)).toEqual([6, 0, 1, 2, 3, 4, 5])
  })

  it.each([
    [
      [
        '2026-10-25',
        '2026-10-26',
        '2026-10-27',
        '2026-10-28',
        '2026-10-29',
        '2026-10-30',
        '2026-10-31',
      ],
      7,
    ],
    [
      [
        '2026-11-29',
        '2026-11-30',
        '2026-12-01',
        '2026-12-02',
        '2026-12-03',
        '2026-12-04',
        '2026-12-05',
      ],
      7,
    ],
    [
      [
        '2026-12-28',
        '2026-12-29',
        '2026-12-30',
        '2026-12-31',
        '2027-01-01',
        '2027-01-02',
        '2027-01-03',
      ],
      1,
    ],
  ] as const)('keeps dates aligned with weekday IDs across boundaries (%j)', (dates, start) => {
    expect(dates.map(weekdayOf)).toEqual(orderedWeekdays(start))
  })
})

describe('backend local-date fixture', () => {
  it.each(cases)('$name', ({ instant_utc, local_date, timezone, start_utc, end_utc, hours }) => {
    const start = Date.parse(start_utc)
    const end = Date.parse(end_utc)
    const dateAt = (instant: number) => localDateIn(new Date(instant).toISOString(), timezone)
    expect(localDateIn(instant_utc, timezone)).toBe(local_date)
    expect(formatInstantTime(start_utc, '24h', 'en', timezone)).toBe('00:00')
    expect(formatInstantTime(end_utc, '24h', 'en', timezone)).toBe('23:59')
    expect(dateAt(start)).toBe(local_date)
    expect(dateAt(start - 1)).not.toBe(local_date)
    expect(dateAt(end)).toBe(local_date)
    expect(dateAt(end + 999)).toBe(local_date)
    expect(dateAt(end + 1000)).not.toBe(local_date)
    expect(end + 1000 - start).toBe(hours * 60 * 60 * 1000)
  })
})
