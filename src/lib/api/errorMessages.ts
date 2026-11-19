import { ApiError } from './errors'

type ErrorKind = 'network' | 'unauthorized' | 'validation' | 'rateLimited' | 'server' | 'unexpected'

/** Translation key for each kind of failure. Raw `error.message` is never shown to people. */
export const ERROR_MESSAGE_KEYS = {
  network: 'errors.network',
  unauthorized: 'errors.unauthorized',
  validation: 'errors.validation',
  rateLimited: 'errors.rateLimited',
  server: 'errors.server',
  unexpected: 'errors.unexpected',
} as const satisfies Record<ErrorKind, string>

export function errorKind(error: unknown): ErrorKind {
  if (!(error instanceof ApiError)) return 'unexpected'
  if (error.isNetwork) return 'network'
  if (error.status === 401) return 'unauthorized'
  if (error.status === 422) return 'validation'
  if (error.isRateLimited) return 'rateLimited'
  if (error.status >= 500) return 'server'
  return 'unexpected'
}

export function errorMessageKey(error: unknown): (typeof ERROR_MESSAGE_KEYS)[ErrorKind] {
  return ERROR_MESSAGE_KEYS[errorKind(error)]
}
