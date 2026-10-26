/** Field name to its first error message, from a 422 answer. */
export type FieldErrors = Record<string, string>

export interface ApiErrorBody {
  message?: string
  errors?: Record<string, string[]>
}

/** An answer the API gave with an error status, or `status` 0 when it could not be reached. */
export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>
  /** Seconds to wait before retrying, from `Retry-After` on a 429. */
  readonly retryAfter: number | undefined

  constructor(status: number, body: ApiErrorBody = {}, retryAfter?: number) {
    super(body.message ?? `Request failed with status ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.errors = body.errors ?? {}
    this.retryAfter = retryAfter
  }

  get isNetwork(): boolean {
    return this.status === 0
  }

  get isRateLimited(): boolean {
    return this.status === 429
  }

  /** The first message for each field of a 422. */
  get fieldErrors(): FieldErrors {
    const result: FieldErrors = {}
    for (const [field, messages] of Object.entries(this.errors)) {
      const first = messages[0]
      if (first) result[field] = first
    }
    return result
  }
}
