import { randomBytes } from 'node:crypto'
import { expect, test, type Page } from '@playwright/test'
import type { ImportBody, ImportResult, TokenResponse, User } from '../../src/lib/api/types'
import type { StoredSession } from '../../src/lib/api/tokenStorage'
import { approval } from './approval'
import { enterPassword } from './password'
import { checkStagingPair, guardBrowser, stagingApi } from './transport'

const timezone = 'Asia/Phnom_Penh'
const callback = '/auth/google/deletion/callback'

function waitForPost(page: Page, path: string) {
  return page.waitForResponse(
    (response) => response.url() === approval.api + path && response.request().method() === 'POST',
  )
}

async function json<T>(response: Response, status: number): Promise<T> {
  expect(response.status).toBe(status)
  return (await response.json()) as T
}

async function submitAuth(page: Page, email: string, password: string, register = false) {
  await page.getByLabel('Email', { exact: true }).fill(email)
  await enterPassword(page.getByLabel('Password', { exact: true }), password)
  const endpoint = register ? 'register' : 'login'
  const result = waitForPost(page, '/auth/' + endpoint)
  await page
    .getByRole('button', { name: register ? 'Create account' : 'Sign in', exact: true })
    .click()
  const response = await result
  expect(response.status()).toBe(register ? 201 : 200)
  const session = (await response.json()) as TokenResponse
  expect(session.user.email === email && typeof session.user.id === 'string').toBe(true)
  expect(Boolean(session.token) && Date.parse(session.expires_at) > Date.now()).toBe(true)
  return session
}

async function guestIds(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const open = indexedDB.open('loomora-guest')
      open.onsuccess = () => resolve(open.result)
      open.onerror = () => reject(open.error)
    })
    try {
      return await new Promise<IDBValidKey[]>((resolve, reject) => {
        const read = db.transaction('todos').objectStore('todos').getAllKeys()
        read.onsuccess = () => resolve(read.result)
        read.onerror = () => reject(read.error)
      })
    } finally {
      db.close()
    }
  })
}

async function addTodo(page: Page, title: string) {
  await page.getByRole('button', { name: 'Add a to-do' }).click()
  const sheet = page.getByRole('dialog', { name: 'Add a to-do' })
  await sheet.getByLabel('Title').fill(title)
  await sheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(sheet).toBeHidden()
  await expect(page.getByText(title, { exact: true })).toBeVisible()
}

async function exerciseAccountWrites(token: string, otherToken: string, title: string) {
  const now = new Date()
  const date = new Intl.DateTimeFormat('sv-SE', { timeZone: timezone }).format(now)
  const weekday = (new Date(date + 'T00:00:00Z').getUTCDay() + 6) % 7
  const todosPath = '/todos?date=' + date
  const weekPath = '/schedule/week?start=' + date
  type Todo = { id: string; title: string; done_at: string | null }
  type Day = { date: string; occurrences: { item_id: string; title: string; done: boolean }[] }
  const todo = await json<{ data: Todo }>(
    await stagingApi('POST', '/todos', { token, body: { title, due_date: date } }),
    201,
  )
  const todoPath = '/todos/' + todo.data.id
  const updated = title + ' edited'
  expect((await stagingApi('PATCH', todoPath, { token, body: { title: updated } })).status).toBe(
    200,
  )
  expect((await stagingApi('POST', todoPath + '/done', { token, body: { date } })).status).toBe(200)
  const schedule = await json<{ data: { id: string } }>(
    await stagingApi('POST', '/schedule/items', {
      token,
      body: { title, start_time: '09:00', end_time: '09:30', days: [weekday], starts_on: date },
    }),
    201,
  )
  const schedulePath = '/schedule/items/' + schedule.data.id
  expect((await stagingApi('POST', `${schedulePath}/checkins/${date}`, { token })).status).toBe(201)

  async function ownerWitness() {
    const todos = await json<{ data: Todo[] }>(await stagingApi('GET', todosPath, { token }), 200)
    const week = await json<{ start: string; data: Day[] }>(
      await stagingApi('GET', weekPath, { token }),
      200,
    )
    expect(week.start).toBe(date)
    expect(week.data).toHaveLength(7)
    expect(week.data[0]?.date).toBe(date)
    return {
      todo: todos.data.find((row) => row.id === todo.data.id),
      occurrence: week.data[0]?.occurrences.find((row) => row.item_id === schedule.data.id),
    }
  }

  const before = await ownerWitness()
  expect(before.todo).toMatchObject({ title: updated, done_at: expect.any(String) })
  expect(before.occurrence).toMatchObject({ title, done: true })
  const otherTodos = await json<{ data: Todo[] }>(
    await stagingApi('GET', todosPath, { token: otherToken }),
    200,
  )
  const otherWeek = await json<{ data: Day[] }>(
    await stagingApi('GET', weekPath, { token: otherToken }),
    200,
  )
  expect(otherTodos.data.some((row) => row.id === todo.data.id)).toBe(false)
  expect(
    otherWeek.data
      .flatMap((day) => day.occurrences)
      .some((row) => row.item_id === schedule.data.id),
  ).toBe(false)
  for (const path of [todoPath, schedulePath]) {
    expect(
      (
        await stagingApi('PATCH', path, {
          token: otherToken,
          body: { title: 'QA-022 isolation probe' },
        })
      ).status,
    ).toBe(403)
  }
  expect(await ownerWitness()).toEqual(before)
  return updated
}

test('pairs browser auth and guest import with real API planner data and account isolation', async ({
  page,
  context,
}) => {
  await checkStagingPair()
  const stopped = await guardBrowser(context)
  const password = 'Aa9!' + randomBytes(18).toString('hex')
  const otherPassword = 'Bb9!' + randomBytes(18).toString('hex')
  const importedTitle = approval.runId + ' guest'

  const session =
    await test.step('register from a guest plan and retry an interrupted import', async () => {
      await page.goto('/today')
      await addTodo(page, importedTitle)
      await expect.poll(() => guestIds(page)).toHaveLength(1)
      const ids = await guestIds(page)
      await page.goto('/profile')
      await page.getByRole('button', { name: 'Save your plan' }).click()
      await page.getByRole('button', { name: 'Create an account' }).click()
      let interrupted = false
      await page.route(approval.api + '/import', async (route) => {
        if (route.request().method() !== 'POST' || interrupted) return route.fallback()
        interrupted = true
        await route.abort()
      })
      const account = await submitAuth(page, approval.emails.a, password, true)
      expect(account.user.has_password).toBe(true)
      expect(account.user.email_verified_at).toBeNull()
      const failure = page.getByRole('dialog', { name: 'We could not save your plan' })
      await expect(failure).toBeVisible()
      expect(await guestIds(page)).toEqual(ids)
      await page.unroute(approval.api + '/import')

      const retry = waitForPost(page, '/import')
      await failure.getByRole('button', { name: 'Try again' }).click()
      const imported = await retry
      expect(imported.status()).toBe(200)
      const body = imported.request().postDataJSON() as ImportBody
      expect(body.todos).toEqual([expect.objectContaining({ id: ids[0], title: importedTitle })])
      expect(((await imported.json()) as { data: ImportResult }).data.todos).toEqual({
        created: 1,
        skipped: 0,
      })
      await expect.poll(() => guestIds(page)).toEqual([])
      const repeated = await json<{ data: ImportResult }>(
        await stagingApi('POST', '/import', { token: account.token, body }),
        200,
      )
      expect(repeated.data.todos).toEqual({ created: 0, skipped: 1 })
      return account
    })

  await test.step('check invalid mail links and generic password reset acknowledgement', async () => {
    await page.getByRole('button', { name: 'Skip for now' }).click()
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
    await expect(page.getByText(importedTitle, { exact: true })).toBeVisible()
    const badLink = new URLSearchParams({
      id: session.user.id,
      expires: '1',
      signature: '0'.repeat(64),
    })
    const verification = waitForPost(page, '/auth/email/verify')
    await page.goto('/verify-email?' + badLink)
    expect((await verification).status()).toBe(422)
    await expect(
      page.getByText('This confirmation link is not valid or has expired.'),
    ).toBeVisible()
    const me = await json<{ data: User }>(
      await stagingApi('GET', '/me', { token: session.token }),
      200,
    )
    expect(me.data.email_verified_at).toBeNull()
    const matching = await json<{ message: string }>(
      await stagingApi('POST', '/auth/password/forgot', { body: { email: approval.emails.a } }),
      200,
    )
    const unknown = await json<{ message: string }>(
      await stagingApi('POST', '/auth/password/forgot', {
        body: { email: approval.emails.unknown },
      }),
      200,
    )
    expect(matching.message).toEqual(expect.any(String))
    expect(unknown).toEqual(matching)
    const reset = new URLSearchParams({
      email: approval.emails.a,
      token: 'qa022-invalid-reset-token',
    })
    await page.goto('/reset-password?' + reset)
    await enterPassword(page.getByLabel('New password', { exact: true }), otherPassword)
    const rejection = waitForPost(page, '/auth/password/reset')
    await page.getByRole('button', { name: 'Save password', exact: true }).click()
    expect((await rejection).status()).toBe(422)
    await expect(page.getByText('This reset link is not valid or has expired.')).toBeVisible()
  })

  const fresh =
    await test.step('sign out, verify bearer revocation, and sign in again', async () => {
      await page.goto('/profile')
      const logout = waitForPost(page, '/auth/logout')
      await page.getByRole('button', { name: 'Sign out', exact: true }).click()
      expect((await logout).status()).toBe(204)
      await expect(page).toHaveURL(approval.frontend + '/')
      expect(await page.evaluate(() => localStorage.getItem('loomora.session') === null)).toBe(true)
      expect((await stagingApi('GET', '/me', { token: session.token })).status).toBe(401)
      await page.goto('/sign-in')
      const loggedIn = await submitAuth(page, approval.emails.a, password)
      expect(loggedIn.user.id).toBe(session.user.id)
      expect(loggedIn.token !== session.token).toBe(true)
      await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()
      return loggedIn
    })

  await test.step('check to-dos, weekly occurrences and isolation with a second synthetic account', async () => {
    const second = await json<TokenResponse>(
      await stagingApi('POST', '/auth/register', {
        body: { name: 'QA-022 B', email: approval.emails.b, password: otherPassword, timezone },
      }),
      201,
    )
    expect(second.user.email === approval.emails.b && second.user.id !== fresh.user.id).toBe(true)
    const title = approval.runId + ' account'
    const updated = await exerciseAccountWrites(fresh.token, second.token, title)
    await page.reload()
    await expect(page.getByRole('checkbox', { name: `Mark “${updated}” done` })).toBeChecked()
    await page.goto('/week')
    await expect(page.getByRole('heading', { name: 'Week', exact: true })).toBeVisible()
    await expect(page.getByText(title, { exact: true })).toBeVisible()
    expect((await stagingApi('POST', '/auth/logout', { token: second.token })).status).toBe(204)
  })
  expect(stopped).toEqual([])
})

test('deletion callback uses protective headers and rejects an unsolicited callback', async ({
  page,
  context,
}) => {
  await checkStagingPair()
  const stopped = await guardBrowser(context)
  const calls: string[] = []
  page.on('request', (request) => {
    if (request.url().startsWith(approval.api + '/me')) calls.push(request.method())
  })
  const response = await page.goto(callback + '?code=qa022-placeholder&state=qa022-placeholder')
  expect(response?.status()).toBe(200)
  expect(response?.headers()['cache-control']).toBe('no-store')
  expect(response?.headers()['referrer-policy']).toBe('no-referrer')
  await expect(page).toHaveURL(approval.frontend + callback)
  await expect(page.getByText(/Google verification could not be confirmed/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete everything' })).toHaveCount(0)
  expect(calls).toEqual([])
  expect(stopped).toEqual([])
})

test('disabled Google deletion fails closed without contacting Google or deleting', async ({
  page,
  context,
}) => {
  const token = process.env.QA022_GOOGLE_FIXTURE_BEARER
  test.skip(!token, 'Blocked pending an approved disposable Google-only session')
  if (!token) return
  await checkStagingPair()
  const stopped = await guardBrowser(context)
  const { data: user } = await json<{ data: User }>(await stagingApi('GET', '/me', { token }), 200)
  expect(user.email === approval.emails.google && user.has_password === false).toBe(true)
  const session: StoredSession = {
    token,
    user,
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
  }
  await page.addInitScript(
    (value) => localStorage.setItem('loomora.session', JSON.stringify(value)),
    session,
  )
  await page.goto('/profile')
  await page.getByRole('button', { name: 'Delete my account' }).click()
  const challenge = waitForPost(page, '/me/deletion/google/challenge')
  await page.getByRole('button', { name: 'Verify with Google' }).click()
  expect((await challenge).status()).toBe(503)
  await expect(page.getByText('Google verification is currently unavailable.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Delete everything' })).toHaveCount(0)
  await expect(page).toHaveURL(approval.frontend + '/profile')
  expect(stopped).toEqual([])
})
