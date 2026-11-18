/** The device's IANA time zone, sent at sign-up so "today" is right for the user. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

/** Every IANA zone the browser knows, plus `extra` zones it does not list (such as "UTC"). */
export function timeZoneOptions(...extra: string[]): string[] {
  return [...new Set([...extra, ...Intl.supportedValuesOf('timeZone')])]
}
