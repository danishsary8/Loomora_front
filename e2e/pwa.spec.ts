import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

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

async function startSwUpdateServer(repoRoot: string) {
  const distDir = path.join(repoRoot, 'dist')
  let version = 1
  const server = http.createServer((req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname
    const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    let filePath = path.resolve(distDir, rel)
    if (
      !filePath.startsWith(distDir + path.sep) ||
      !fs.existsSync(filePath) ||
      fs.statSync(filePath).isDirectory()
    ) {
      filePath = path.resolve(distDir, 'index.html')
    }
    const ext = path.extname(filePath).toLowerCase()
    res.setHeader('Content-Type', MIME_TYPES[ext] ?? 'application/octet-stream')
    if (pathname === '/sw.js') {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
      let sw = fs.readFileSync(filePath, 'utf8')
      if (version === 2) {
        sw = sw.replace(/revision:"([0-9a-f]+)"/, 'revision:"22222222222222222222222222222222"')
      }
      res.end(sw)
      return
    }
    if (filePath.endsWith('index.html')) {
      let html = fs.readFileSync(filePath, 'utf8')
      if (version === 2) html = html.replace('</body>', '<!-- v2 --></body>')
      res.end(html)
      return
    }
    fs.createReadStream(filePath).pipe(res)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected TCP port')
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    shipV2: () => {
      version = 2
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  }
}

// F-013 done-when: Chrome sees the app as installable, and it opens offline after one visit.
test.describe('PWA', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'uses Chrome DevTools Protocol')

  test('Chrome reports no installability errors and manifest icons load cleanly', async ({
    page,
    context,
    request,
  }) => {
    await page.goto('/')
    await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest/)
    const cdp = await context.newCDPSession(page)
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    expect(installabilityErrors).toEqual([])

    const manifestRes = await request.get('/manifest.webmanifest')
    expect(manifestRes.status()).toBe(200)
    const manifest = (await manifestRes.json()) as {
      name: string
      start_url: string
      display: string
      icons: { src: string; sizes: string; type: string; purpose?: string }[]
    }
    expect(manifest.name).toBe('Loomora')
    expect(manifest.start_url).toBe('/today')
    expect(manifest.display).toBe('standalone')
    expect(manifest.icons.some((icon) => icon.sizes === '192x192')).toBe(true)
    expect(manifest.icons.some((icon) => icon.sizes === '512x512')).toBe(true)
    expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true)

    for (const icon of manifest.icons) {
      const iconRes = await request.get(`/${icon.src}`)
      expect(iconRes.status(), icon.src).toBe(200)
      expect(iconRes.headers()['content-type']).toContain(icon.type)
    }
  })

  test('opens offline after one visit and shows the offline banner', async ({ page, context }) => {
    await page.goto('/today')
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    // Wait until the service worker controls the page and has cached the shell.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready
    })
    await page.reload()
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    await expect(page.getByText(/You are offline/)).toBeVisible()

    // Missing static assets and API URLs must not resolve to cached HTML offline.
    const missingAssetFailed = await page.evaluate(async () => {
      try {
        const res = await fetch('/assets/missing-chunk.js')
        const text = await res.text()
        return !text.includes('<!doctype html>')
      } catch {
        return true
      }
    })
    expect(missingAssetFailed).toBe(true)

    await context.setOffline(false)
    await expect(page.getByText(/You are offline/)).toBeHidden()
  })

  test('account mode reports offline limitations without claiming unsaved changes succeeded', async ({
    page,
    context,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'loomora.session',
        JSON.stringify({
          token: '1|pwa-offline-account',
          expiresAt: '2099-01-01T00:00:00Z',
          user: {
            id: 'user-pwa-1',
            name: 'PwaUser',
            email: 'pwa@example.test',
            has_password: true,
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
        }),
      )
    })

    await page.route(/\/api\/v1\//, async (route) => {
      const headers = {
        'access-control-allow-origin': '*',
        'access-control-allow-headers': '*',
        'access-control-allow-methods': '*',
      }
      if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
      const url = route.request().url()
      const json = url.includes('/streak')
        ? { data: { current_streak: 0, longest_streak: 0, today_counted: false } }
        : url.endsWith('/intention')
          ? { data: { date: '2026-11-20', text: null } }
          : { data: [] }
      return route.fulfill({ status: 200, headers, json })
    })

    await page.goto('/today')
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
    if (await page.evaluate(() => navigator.serviceWorker.controller === null)) {
      await page.reload()
    }
    await expect
      .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
      .toBe(true)

    await context.setOffline(true)
    await expect(
      page.getByText('You are offline. Changes will not be saved until you are back online.'),
    ).toBeVisible()
    await expect(page.getByText(/saves on this device/)).toHaveCount(0)

    await page.getByRole('button', { name: 'Add a to-do' }).click()
    const sheet = page.getByRole('dialog', { name: 'Add a to-do' })
    await sheet.getByLabel('Title').fill('Should not claim saved offline')
    await sheet.getByRole('button', { name: 'Add', exact: true }).click()

    await expect(sheet).toBeVisible()
    await expect(sheet.getByLabel('Title')).toHaveValue('Should not claim saved offline')
    await expect(page.getByTestId('todo-row')).toHaveCount(0)
    await expect(page.getByText('Saved.')).toHaveCount(0)

    await context.setOffline(false)
  })

  test('Q21: autoUpdate service worker reloads open tab and drops unsaved form state while preserving IndexedDB data', async ({
    page,
  }, testInfo) => {
    testInfo.fail(
      true,
      'Q21: registerType autoUpdate forces window.location.reload() on SW activation, discarding unsaved form input pending planner approval for an update prompt',
    )
    const server = await startSwUpdateServer(path.resolve('.'))
    try {
      await page.goto(`${server.baseUrl}/today`)
      await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
      await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
      if (await page.evaluate(() => navigator.serviceWorker.controller === null)) {
        await page.reload()
      }
      await expect
        .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
        .toBe(true)

      await page.getByRole('button', { name: 'Add a to-do' }).click()
      let sheet = page.getByRole('dialog', { name: 'Add a to-do' })
      await sheet.getByLabel('Title').fill('Persisted before update')
      await sheet.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(sheet).toBeHidden()
      await expect(page.getByText('Persisted before update')).toBeVisible()

      // Open sheet and type unsaved input before a new SW version ships.
      await page.getByRole('button', { name: 'Add a to-do' }).click()
      sheet = page.getByRole('dialog', { name: 'Add a to-do' })
      await sheet.getByLabel('Title').fill('Unsaved draft during SW update')

      server.shipV2()
      await page.evaluate(async () => {
        const reg = await navigator.serviceWorker.getRegistration()
        await reg?.update()
      })

      // Wait for autoUpdate reload to settle, verify persisted IndexedDB data survived,
      // then assert unsaved form state was not interrupted (fails under autoUpdate).
      await page.waitForTimeout(2000)
      await expect(page.getByText('Persisted before update')).toBeVisible()
      await expect(page.getByRole('dialog', { name: 'Add a to-do' })).toBeVisible()
    } finally {
      await server.close()
    }
  })
})
