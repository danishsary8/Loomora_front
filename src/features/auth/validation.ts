const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
export const MIN_PASSWORD_LENGTH = 8

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim())
}

/** A display name made from the part of the email before the "@" (the API needs a name). */
export function nameFromEmail(email: string): string {
  return (email.split('@')[0] ?? '').slice(0, 100)
}
