import { createHash } from 'node:crypto'
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

const callbackPath = '/auth/google/deletion/callback'
const provider = 'https://accounts.google.com/o/oauth2/v2/auth'
const challengeId = '0a067241-1242-4689-99aa-65c3b937fceb'
const state = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
const code = 'mock-google-authorization-code'
const pendingKey = 'loomora.google-deletion'
const sessionKey = 'loomora.session'
const account = {
  token: '1|synthetic-account',
  expiresAt: '2099-01-01T00:00:00Z',
  user: {
    id: 'e2e-google-account',
    name: 'Sokha',
    email: 'sokha@example.test',
    has_password: false,
    email_verified_at: '2026-10-24T03:00:00Z',
    timezone: 'Asia/Phnom_Penh',
    time_format: '24h',
    week_starts_on: 1,
    survey_done: true,
  },
}

test.use({ reducedMotion: 'reduce' })

function previewOrigin(baseURL: string | undefined) {
  if (!baseURL) throw new Error('Playwright baseURL is required')
  return new URL(baseURL).origin
}

async function mockFlow(
  page: Page,
  origin: string,
  options: {
    callback?: string
    deleteStatus?: number
    proofLifetime?: number
    beforeCallback?: () => Promise<void>
    beforeDelete?: () => Promise<void>
  } = {},
) {
  const requests = { challenge: [] as unknown[], verify: [] as unknown[], remove: [] as unknown[] }
  const callback = options.callback ?? `?code=${code}&state=${state}`
  await page.route(`${provider}?*`, async (route) => {
    await options.beforeCallback?.()
    await route.fulfill({ status: 302, headers: { location: origin + callbackPath + callback } })
  })
  await page.route(/\/api\/v1\//, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (path.endsWith('/challenge')) {
      requests.challenge.push(request.postDataJSON())
      const url = new URL(provider)
      url.searchParams.set('state', state)
      url.searchParams.set('redirect_uri', origin + callbackPath)
      return route.fulfill({
        status: 201,
        headers,
        json: {
          data: {
            id: challengeId,
            authorization_url: url.href,
            expires_at: new Date(Date.now() + 60_000).toISOString(),
          },
        },
      })
    }
    if (path.endsWith('/verify')) {
      requests.verify.push(request.postDataJSON())
      return route.fulfill({
        headers,
        json: {
          data: {
            id: challengeId,
            expires_at: new Date(Date.now() + (options.proofLifetime ?? 30_000)).toISOString(),
          },
        },
      })
    }
    if (request.method() === 'DELETE' && path.endsWith('/me')) {
      requests.remove.push(request.postDataJSON())
      await options.beforeDelete?.()
      return route.fulfill({ status: options.deleteStatus ?? 204, headers })
    }
    const data = path.endsWith('/streak')
      ? { current_streak: 0, longest_streak: 0, today_counted: false }
      : []
    return route.fulfill({ headers, json: { status: 'ok', data } })
  })
  return requests
}

async function openGoogleDeletion(page: Page) {
  await page.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
    key: sessionKey,
    value: account,
  })
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Delete my account' }).click()
  return page.getByRole('button', { name: 'Verify with Google' })
}

test('verifies in the initiating tab and deletes only after explicit confirmation', async ({
  page,
  baseURL,
}) => {
  const origin = previewOrigin(baseURL)
  const requests = await mockFlow(page, origin)
  await page.goto('/today')
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  await page.getByRole('dialog').getByLabel('Title').fill('Guest plan to keep')
  await page.getByRole('dialog').getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText('Guest plan to keep')).toBeVisible()

  const verify = await openGoogleDeletion(page)
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined))
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) {
    await page.reload()
    await page.getByRole('button', { name: 'Delete my account' }).click()
  }
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
  const callbackResponse = page.waitForResponse(
    (response) => new URL(response.url()).pathname === callbackPath,
  )
  await verify.click()
  await expect(page).toHaveURL(origin + callbackPath)
  expect((await callbackResponse).fromServiceWorker()).toBe(false)
  await expect(page.getByText('Google verification complete.')).toBeVisible()
  expect(requests.verify).toHaveLength(1)
  const proof = requests.verify[0] as { browser_verifier: string }
  expect(proof).toMatchObject({ challenge_id: challengeId, state, code })
  expect(proof.browser_verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(requests.challenge).toEqual([
    {
      browser_challenge: createHash('sha256').update(proof.browser_verifier).digest('base64url'),
    },
  ])
  expect(requests.remove).toEqual([])
  expect(await page.evaluate((key) => sessionStorage.getItem(key), pendingKey)).toBeNull()

  await page.setViewportSize({ width: 320, height: 700 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations).toEqual([])

  const remove = page.getByRole('button', { name: 'Delete everything' })
  await remove.evaluate((button: HTMLButtonElement) => {
    button.click()
    button.click()
  })
  await expect(page.getByText('Your Loomora account was deleted.')).toBeVisible()
  expect(requests.remove).toEqual([
    {
      google_confirmation: { challenge_id: challengeId, browser_verifier: proof.browser_verifier },
    },
  ])
  expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toBeNull()
  await page.goto('/today')
  await expect(page.getByText('Guest plan to keep')).toBeVisible()
})

test('rejects a copied callback in a second tab without consuming the initiating tab', async ({
  page,
  context,
  baseURL,
}) => {
  const origin = previewOrigin(baseURL)
  const second = await context.newPage()
  const copied = await mockFlow(second, origin)
  const initiating = await mockFlow(page, origin, {
    beforeCallback: async () => {
      await second.goto(`${origin}${callbackPath}?code=${code}&state=${state}`)
      await expect(second.getByRole('alert')).toHaveText(
        'Google verification could not be confirmed. Start again from Profile.',
      )
      await expect(second).toHaveURL(origin + callbackPath)
    },
  })
  await page.goto('/')
  await (await openGoogleDeletion(page)).click()
  await expect(page.getByText('Google verification complete.')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel' }).click()
  await expect(page).toHaveURL(origin + '/profile')
  expect(copied.verify).toEqual([])
  expect(initiating.verify).toHaveLength(1)
  expect(initiating.remove).toEqual([])
})

test('clears denied verification without calling verify or delete', async ({ page, baseURL }) => {
  const origin = previewOrigin(baseURL)
  const requests = await mockFlow(page, origin, { callback: `?error=access_denied&state=${state}` })
  await page.goto('/')
  await (await openGoogleDeletion(page)).click()
  await expect(page.getByRole('alert')).toHaveText('Google verification was cancelled.')
  await expect(page).toHaveURL(origin + callbackPath)
  expect(requests.verify).toEqual([])
  expect(requests.remove).toEqual([])
  expect(await page.evaluate((key) => sessionStorage.getItem(key), pendingKey)).toBeNull()
})

test('clears expired confirmation before a deletion can be sent', async ({ page, baseURL }) => {
  const origin = previewOrigin(baseURL)
  const requests = await mockFlow(page, origin, { proofLifetime: 1000 })
  await page.goto('/')
  await (await openGoogleDeletion(page)).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Google verification expired. Start again from Profile.',
  )
  await expect(page.getByRole('button', { name: 'Delete everything' })).toHaveCount(0)
  expect(requests.verify).toHaveLength(1)
  expect(requests.remove).toEqual([])
})

test('keeps the session on a final 401 and drops the failed confirmation', async ({
  page,
  baseURL,
}) => {
  const origin = previewOrigin(baseURL)
  const requests = await mockFlow(page, origin, { deleteStatus: 401 })
  await page.goto('/')
  await (await openGoogleDeletion(page)).click()
  await page.getByRole('button', { name: 'Delete everything' }).click()
  await expect(page.getByRole('alert')).toContainText('Your Loomora session ended or changed.')
  await expect(page.getByRole('button', { name: 'Delete everything' })).toHaveCount(0)
  expect(requests.remove).toHaveLength(1)
  expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toContain(
    account.token,
  )
})

for (const duringDelete of [false, true]) {
  test(`preserves an account selected in another tab ${duringDelete ? 'during' : 'before'} deletion`, async ({
    page,
    context,
    baseURL,
  }) => {
    const origin = previewOrigin(baseURL)
    const second = await context.newPage()
    await second.goto(origin)
    const other = {
      ...account,
      token: '2|other-synthetic-account',
      user: { ...account.user, id: 'other-account' },
    }
    async function switchAccount() {
      await second.evaluate(({ key, value }) => localStorage.setItem(key, JSON.stringify(value)), {
        key: sessionKey,
        value: other,
      })
    }
    const requests = await mockFlow(
      page,
      origin,
      duringDelete ? { beforeDelete: switchAccount } : {},
    )
    await page.goto('/')
    await (await openGoogleDeletion(page)).click()
    await expect(page.getByText('Google verification complete.')).toBeVisible()

    if (duringDelete) {
      await page.getByRole('button', { name: 'Delete everything' }).click()
      await expect(page.getByRole('alert')).toContainText('Your Loomora session ended or changed.')
      await expect(page.getByText('Your Loomora account was deleted.')).toHaveCount(0)
      expect(requests.remove).toHaveLength(1)
    } else {
      await switchAccount()
      await expect(page.getByRole('alert')).toContainText('Your Loomora session ended or changed.')
      expect(requests.remove).toEqual([])
    }
    expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toContain(
      other.token,
    )
  })
}

test('clears the original session when it expires while awaiting HTTP 204', async ({
  page,
  baseURL,
}) => {
  const origin = previewOrigin(baseURL)
  const requests = await mockFlow(page, origin, {
    beforeDelete: () => page.clock.setFixedTime(new Date('2099-01-02T00:00:00Z')),
  })
  await page.goto('/')
  await (await openGoogleDeletion(page)).click()
  await page.getByRole('button', { name: 'Delete everything' }).click()
  await expect(page.getByText('Your Loomora account was deleted.')).toBeVisible()
  expect(requests.remove).toHaveLength(1)
  expect(await page.evaluate((key) => localStorage.getItem(key), sessionKey)).toBeNull()
})
