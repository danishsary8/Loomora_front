/** The device's IANA time zone, sent at sign-up so "today" is right for the user. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}
