import i18n from '@/i18n'
import { ApiError, type FieldErrors } from './errors'
import { useSession } from './session'

export interface UserFacingError {
  title: string
  message: string
  fieldErrors?: FieldErrors
  status: number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TranslateFn = (key: any, options?: any) => string

/**
 * Maps any error (ApiError, unknown Error, React Router error) to user-friendly text.
 * Never exposes raw error.message to avoid leaking technical or sensitive details.
 */
export function mapApiError(
  error: unknown,
  t: TranslateFn = (k, opts) => String(i18n.t(k as never, opts)),
): UserFacingError {
  if (error instanceof ApiError) {
    if (error.isNetwork) {
      return {
        status: 0,
        title: t('apiErrors.networkTitle'),
        message: t('apiErrors.network'),
      }
    }

    if (error.status === 401) {
      if (useSession.getState().token !== null) {
        useSession.getState().signOut()
      }
      return {
        status: 401,
        title: t('apiErrors.unauthorizedTitle'),
        message: t('apiErrors.unauthorized'),
      }
    }

    if (error.status === 422) {
      return {
        status: 422,
        title: t('apiErrors.validationTitle'),
        message: t('apiErrors.validation'),
        fieldErrors: error.fieldErrors,
      }
    }

    if (error.isRateLimited) {
      const message = error.retryAfter
        ? t('apiErrors.rateLimitedWithRetry', { seconds: error.retryAfter })
        : t('apiErrors.rateLimited')
      return {
        status: 429,
        title: t('apiErrors.rateLimitedTitle'),
        message,
      }
    }

    if (error.status >= 500) {
      return {
        status: error.status,
        title: t('apiErrors.serverTitle'),
        message: t('apiErrors.server'),
      }
    }
  }

  // React Router route response errors
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  ) {
    const status = (error as { status: number }).status
    if (status === 404) {
      return {
        status: 404,
        title: t('pages.notFound.title'),
        message: t('pages.notFound.message'),
      }
    }
    if (status >= 500) {
      return {
        status,
        title: t('apiErrors.serverTitle'),
        message: t('apiErrors.server'),
      }
    }
  }

  // Generic Error or unknown value: NEVER expose raw error.message
  return {
    status: null,
    title: t('apiErrors.unexpectedTitle'),
    message: t('apiErrors.unexpected'),
  }
}
