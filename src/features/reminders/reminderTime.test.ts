import { localReminderValue, reminderInstant } from './reminderTime'

it('round-trips a Phnom Penh local time just after midnight on the previous UTC date', () => {
  expect(reminderInstant('2026-11-20T00:01', 'Asia/Phnom_Penh')).toBe('2026-11-19T17:01:00.000Z')
  expect(localReminderValue('2026-11-19T17:01:00Z', 'Asia/Phnom_Penh')).toBe('2026-11-20T00:01')
})

it.each(['2026-02-30T12:00', '2026-03-08T02:30', '2026-02-01T24:00', '2026-02-01'])(
  'rejects invalid or nonexistent local time %s',
  (value) => expect(reminderInstant(value, 'America/New_York')).toBeNull(),
)

it('selects the earlier instant for a repeated clock time', () => {
  expect(reminderInstant('2026-11-01T01:30', 'America/New_York')).toBe('2026-11-01T05:30:00.000Z')
})
