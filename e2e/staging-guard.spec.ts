import { expect, test } from '@playwright/test'
import { LOCAL_API_ORIGIN } from './local-api'
import { enterPassword } from './staging/password'

test('staging password entry updates the React form and keeps values out of failures', async ({
  page,
}) => {
  const password = 'qa022-sentinel-password'
  const api = `${LOCAL_API_ORIGIN}/api/v1/auth/login`
  let submitted = false
  await page.route(api, async (route) => {
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'content-type',
      'access-control-allow-methods': 'POST',
    }
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers })
      return
    }
    const body = route.request().postDataJSON() as { password: string }
    submitted = body.password === password
    await route.fulfill({
      status: 422,
      headers,
      json: { message: 'Invalid credentials.', errors: { email: ['Invalid credentials.'] } },
    })
  })
  await page.goto('/sign-in')
  const email = page.getByLabel('Email', { exact: true })
  await email.fill('qa022@example.test')
  await expect(enterPassword(email, password)).rejects.toThrow(
    /^QA-022 could not enter a synthetic password$/,
  )
  await enterPassword(page.getByLabel('Password', { exact: true }), password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect.poll(() => submitted).toBe(true)
})
