import { expect, test, type Page, type Route } from '@playwright/test'

// F-019: in account mode a dead API shows a banner; Retry brings the screens back.
const API = /\/api\//
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
}

const USER = {
  id: '9f1c2d3e-4b5a-4c6d-8e7f-0a1b2c3d4e5f',
  name: 'sokha',
  email: 'sokha@example.com',
  email_verified_at: null,
  timezone: 'Asia/Phnom_Penh',
  goal: null,
  heard_from: null,
  survey_done: true,
  current_streak: 0,
  longest_streak: 0,
  created_at: '2026-10-24T03:00:00Z',
}

async function signedInPage(page: Page) {
  await page.addInitScript((user) => {
    localStorage.setItem(
      'loomora.session',
      JSON.stringify({ token: '1|e2e', expiresAt: '2099-01-01T00:00:00Z', user }),
    )
  }, USER)
}

function answer(route: Route) {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS })
  const isHealth = route.request().url().includes('/health')
  const body = isHealth
    ? { status: 'ok' }
    : {
        data: route.request().url().includes('/streak')
          ? { current_streak: 0, longest_streak: 0, today_counted: false }
          : [],
      }
  return route.fulfill({ json: body, headers: CORS })
}

test.describe('backend down', () => {
  test('banner appears when the API is unreachable and goes after Retry', async ({ page }) => {
    await signedInPage(page)
    await page.route(API, (route) => route.abort())
    await page.goto('/today')

    const banner = page.getByText(/We cannot reach Loomora/)
    await expect(banner).toBeVisible()
    await expect(page.getByText(/sync/i)).toHaveCount(0)

    await page.unroute(API)
    await page.route(API, answer)
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(banner).toBeHidden()
  })

  test('an unknown URL shows the 404 page', async ({ page }) => {
    await page.goto('/no/such/page')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Today/ })).toBeVisible()
  })

  test('guests never call the API', async ({ page }) => {
    const calls: string[] = []
    page.on('request', (request) => {
      if (API.test(request.url())) calls.push(request.url())
    })
    await page.route(API, (route) => route.abort())
    await page.goto('/today')
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    await expect(page.getByText(/We cannot reach Loomora/)).toHaveCount(0)
    expect(calls).toEqual([])
  })
})
