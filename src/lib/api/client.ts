import { ApiError, type ApiErrorBody } from './errors'

export interface ApiClientOptions {
  baseUrl: string
  getToken: () => string | null
  /** Called when a request that carried a token comes back 401. */
  onUnauthorized: () => void
  fetchImpl?: typeof fetch
}

export interface RequestOptions {
  body?: unknown
  query?: Record<string, string | undefined>
  /** Send the bearer token (default true). */
  auth?: boolean
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
  onUnauthorized,
  fetchImpl,
}: ApiClientOptions) {
  const base = baseUrl.replace(/\/+$/, '')

  async function request<T>(
    method: Method,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { body, query, auth = true } = options
    const url = new URL(`${base}${path}`, window.location.origin)
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, value)
    }

    const headers: Record<string, string> = { Accept: 'application/json' }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const token = auth ? getToken() : null
    if (token) headers.Authorization = `Bearer ${token}`

    let response: Response
    try {
      response = await (fetchImpl ?? fetch)(url, {
        method,
        headers,
        body: body === undefined ? null : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(0, { message: 'Network error' })
    }

    const data = await readBody(response)
    if (response.ok) return data as T

    if (response.status === 401 && token) onUnauthorized()
    throw new ApiError(response.status, (data ?? {}) as ApiErrorBody, retryAfterSeconds(response))
  }

  return { request, baseUrl: base }
}

export type ApiClient = ReturnType<typeof createApiClient>
