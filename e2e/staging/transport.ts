import { expect, type BrowserContext } from '@playwright/test'
import { approval } from './approval'
import {
  approvedPayload,
  approvedRequest,
  assertStagingCors,
  assertStagingCsp,
  assertStagingIdentity,
  requestWithoutRedirect,
} from './safety'

interface ApiOptions {
  token?: string
  body?: unknown
  headers?: Record<string, string>
}

export async function stagingApi(method: string, path: string, options: ApiOptions = {}) {
  const url = approval.api + path
  if (
    !approvedRequest(approval, method, url) ||
    !approvedPayload(approval, method, url, options.body)
  ) {
    throw new Error('QA-022 blocked an API request outside its approval')
  }
  return requestWithoutRedirect(fetch, url, {
    method,
    signal: AbortSignal.timeout(15_000),
    headers: {
      Accept: 'application/json',
      Origin: approval.frontend,
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
}

export async function checkStagingPair() {
  const [frontend, health] = await Promise.all([
    requestWithoutRedirect(fetch, approval.frontend, { signal: AbortSignal.timeout(15_000) }),
    stagingApi('GET', '/health?deep=1'),
  ])
  expect(frontend.status).toBe(200)
  assertStagingIdentity(frontend.headers, approval.runId, approval.frontendSha)
  expect(frontend.headers.get('content-type')).toContain('text/html')
  assertStagingCsp(frontend.headers.get('content-security-policy'), new URL(approval.api).origin)

  expect(health.status).toBe(200)
  assertStagingIdentity(health.headers, approval.runId, approval.backendSha)
  expect(await health.json()).toEqual({ status: 'ok', database: 'ok' })
  assertStagingCors(health.headers, approval.frontend)
  await checkPreflight('/auth/register', 'POST', ['authorization', 'content-type'])
}

async function checkPreflight(path: string, method: string, headers: string[]) {
  const preflight = await stagingApi('OPTIONS', path, {
    headers: {
      'Access-Control-Request-Method': method,
      ...(headers.length ? { 'Access-Control-Request-Headers': headers.join(',') } : {}),
    },
  })
  expect(preflight.status).toBe(204)
  assertStagingCors(preflight.headers, approval.frontend)
  const methods = preflight.headers.get('access-control-allow-methods')?.split(/,\s*/)
  expect(methods).toContain(method)
  const allowed = preflight.headers.get('access-control-allow-headers')?.toLowerCase().split(/,\s*/)
  for (const header of headers) expect(allowed).toContain(header)
}

export async function guardBrowser(context: BrowserContext) {
  const stopped: { method: string; reason: string }[] = []
  const preflights = new Map<string, Promise<void>>()
  await context.routeWebSocket('**/*', (socket) => socket.close())
  await context.route('**/*', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = request.url()
    if (!approvedRequest(approval, method, url)) {
      stopped.push({ method, reason: 'unapproved request' })
      await route.abort()
      return
    }
    const apiPath = url.startsWith(approval.api + '/') ? url.slice(approval.api.length) : null
    if (
      method === 'POST' &&
      apiPath?.startsWith('/auth/') &&
      !approvedPayload(approval, method, url, request.postDataJSON() as unknown)
    ) {
      stopped.push({ method, reason: 'unapproved identity payload' })
      await route.abort()
      return
    }
    if (apiPath && method !== 'OPTIONS') {
      const headers = await request.allHeaders()
      try {
        if (headers.origin !== approval.frontend) throw new Error('Unexpected browser origin')
        const required = ['authorization', 'content-type'].filter((header) => header in headers)
        if (method === 'PATCH' || required.length > 0) {
          const key = [method, apiPath, ...required].join(' ')
          const preflight = preflights.get(key) ?? checkPreflight(apiPath, method, required)
          preflights.set(key, preflight)
          await preflight
        }
      } catch {
        stopped.push({ method, reason: 'CORS preflight or origin rejected' })
        await route.abort()
        return
      }
    }
    const response = await route
      .fetch({ maxRedirects: 0, maxRetries: 0, timeout: 15_000 })
      .catch(() => undefined)
    if (!response) {
      stopped.push({ method, reason: 'transport failure' })
      await route.abort()
      return
    }
    if (response.status() >= 300 && response.status() < 400) {
      stopped.push({ method, reason: 'redirect' })
      await route.abort()
      return
    }
    if (apiPath) {
      try {
        // Fulfillment can synthesize CORS headers. Check the actual API response first.
        assertStagingCors(new Headers(response.headers()), approval.frontend)
      } catch {
        stopped.push({ method, reason: 'API response CORS rejected' })
        await route.abort()
        return
      }
    }
    await route.fulfill({ response })
  })
  return stopped
}
