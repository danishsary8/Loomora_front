import { ApiError, type ApiErrorBody } from './errors'

export interface ApiClientOptions {
  baseUrl: string
  getToken: () => string | null
  getSessionVersion?: () => number
  /** Called when a 401 belongs to the current session. */
  onUnauthorized: () => void
  /** Called when the API could not be reached or answered with a 5xx. */
  onServiceFailure?: () => void
  fetchImpl?: typeof fetch
}

export interface RequestOptions {
  body?: unknown
  query?: Record<string, string | undefined>
  signal?: AbortSignal
  /** Send the bearer token (default true). */
  auth?: boolean
  expectedStatus?: number | readonly number[]
  /** Let the caller show a failure without clearing the session on a 401. */
  preserveSessionOnUnauthorized?: boolean
  /** An optional capability can return 503 while the rest of the API is healthy. */
  optionalCapability?: boolean
}

export type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function retryAfterSeconds(response: Response): number | undefined {
  const value = Number(response.headers.get('Retry-After'))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

/** A small typed fetch wrapper: JSON in and out, bearer token, one error shape (ApiError). */
export function createApiClient({
  baseUrl,
  getToken,
  getSessionVersion,
  onUnauthorized,
  onServiceFailure,
  fetchImpl,
}: ApiClientOptions) {
  const base = baseUrl.replace(/\/+$/, '')

  async function request<T>(
    method: Method,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const {
      body,
      query,
      signal,
      auth = true,
      expectedStatus,
      preserveSessionOnUnauthorized,
      optionalCapability,
    } = options
    const url = new URL(`${base}${path}`, window.location.origin)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, value)
    }

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = auth ? getToken() : null
    const sessionVersion = getSessionVersion?.()
    if (token) headers.Authorization = `Bearer ${token}`

    const sameSession = () =>
      (getSessionVersion === undefined || getSessionVersion() === sessionVersion) &&
      (!token || getToken() === token)

    let response: Response
    try {
      response = await (fetchImpl ?? fetch)(url, {
        method,
        headers,
        signal,
        body: body === undefined ? null : JSON.stringify(body),
      })
    } catch {
      signal?.throwIfAborted()
      if (sameSession()) onServiceFailure?.()
      throw new ApiError(0, { message: 'Network error' })
    }

    const data = await readBody(response)
    signal?.throwIfAborted()
    const expected =
      typeof expectedStatus === 'number'
        ? response.status === expectedStatus
        : (expectedStatus?.includes(response.status) ?? true)
    if (response.ok && expected) {
      return data as T
    }

    if (response.status === 401 && !preserveSessionOnUnauthorized && token && sameSession()) {
      onUnauthorized()
    }
    if (
      response.status >= 500 &&
      !(optionalCapability && response.status === 503) &&
      sameSession()
    ) {
      onServiceFailure?.()
    }
    throw new ApiError(response.status, (data ?? {}) as ApiErrorBody, retryAfterSeconds(response))
  }

  return { request, baseUrl: base }
}

export type ApiClient = ReturnType<typeof createApiClient>
