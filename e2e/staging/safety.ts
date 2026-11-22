interface StagingApproval {
  runId: string
  frontend: string
  api: string
  frontendSha: string
  backendSha: string
  emails: { a: string; b: string; unknown: string; google: string }
}

type ApprovalEnv = Record<string, string | undefined>

const productionHosts = new Set(['loomora-api.onrender.com', 'loomora-craft.vercel.app'])
const shaPattern = /^[a-f0-9]{40}$/
const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/

function stagingUrl(value: unknown, pathname: string) {
  if (typeof value !== 'string') throw new Error('QA-022 requires explicit HTTPS origins')
  const url = new URL(value)
  if (
    url.protocol !== 'https:' ||
    url.href !== url.origin + pathname ||
    value !== url.origin + (pathname === '/' ? '' : pathname) ||
    !domainPattern.test(url.hostname) ||
    productionHosts.has(url.hostname)
  ) {
    throw new Error('QA-022 rejected a staging URL')
  }
  return url
}

export function loadStagingApproval(input: unknown, env: ApprovalEnv): StagingApproval {
  if (typeof input !== 'object' || input === null) throw new Error('QA-022 approval is required')
  const approval = input as Record<string, unknown>
  const { runId, frontend, api, frontendSha, backendSha, mailboxDomain, googleEmail } = approval
  if (
    approval.authorization !== 'QA-022-disposable' ||
    typeof runId !== 'string' ||
    !/^qa022-[a-z0-9][a-z0-9-]{2,31}$/.test(runId) ||
    env.QA022_APPROVED_RUN !== runId ||
    env.QA022_FRONTEND_URL !== frontend ||
    env.QA022_API_URL !== api ||
    typeof frontendSha !== 'string' ||
    typeof backendSha !== 'string' ||
    !shaPattern.test(frontendSha) ||
    !shaPattern.test(backendSha) ||
    typeof mailboxDomain !== 'string' ||
    !domainPattern.test(mailboxDomain) ||
    googleEmail !== `${runId}-google@${mailboxDomain}`
  ) {
    throw new Error('QA-022 requires matching approval, exact revisions and synthetic identities')
  }
  const frontendUrl = stagingUrl(frontend, '/')
  const apiUrl = stagingUrl(api, '/api/v1')
  if (frontendUrl.hostname === apiUrl.hostname) throw new Error('QA-022 requires separate hosts')
  return {
    runId,
    frontend: frontendUrl.origin,
    api: apiUrl.href,
    frontendSha,
    backendSha,
    emails: {
      a: `${runId}-a@${mailboxDomain}`,
      b: `${runId}-b@${mailboxDomain}`,
      unknown: `${runId}-unused@${mailboxDomain}`,
      google: googleEmail,
    },
  }
}

export function assertStagingIdentity(headers: Headers, runId: string, sha: string) {
  if (headers.get('x-loomora-qa-approval') !== runId || headers.get('x-loomora-revision') !== sha) {
    throw new Error('QA-022 staging identity or deployed revision did not match approval')
  }
}

export function assertStagingCors(headers: Headers, origin: string) {
  if (
    headers.get('access-control-allow-origin') !== origin ||
    headers.has('access-control-allow-credentials')
  ) {
    throw new Error('QA-022 API CORS does not authorize the exact staging origin')
  }
}

export function assertStagingCsp(policy: string | null, apiOrigin: string) {
  const connect = policy
    ?.split(';')
    .map((value) => value.trim().split(/\s+/))
    .filter(([directive]) => directive === 'connect-src')
  const sources = connect?.[0]?.slice(1)
  if (
    !policy ||
    policy.includes(',') ||
    connect?.length !== 1 ||
    sources?.length !== 2 ||
    !sources.includes("'self'") ||
    !sources.includes(apiOrigin)
  ) {
    throw new Error('QA-022 frontend CSP does not restrict connections to the approved pair')
  }
}

const id = '[a-zA-Z0-9-]+'
const readApi = [
  /^\/(?:health|me|todos|streak|reminders\/due)$/,
  /^\/schedule\/(?:items|day|week|now)$/,
  new RegExp(`^/days/${id}/intention$`),
]
const postApi = [
  /^\/auth\/(?:register|login|logout|email\/verify|password\/(?:forgot|reset))$/,
  /^\/(?:me\/survey|me\/deletion\/google\/challenge|import|todos|schedule\/items)$/,
  new RegExp(`^/(?:todos/${id}/done|schedule/items/${id}/checkins/${id})$`),
]
const patchApi = [new RegExp(`^/(?:todos/${id}|schedule/items/${id})$`)]

export function approvedRequest(approval: StagingApproval, method: string, value: string) {
  const url = new URL(value)
  if (url.href !== value || url.username || url.password || url.hash) return false
  if (url.origin === approval.frontend) {
    return method === 'GET' && !/^\/api(?:\/|$)/i.test(url.pathname)
  }
  const base = approval.api + '/'
  if (!value.startsWith(base) || !url.href.startsWith(base)) return false
  const endpoint = url.pathname.slice('/api/v1'.length)
  if (method === 'GET') return readApi.some((pattern) => pattern.test(endpoint))
  if (method === 'OPTIONS') {
    return [...readApi, ...postApi, ...patchApi].some((pattern) => pattern.test(endpoint))
  }
  if (url.search || method === 'DELETE') return false
  if (method === 'POST') return postApi.some((pattern) => pattern.test(endpoint))
  return method === 'PATCH' && patchApi.some((pattern) => pattern.test(endpoint))
}

export function approvedPayload(
  approval: StagingApproval,
  method: string,
  url: string,
  body: unknown,
) {
  if (method !== 'POST' || !url.startsWith(approval.api + '/auth/')) return true
  const endpoint = url.slice(approval.api.length)
  if (endpoint === '/auth/logout') return true
  if (typeof body !== 'object' || body === null) return false
  const { email, token, signature } = body as Record<string, unknown>
  switch (endpoint) {
    case '/auth/email/verify':
      return signature === '0'.repeat(64)
    case '/auth/password/forgot':
      return email === approval.emails.a || email === approval.emails.unknown
    case '/auth/password/reset':
      return email === approval.emails.a && token === 'qa022-invalid-reset-token'
    default:
      return email === approval.emails.a || email === approval.emails.b
  }
}

export async function requestWithoutRedirect(
  transport: typeof fetch,
  url: string,
  options: RequestInit,
) {
  let response: Response
  try {
    response = await transport(url, { ...options, redirect: 'manual' })
  } catch {
    throw new Error('QA-022 staging transport failed')
  }
  if (response.status >= 300 && response.status < 400) {
    throw new Error('QA-022 stopped an unexpected HTTP redirect')
  }
  return response
}
