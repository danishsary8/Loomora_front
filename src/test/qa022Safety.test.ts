import { describe, expect, it } from 'vitest'
import {
  approvedPayload,
  approvedRequest,
  assertStagingCors,
  assertStagingCsp,
  assertStagingIdentity,
  loadStagingApproval,
  requestWithoutRedirect,
} from '../../e2e/staging/safety'

const sha = 'a'.repeat(40)
const approval = {
  authorization: 'QA-022-disposable',
  runId: 'qa022-example',
  frontend: 'https://frontend.staging.example.test',
  api: 'https://api.staging.example.test/api/v1',
  frontendSha: sha,
  backendSha: sha,
  mailboxDomain: 'mail.example.test',
  googleEmail: 'qa022-example-google@mail.example.test',
}
const env = {
  QA022_APPROVED_RUN: approval.runId,
  QA022_FRONTEND_URL: approval.frontend,
  QA022_API_URL: approval.api,
}

describe('QA-022 staging safety', () => {
  it('binds the process opt-in to independently approved origins and synthetic identities', () => {
    expect(loadStagingApproval(approval, env).emails).toEqual({
      a: 'qa022-example-a@mail.example.test',
      b: 'qa022-example-b@mail.example.test',
      unknown: 'qa022-example-unused@mail.example.test',
      google: approval.googleEmail,
    })
    expect(() => loadStagingApproval(approval, {})).toThrow()
    expect(() =>
      loadStagingApproval(approval, { ...env, QA022_API_URL: env.QA022_FRONTEND_URL }),
    ).toThrow()
    expect(() =>
      loadStagingApproval({ ...approval, googleEmail: 'real@mail.example.test' }, env),
    ).toThrow()
  })

  it.each([
    'https://loomora-api.onrender.com/api/v1',
    'https://loomora-craft.vercel.app/api/v1',
    'https://api.staging.example.test@loomora-api.onrender.com/api/v1',
    'http://api.staging.example.test/api/v1',
    'https://api.staging.example.test/api/v1?redirect=1',
  ])('rejects bad targets even when both inputs agree (%s)', (api) => {
    expect(() =>
      loadStagingApproval({ ...approval, api }, { ...env, QA022_API_URL: api }),
    ).toThrow()
  })

  it('requires both staging identity and exact release revision before allowing writes', () => {
    const headers = { 'x-loomora-qa-approval': approval.runId, 'x-loomora-revision': sha }
    expect(() => assertStagingIdentity(new Headers(headers), approval.runId, sha)).not.toThrow()
    expect(() =>
      assertStagingIdentity(
        new Headers({ ...headers, 'x-loomora-revision': 'b'.repeat(40) }),
        approval.runId,
        sha,
      ),
    ).toThrow()
    expect(() =>
      assertStagingIdentity(new Headers({ 'x-loomora-revision': sha }), approval.runId, sha),
    ).toThrow()
  })

  it('blocks account deletion, cross-origin, API escapes and OAuth redirects', () => {
    const approved = loadStagingApproval(approval, env)
    expect(approvedRequest(approved, 'POST', approval.api + '/auth/register')).toBe(true)
    expect(approvedRequest(approved, 'POST', approval.api + '/todos/one/done')).toBe(true)
    expect(approvedRequest(approved, 'GET', approval.frontend + '/today')).toBe(true)
    for (const [method, url] of [
      ['DELETE', approval.api + '/me'],
      ['POST', approval.frontend + '/api/v1/auth/register'],
      ['POST', approval.api + '/auth/register?override=1'],
      ['POST', approval.api + '/auth%2fregister'],
      ['POST', approval.api + '/../auth/register'],
      ['POST', approval.api + '/other/../auth/register'],
      ['POST', approval.api + '/other/%2e%2e/auth/register'],
      ['GET', approval.api + '/auth/google/redirect'],
      ['POST', 'https://loomora-api.onrender.com/api/v1/auth/register'],
    ] as const) {
      expect(approvedRequest(approved, method, url)).toBe(false)
    }
  })

  it('uses manual redirects and rejects redirects without a second request', async () => {
    let calls = 0
    const transport: typeof fetch = async (_url, init) => {
      calls += 1
      expect(init?.redirect).toBe('manual')
      return new Response(null, {
        status: 307,
        headers: { location: 'https://loomora-api.onrender.com' },
      })
    }
    await expect(
      requestWithoutRedirect(transport, approval.api + '/auth/register', { method: 'POST' }),
    ).rejects.toThrow('redirect')
    expect(calls).toBe(1)
  })

  it('limits identity writes to the approved synthetic accounts and invalid link fixtures', () => {
    const approved = loadStagingApproval(approval, env)
    const check = (path: string, body: unknown) =>
      approvedPayload(approved, 'POST', approval.api + '/auth/' + path, body)
    expect(check('register', { email: approved.emails.a })).toBe(true)
    expect(check('register', { email: 'other@mail.example.test' })).toBe(false)
    expect(check('password/forgot', { email: approved.emails.unknown })).toBe(true)
    expect(check('password/reset', { email: approved.emails.a, token: 'real-token' })).toBe(false)
    expect(check('email/verify', { signature: 'f'.repeat(64) })).toBe(false)
  })

  it('requires each raw cross-origin response to authorize the exact browser origin', () => {
    const cors = new Headers({ 'access-control-allow-origin': approval.frontend })
    expect(() => assertStagingCors(cors, approval.frontend)).not.toThrow()
    expect(() => assertStagingCors(new Headers(), approval.frontend)).toThrow()
    expect(() =>
      assertStagingCors(new Headers({ 'access-control-allow-origin': '*' }), approval.frontend),
    ).toThrow()
    cors.set('access-control-allow-credentials', 'true')
    expect(() => assertStagingCors(cors, approval.frontend)).toThrow()
  })

  it('requires the deployed connect-src to name only self and the approved API', () => {
    const apiOrigin = new URL(approval.api).origin
    const csp = `default-src 'self'; connect-src 'self' ${apiOrigin}; object-src 'none'`
    expect(() => assertStagingCsp(csp, apiOrigin)).not.toThrow()
    expect(() =>
      assertStagingCsp(
        csp.replace(apiOrigin, apiOrigin + ' https://loomora-api.onrender.com'),
        apiOrigin,
      ),
    ).toThrow()
    expect(() => assertStagingCsp(csp + '; connect-src *', apiOrigin)).toThrow()
  })
})
