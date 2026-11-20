import vercelJsonRaw from '../../vercel.json?raw'
import indexHtmlRaw from '../../index.html?raw'

interface VercelHeader {
  key: string
  value: string
}

interface VercelHeaderRule {
  source: string
  headers: VercelHeader[]
}

interface VercelConfig {
  framework?: string
  buildCommand?: string
  outputDirectory?: string
  rewrites?: { source: string; destination: string }[]
  headers?: VercelHeaderRule[]
}

function parseCsp(headerValue: string): Map<string, string[]> {
  const directives = new Map<string, string[]>()
  for (const part of headerValue.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const [name, ...tokens] = trimmed.split(/\s+/)
    if (name) directives.set(name.toLowerCase(), tokens)
  }
  return directives
}

function resolveHeadersForPath(rules: VercelHeaderRule[], pathname: string): Map<string, string> {
  const resolved = new Map<string, string>()
  for (const rule of rules) {
    if (new RegExp(`^${rule.source}$`).test(pathname)) {
      for (const header of rule.headers) {
        resolved.set(header.key.toLowerCase(), header.value)
      }
    }
  }
  return resolved
}

async function sha256Base64(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes)
  const binary = Array.from(new Uint8Array(digest), (b) => String.fromCharCode(b)).join('')
  return btoa(binary)
}

function extractInlineStyle(html: string): string {
  const match = html.match(/<style>([\s\S]*?)<\/style>/)
  if (!match?.[1]) throw new Error('Expected inline <style> block in index.html')
  return match[1].replace(/\r\n/g, '\n')
}

describe('Vercel frontend browser security headers and CSP (QA-015)', () => {
  const config = JSON.parse(vercelJsonRaw) as VercelConfig
  const headerRules = config.headers ?? []

  it('preserves Vite build settings, SPA rewrite exclusions, and /sw.js Cache-Control', () => {
    expect(config.framework).toBe('vite')
    expect(config.buildCommand).toBe('npm run build')
    expect(config.outputDirectory).toBe('dist')

    const spaRewrite = config.rewrites?.[0]
    expect(spaRewrite?.destination).toBe('/index.html')
    const rewriteRegex = new RegExp(`^${spaRewrite?.source ?? ''}$`)
    for (const spaRoute of ['/today', '/week', '/profile', '/sign-in', '/auth/google/callback']) {
      expect(rewriteRegex.test(spaRoute), `SPA route ${spaRoute} should rewrite`).toBe(true)
    }
    for (const excluded of [
      '/api',
      '/api/v1/health',
      '/assets/app.js',
      '/sw.js',
      '/manifest.webmanifest',
      '/workbox-9c191d2f.js',
    ]) {
      expect(rewriteRegex.test(excluded), `Excluded path ${excluded} must not rewrite`).toBe(false)
    }

    const swHeaders = resolveHeadersForPath(headerRules, '/sw.js')
    expect(swHeaders.get('cache-control')).toBe('public, max-age=0, must-revalidate')

    const rootHeaders = resolveHeadersForPath(headerRules, '/')
    expect(rootHeaders.has('cache-control')).toBe(false)
  })

  it.each([
    '/',
    '/today',
    '/auth/google/callback',
    '/sw.js',
    '/manifest.webmanifest',
    '/assets/app.js',
  ])('emits required browser security headers for %s', (pathname) => {
    const headers = resolveHeadersForPath(headerRules, pathname)
    expect(headers.get('x-content-type-options')).toBe('nosniff')
    expect(headers.get('x-frame-options')).toBe('DENY')
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
    expect(headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains; preload',
    )
    expect(headers.get('permissions-policy')).toContain('camera=()')
    expect(headers.get('permissions-policy')).toContain('microphone=()')
    expect(headers.get('permissions-policy')).toContain('geolocation=()')
    expect(headers.get('content-security-policy')).toBeTruthy()
  })

  it('enforces a restrictive CSP matching Loomora assets, inline boot style hash, and Render API', async () => {
    const headers = resolveHeadersForPath(headerRules, '/')
    const cspRaw = headers.get('content-security-policy')
    expect(cspRaw).toBeTruthy()
    const csp = parseCsp(cspRaw ?? '')

    expect(csp.get('default-src')).toEqual(["'self'"])
    expect(csp.get('script-src')).toEqual(["'self'"])
    expect(csp.get('img-src')).toEqual(["'self'"])
    expect(csp.get('font-src')).toEqual(["'self'"])
    expect(csp.get('manifest-src')).toEqual(["'self'"])
    expect(csp.get('worker-src')).toEqual(["'self'"])
    expect(csp.get('object-src')).toEqual(["'none'"])
    expect(csp.get('base-uri')).toEqual(["'self'"])
    expect(csp.get('form-action')).toEqual(["'self'"])
    expect(csp.get('frame-ancestors')).toEqual(["'none'"])

    const expectedStyleHash = `'sha256-${await sha256Base64(extractInlineStyle(indexHtmlRaw))}'`
    const styleSrc = csp.get('style-src') ?? []
    expect(styleSrc).toContain("'self'")
    expect(styleSrc).toContain(expectedStyleHash)
    expect(styleSrc).not.toContain("'unsafe-inline'")
    expect(styleSrc).not.toContain('*')

    const connectSrc = csp.get('connect-src') ?? []
    expect(connectSrc).toEqual(["'self'", 'https://loomora-api.onrender.com'])
    expect(connectSrc).not.toContain('*')
    for (const token of connectSrc) {
      expect(token.startsWith('http://')).toBe(false)
    }
  })
})
