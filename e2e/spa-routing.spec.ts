import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { localHeaderValue } from './local-api'

interface VercelHeaderRule {
  source: string
  headers: { key: string; value: string }[]
}

interface VercelConfig {
  framework?: string
  buildCommand?: string
  outputDirectory?: string
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

function readVercelConfig(repoRoot: string): VercelConfig | null {
  const configPath = path.join(repoRoot, 'vercel.json')
  if (!fs.existsSync(configPath)) return null
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
        res.setHeader(header.key, localHeaderValue(header.key, header.value))
      }
    }
  }
  fs.createReadStream(filePath).pipe(res)
}

async function startVercelHost(repoRoot: string) {
  const distDir = path.join(repoRoot, 'dist')
  const config = readVercelConfig(repoRoot)
  const rewrites = config?.rewrites ?? []
  const headerRules = config?.headers ?? []

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
          serveFile(res, dest, rule.destination, headerRules, 200)
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

function trackNavigationProblems(page: Page) {
  const errors: string[] = []
  const documentRequests: string[] = []
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`${msg.type()}: ${msg.text()}`)
    }
  })
  page.on('request', (req) => {
    if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
      documentRequests.push(new URL(req.url()).pathname)
    }
  })
  return { errors, documentRequests }
}

const DIRECT_ROUTES: { path: string; heading: string; shell: boolean }[] = [
  { path: '/today', heading: 'Today', shell: true },
  { path: '/week', heading: 'Week', shell: true },
  { path: '/profile', heading: 'Profile', shell: true },
  { path: '/sign-in', heading: 'Sign in', shell: false },
  { path: '/this-route-does-not-exist', heading: 'Page not found', shell: false },
]

test.describe('QA-013 Vercel SPA route reliability', () => {
  const repoRoot = path.resolve('.')
  let host: Awaited<ReturnType<typeof startVercelHost>>

  test.beforeAll(async () => {
    host = await startVercelHost(repoRoot)
  })

  test.afterAll(async () => {
    await host.close()
  })

  test('direct HTTP navigation and refresh succeed on SPA routes and unknown route', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-375', 'Mobile-first 375 px verification')

    const { errors, documentRequests } = trackNavigationProblems(page)

    for (const route of DIRECT_ROUTES) {
      documentRequests.length = 0
      const response = await page.goto(`${host.baseUrl}${route.path}`)
      expect(response?.status(), `initial GET ${route.path}`).toBe(200)
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
      expect(documentRequests).toEqual([route.path])

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow).toBeLessThanOrEqual(0)

      if (route.shell) {
        await expect(page.getByTestId('bottom-nav')).toBeVisible()
      } else {
        await expect(page.getByTestId('bottom-nav')).toHaveCount(0)
      }

      documentRequests.length = 0
      const reload = await page.reload()
      expect(reload?.status(), `reload GET ${route.path}`).toBe(200)
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
      expect(documentRequests).toEqual([route.path])
    }

    await page.getByRole('link', { name: 'Go to Today' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('direct HTTP navigation to /auth/google/callback settles without redirect loops', async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-375', 'Mobile-first 375 px verification')

    const { errors, documentRequests } = trackNavigationProblems(page)

    const noCodeResponse = await page.goto(`${host.baseUrl}/auth/google/callback`)
    expect(noCodeResponse?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
    await expect(page.getByRole('alert')).toContainText('Google sign-in did not work')
    expect(page.url()).toBe(`${host.baseUrl}/sign-in?error=google_failed`)
    expect(documentRequests).toEqual(['/auth/google/callback'])

    const reloadErrorPage = await page.reload()
    expect(reloadErrorPage?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()

    let exchangeCalls = 0
    await page.route('**/api/v1/auth/google/exchange', async (route) => {
      exchangeCalls += 1
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
      await route.fulfill({
        status: 200,
        headers: { 'access-control-allow-origin': '*' },
        json: {
          token: '1|google-e2e',
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
    })
    await page.route('**/api/v1/**', async (route) => {
      if (route.request().url().includes('/auth/google/exchange')) {
        await route.fallback()
        return
      }
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
      const json = url.includes('/streak')
        ? { data: { current_streak: 0, longest_streak: 0, today_counted: false } }
        : url.endsWith('/intention')
          ? { data: { date: '2026-11-20', text: null } }
          : { data: [] }
      await route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, json })
    })

    documentRequests.length = 0
    const codeResponse = await page.goto(
      `${host.baseUrl}/auth/google/callback?code=qa013-valid-code`,
    )
    expect(codeResponse?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    expect(exchangeCalls).toBe(1)
    expect(documentRequests).toEqual(['/auth/google/callback'])
    expect(page.url()).toBe(`${host.baseUrl}/today`)

    const reloadToday = await page.reload()
    expect(reloadToday?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    expect(errors).toEqual([])
  })

  test('preserves static assets, API exclusions, and Workbox navigateFallbackDenylist', async ({
    request,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'phone-375', 'Single-run static routing check')

    const config = readVercelConfig(repoRoot)
    expect(config).not.toBeNull()
    expect(config?.framework).toBe('vite')
    expect(config?.outputDirectory).toBe('dist')

    const swRes = await request.get(`${host.baseUrl}/sw.js`)
    expect(swRes.status()).toBe(200)
    expect(swRes.headers()['content-type']).toContain('javascript')
    expect(swRes.headers()['cache-control']).toContain('must-revalidate')

    const manifestRes = await request.get(`${host.baseUrl}/manifest.webmanifest`)
    expect(manifestRes.status()).toBe(200)
    expect(manifestRes.headers()['content-type']).toContain('manifest+json')

    const iconRes = await request.get(`${host.baseUrl}/icon.svg`)
    expect(iconRes.status()).toBe(200)
    expect(iconRes.headers()['content-type']).toContain('image/svg+xml')

    const assetsDir = path.join(repoRoot, 'dist', 'assets')
    const firstJs = fs.readdirSync(assetsDir).find((file) => file.endsWith('.js'))
    const firstCss = fs.readdirSync(assetsDir).find((file) => file.endsWith('.css'))
    expect(firstJs).toBeTruthy()
    expect(firstCss).toBeTruthy()

    const jsRes = await request.get(`${host.baseUrl}/assets/${firstJs}`)
    expect(jsRes.status()).toBe(200)
    expect(jsRes.headers()['content-type']).toContain('javascript')

    const cssRes = await request.get(`${host.baseUrl}/assets/${firstCss}`)
    expect(cssRes.status()).toBe(200)
    expect(cssRes.headers()['content-type']).toContain('text/css')

    for (const nonSpaPath of ['/api', '/api/v1/health', '/assets/missing-chunk.js']) {
      const missingRes = await request.get(`${host.baseUrl}${nonSpaPath}`)
      expect(missingRes.status(), nonSpaPath).toBe(404)
    }

    const swSource = fs.readFileSync(path.join(repoRoot, 'dist', 'sw.js'), 'utf8')
    expect(swSource).toContain('NavigationRoute')
    expect(swSource).toContain('denylist')
  })

  test('offline PWA navigation and reload work on SPA routes without intercepting API routes', async ({
    page,
    context,
    browserName,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== 'phone-375' || browserName !== 'chromium',
      'Mobile Chromium PWA offline check',
    )

    await page.goto(`${host.baseUrl}/today`)
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
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

    for (const route of DIRECT_ROUTES) {
      await page.goto(`${host.baseUrl}${route.path}`)
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible()
      await expect(page.getByText(/You are offline/)).toBeVisible()
    }

    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await expect(page.getByText(/You are offline/)).toBeVisible()

    // Ensure Workbox NavigationRoute denylist prevents serving index.html for /api/** offline.
    await expect(page.goto(`${host.baseUrl}/api/v1/health`)).rejects.toThrow()

    await context.setOffline(false)
  })
})
