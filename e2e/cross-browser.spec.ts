import { expect, test, type Page } from '@playwright/test'

const VIEWPORTS = [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
] as const

const isPhoneWidth = (width: number) => width < 768

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
}

test.describe('QA-021 Cross-browser and offline regression', () => {
  test('1-4 & 8: guest Today/Week navigation, to-do & schedule CRUD, IndexedDB reload persistence, and 320/375/768/1280 responsive sheets', async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    // 1. Landing -> Today
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Loomora' })).toBeVisible()
    await page.getByRole('link', { name: 'Try it now' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()

    // 2. To-do creation, completion, editing, and deletion
    await page.getByRole('button', { name: 'Add a to-do' }).click()
    const addDialog = page.getByRole('dialog', { name: 'Add a to-do' })
    await expect(addDialog).toBeVisible()
    await addDialog.getByLabel('Title').fill('Cross-browser task')
    await addDialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(addDialog).toBeHidden()
    await expect(page.getByText('Cross-browser task')).toBeVisible()

    // Complete to-do (click the visible 44x44 label wrapping the sr-only checkbox)
    await page
      .locator('label')
      .filter({ has: page.getByRole('checkbox', { name: 'Mark “Cross-browser task” done' }) })
      .click()
    await expect(page.getByRole('progressbar', { name: '1 of 1 done' })).toBeVisible()

    // Edit to-do
    await page.getByRole('button', { name: 'Edit “Cross-browser task”' }).click()
    const editDialog = page.getByRole('dialog', { name: 'Edit to-do' })
    await expect(editDialog).toBeVisible()
    await editDialog.getByLabel('Title').fill('Edited cross-browser task')
    await editDialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(editDialog).toBeHidden()
    await expect(page.getByText('Edited cross-browser task')).toBeVisible()

    // Create a second to-do to keep for persistence, then delete the first one
    await page.getByRole('button', { name: 'Add a to-do' }).click()
    const secondDialog = page.getByRole('dialog', { name: 'Add a to-do' })
    await secondDialog.getByLabel('Title').fill('Persisted task')
    await secondDialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(secondDialog).toBeHidden()

    await page.getByRole('button', { name: 'Delete “Edited cross-browser task”' }).click()
    await expect(
      page.getByRole('checkbox', { name: 'Mark “Edited cross-browser task” done' }),
    ).toBeHidden()

    // 3. Navigate to Week & create + edit weekly schedule item
    const width = page.viewportSize()?.width ?? 375
    const nav = page.getByTestId(isPhoneWidth(width) ? 'bottom-nav' : 'sidebar')
    await nav.getByRole('link', { name: 'Week' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Week' })).toBeVisible()

    await page.getByRole('button', { name: 'Add to my schedule' }).click()
    const schedDialog = page.getByRole('dialog', { name: 'Add to my schedule' })
    await schedDialog.getByLabel('Title').fill('Morning block')
    await schedDialog.getByRole('button', { name: 'Monday', exact: true }).click()
    await schedDialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(schedDialog).toBeHidden()

    const strip = page.getByRole('group', { name: 'Days of the week' })
    if (isPhoneWidth(width)) {
      await strip.getByRole('button', { name: 'Monday', exact: true }).click()
    }
    const mondayRegion = page.getByRole('region', { name: 'Monday', exact: true })
    await expect(mondayRegion.getByText('Morning block')).toBeVisible()

    // Edit schedule item
    await mondayRegion.getByRole('button', { name: /Edit Morning block/ }).click()
    const editSchedDialog = page.getByRole('dialog', { name: 'Edit schedule item' })
    await editSchedDialog.getByLabel('Title').fill('Updated morning block')
    await editSchedDialog.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(editSchedDialog).toBeHidden()
    await expect(mondayRegion.getByText('Updated morning block')).toBeVisible()

    // 4. Reload & verify IndexedDB persistence
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Week' })).toBeVisible()
    if (isPhoneWidth(width)) {
      await strip.getByRole('button', { name: 'Monday', exact: true }).click()
    }
    await expect(
      page.getByRole('region', { name: 'Monday', exact: true }).getByText('Updated morning block'),
    ).toBeVisible()

    // 8. Responsive overflow checks across 320, 375, 768, 1280 px including mobile sheets
    for (const vp of VIEWPORTS) {
      await page.setViewportSize(vp)
      await expectNoHorizontalOverflow(page)
    }

    // Check CopyDaySheet and AddTodoSheet at 320 px
    await page.setViewportSize({ width: 320, height: 640 })
    await strip.getByRole('button', { name: 'Monday', exact: true }).click()
    await page
      .getByRole('region', { name: 'Monday', exact: true })
      .getByRole('button', { name: 'Copy Monday to…' })
      .click()
    const copyDialog = page.getByRole('dialog', { name: 'Copy Monday to…' })
    await expect(copyDialog).toBeVisible()
    const copyOverflow = await copyDialog.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(copyOverflow).toBeLessThanOrEqual(0)
    await page.keyboard.press('Escape')
    await expect(copyDialog).toBeHidden()

    await page.getByTestId('bottom-nav').getByRole('link', { name: 'Today' }).click()
    await expect(page.getByText('Persisted task')).toBeVisible()
    await expectNoHorizontalOverflow(page)

    expect(errors).toEqual([])
  })

  test('5: offline navigation, offline persistence, and reconnect without duplicates', async ({
    page,
    context,
    browserName,
  }) => {
    await page.goto('/today')
    await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()

    // Wait for SW controller so offline route navigation is cached
    const swReady = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false
      await navigator.serviceWorker.ready
      if (!navigator.serviceWorker.controller) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 4000)
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => {
              clearTimeout(timer)
              resolve()
            },
            { once: true },
          )
        })
      }
      return Boolean(navigator.serviceWorker.controller)
    })
    expect(swReady).toBe(true)

    const width = page.viewportSize()?.width ?? 375
    const nav = page.getByTestId(isPhoneWidth(width) ? 'bottom-nav' : 'sidebar')

    // In Playwright WebKit, context.setOffline(true) aborts network requests before SW interception,
    // so pre-warm /week while online before going offline on WebKit.
    if (browserName === 'webkit') {
      await nav.getByRole('link', { name: 'Week' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Week' })).toBeVisible()
      await nav.getByRole('link', { name: 'Today' }).click()
      await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    }

    await context.setOffline(true)
    // Playwright WebKit aborts page.reload() at the network process before SW interception;
    // Chromium and Firefox support full offline reloads under SW.
    if (browserName !== 'webkit') {
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()
    }
    if (await page.evaluate(() => navigator.onLine)) {
      await page.evaluate(() => {
        Object.defineProperty(Navigator.prototype, 'onLine', {
          configurable: true,
          get: () => false,
        })
        window.dispatchEvent(new Event('offline'))
      })
    }
    await expect(
      page.getByText('You are offline. Your plan still works and saves on this device.'),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Add a to-do' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add a to-do' })
    await dialog.getByLabel('Title').fill('Offline cross-browser todo')
    await dialog.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(dialog).toBeHidden()
    await expect(page.getByText('Offline cross-browser todo')).toBeVisible()

    await nav.getByRole('link', { name: 'Week' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Week' })).toBeVisible()

    if (browserName !== 'webkit') {
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Week' })).toBeVisible()
    }

    await context.setOffline(false)
    if (await page.evaluate(() => !navigator.onLine)) {
      await page.evaluate(() => {
        Object.defineProperty(Navigator.prototype, 'onLine', {
          configurable: true,
          get: () => true,
        })
      })
    }
    if (browserName !== 'chromium') {
      await page.evaluate(() => window.dispatchEvent(new Event('online')))
    }
    await expect(
      page.getByText('You are offline. Your plan still works and saves on this device.'),
    ).toBeHidden()

    await nav.getByRole('link', { name: 'Today' }).click()
    await expect(page.getByText('Offline cross-browser todo')).toHaveCount(1)
  })

  test('6: cross-tab session synchronization preserves guest Dexie data', async ({ browser }) => {
    const context = await browser.newContext({ serviceWorkers: 'block' })
    const corsHeaders = {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'access-control-allow-headers': 'Authorization,Content-Type,Accept',
    }
    try {
      await context.route('**/api/v1/**', async (route) => {
        if (route.request().method() === 'OPTIONS') {
          await route.fulfill({ status: 204, headers: corsHeaders })
          return
        }
        const url = new URL(route.request().url())
        const method = route.request().method()
        const user = {
          id: 'user-xb',
          name: 'Cross Browser User',
          email: 'xb@example.test',
          has_password: true,
          email_verified_at: '2026-10-24T03:00:00Z',
          timezone: 'UTC',
          time_format: '24h',
          week_starts_on: 1,
          goal: null,
          heard_from: null,
          survey_done: true,
          current_streak: 0,
          longest_streak: 0,
          created_at: '2026-10-24T03:00:00Z',
        }
        if (url.pathname.endsWith('/auth/login') && method === 'POST') {
          await route.fulfill({
            status: 200,
            headers: corsHeaders,
            json: { token: '1|cross-browser-token', expires_at: '2099-01-01T00:00:00Z', user },
          })
          return
        }
        if (url.pathname.endsWith('/auth/logout') && method === 'POST') {
          await route.fulfill({ status: 204, headers: corsHeaders })
          return
        }
        if (url.pathname.endsWith('/todos')) {
          await route.fulfill({
            status: 200,
            headers: corsHeaders,
            json: {
              data: [
                {
                  id: 'xb-todo-1',
                  title: 'Synced server todo',
                  category: 'work',
                  priority: 'normal',
                  notes: null,
                  parent_id: null,
                  repeat_rule: null,
                  next_todo_id: null,
                  remind_at: null,
                  subtasks: [],
                  due_date: null,
                  done_at: null,
                  overdue: false,
                  old: false,
                  created_at: '2026-11-20T01:00:00Z',
                },
              ],
            },
          })
          return
        }
        if (url.pathname.endsWith('/me')) {
          await route.fulfill({ status: 200, headers: corsHeaders, json: { data: user } })
          return
        }
        if (url.pathname.endsWith('/streak')) {
          await route.fulfill({
            status: 200,
            headers: corsHeaders,
            json: { data: { current_streak: 0, longest_streak: 0, today_counted: false } },
          })
          return
        }
        await route.fulfill({ status: 200, headers: corsHeaders, json: { data: [] } })
      })

      const tabA = await context.newPage()
      const tabB = await context.newPage()

      await tabA.goto('/today')
      await tabA.getByRole('button', { name: 'Add a to-do' }).click()
      const dialog = tabA.getByRole('dialog', { name: 'Add a to-do' })
      await dialog.getByLabel('Title').fill('Guest item before sync')
      await dialog.getByRole('button', { name: 'Add', exact: true }).click()
      await expect(tabA.getByText('Guest item before sync')).toBeVisible()

      await tabB.goto('/today')
      await expect(tabB.getByText('Guest item before sync')).toBeVisible()

      // Sign in on Tab A through the real UI
      await tabA.goto('/sign-in')
      await tabA.getByLabel('Email').fill('xb@example.test')
      await tabA.getByLabel('Password').fill('correct-password-123')
      await tabA.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(tabA.getByRole('heading', { level: 1, name: 'Today' })).toBeVisible()

      // Tab B syncs the signed-in session
      await expect(tabB.getByText('Synced server todo')).toBeVisible()

      // Sign out on Tab B and verify Tab A returns to guest mode with Dexie data preserved
      await tabB.goto('/profile')
      await tabB.getByRole('button', { name: 'Sign out' }).click()
      await expect(tabB.getByRole('link', { name: 'Sign in' })).toBeVisible()
      await tabA.goto('/today')
      await expect(tabA.getByText('Guest item before sync')).toBeVisible()

      await tabA.close()
      await tabB.close()
    } finally {
      await context.close()
    }
  })

  test('7 & 9: keyboard focus trap/restoration and prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/today')

    const transitionDuration = await page.evaluate(() =>
      getComputedStyle(document.body).getPropertyValue('transition-duration'),
    )
    expect(['0.01ms', '0s', '1e-05s', '0.00001s']).toContain(transitionDuration.trim())

    const addBtn = page.getByRole('button', { name: 'Add a to-do' })
    await addBtn.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Add a to-do' })
    await expect(dialog).toBeVisible()

    await dialog.getByLabel('Title').focus()
    await page.keyboard.press('Shift+Tab')
    const stayedInDialog = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    )
    expect(stayedInDialog).toBe(true)

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    const focusedAdd = await addBtn.evaluate((el) => document.activeElement === el)
    expect(focusedAdd).toBe(true)
  })

  test('10, 11 & 12: direct SPA navigation, 404, missing asset, manifest, and SW registration', async ({
    page,
    request,
  }) => {
    await page.goto('/week')
    await expect(page.getByRole('heading', { level: 1, name: 'Week' })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Week' })).toBeVisible()

    await page.goto('/does-not-exist')
    await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to Today' })).toHaveAttribute('href', '/today')

    const manifestRes = await request.get('/manifest.webmanifest')
    expect(manifestRes.status()).toBe(200)
    const manifest = (await manifestRes.json()) as {
      name: string
      start_url: string
      icons: { src: string; sizes: string; purpose?: string }[]
    }
    expect(manifest.name).toBe('Loomora')
    expect(manifest.start_url).toBe('/today')
    for (const icon of manifest.icons) {
      const iconRes = await request.get(`/${icon.src.replace(/^\//, '')}`)
      expect(iconRes.status()).toBe(200)
      expect(iconRes.headers()['content-type']).toContain('image/png')
    }

    const swRes = await request.get('/sw.js')
    expect(swRes.status()).toBe(200)
    const swText = await swRes.text()
    expect(swText).toContain('NavigationRoute')
    expect(swText).toContain('denylist')
  })
})
