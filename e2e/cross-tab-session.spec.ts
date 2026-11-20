import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

test.use({ reducedMotion: 'reduce', serviceWorkers: 'block' })

const ACCOUNT_A = {
  token: '1|token-a',
  expires_at: '2099-01-01T00:00:00Z',
  user: {
    id: 'user-a',
    name: 'Account A',
    email: 'a@example.test',
    has_password: true,
    email_verified_at: '2026-10-24T03:00:00Z',
    timezone: 'Asia/Phnom_Penh',
    time_format: '24h',
    week_starts_on: 1,
    goal: null,
    heard_from: null,
    survey_done: true,
    current_streak: 5,
    longest_streak: 5,
    created_at: '2026-10-24T03:00:00Z',
  },
}

const ACCOUNT_B = {
  token: '2|token-b',
  expires_at: '2099-01-01T00:00:00Z',
  user: {
    ...ACCOUNT_A.user,
    id: 'user-b',
    name: 'Account B',
    email: 'b@example.test',
    current_streak: 1,
    longest_streak: 1,
  },
}

function makeServerTodo(id: string, title: string) {
  return {
    id,
    title,
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
  }
}

function savedGuestTodoIds(page: Page): Promise<{ id: string; title: string }[]> {
  return page.evaluate(
    () =>
      new Promise<{ id: string; title: string }[]>((resolve, reject) => {
        const open = indexedDB.open('loomora-guest')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const read = db.transaction('todos').objectStore('todos').getAll()
          read.onerror = () => reject(read.error)
          read.onsuccess = () => {
            db.close()
            resolve(read.result as { id: string; title: string }[])
          }
        }
      }),
  )
}

test('cross-tab sign-out clears Tab B UI, ignores pending Account A responses, and preserves guest Dexie data', async ({
  context,
}, info) => {
  const problems: string[] = []
  const tabA = await context.newPage()
  const tabB = await context.newPage()
  for (const page of [tabA, tabB]) {
    page.on('pageerror', (error) => problems.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text())
    })
  }

  let holdSecondAccountATodos = false
  let releaseHeldTodos!: () => void
  const heldTodosReady = new Promise<void>((resolve) => {
    releaseHeldTodos = resolve
  })
  let heldTodosRequested!: () => void
  const waitForHeldTodos = new Promise<void>((resolve) => {
    heldTodosRequested = resolve
  })

  await context.route(/\/api\//, async (route) => {
    const request = route.request()
    const headers = {
      'access-control-allow-origin': '*',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    }
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })

    const path = new URL(request.url()).pathname
    const auth = request.headers()['authorization']

    if (request.method() === 'POST' && path.endsWith('/auth/login')) {
      const body = request.postDataJSON() as { email?: string }
      return route.fulfill({
        headers,
        json: body.email === ACCOUNT_B.user.email ? ACCOUNT_B : ACCOUNT_A,
      })
    }
    if (request.method() === 'POST' && path.endsWith('/auth/logout')) {
      return route.fulfill({ status: 204, headers })
    }
    if (path.endsWith('/todos')) {
      if (auth === `Bearer ${ACCOUNT_A.token}`) {
        if (holdSecondAccountATodos) {
          holdSecondAccountATodos = false
          heldTodosRequested()
          await heldTodosReady
        }
        return route.fulfill({
          headers,
          json: { data: [makeServerTodo('a-todo-1', 'Account A secret todo')] },
        })
      }
      if (auth === `Bearer ${ACCOUNT_B.token}`) {
        return route.fulfill({
          headers,
          json: { data: [makeServerTodo('b-todo-1', 'Account B fresh todo')] },
        })
      }
    }
    if (path.endsWith('/streak')) {
      const count = auth === `Bearer ${ACCOUNT_A.token}` ? 5 : 1
      return route.fulfill({
        headers,
        json: { data: { current_streak: count, longest_streak: count, today_counted: false } },
      })
    }
    if (path.includes('/days/') && path.endsWith('/intention')) {
      const date = path.split('/').at(-2) ?? '2026-11-20'
      const text =
        auth === `Bearer ${ACCOUNT_A.token}`
          ? 'Account A private intention'
          : 'Account B private intention'
      return route.fulfill({ headers, json: { data: { date, text } } })
    }
    return route.fulfill({ headers, json: { data: [] } })
  })

  // 1. Guest creates a local plan in Tab A before signing in.
  await tabA.goto('/today')
  await tabA.getByRole('button', { name: 'Add a to-do' }).click()
  const addSheet = tabA.getByRole('dialog', { name: 'Add a to-do' })
  await addSheet.getByLabel('Title').fill('Guest local plan')
  await addSheet.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(addSheet).toBeHidden()
  await expect(tabA.getByText('Guest local plan')).toBeVisible()
  const guestBefore = await savedGuestTodoIds(tabA)
  expect(guestBefore).toMatchObject([{ id: expect.any(String), title: 'Guest local plan' }])

  // 2. Tab A signs in as Account A; Tab B opens /today and sees Account A's data.
  await tabA.goto('/sign-in')
  await tabA.getByLabel('Email').fill(ACCOUNT_A.user.email)
  await tabA.getByLabel('Password').fill('correct-horse')
  await tabA.getByRole('button', { name: 'Sign in' }).click()
  await expect(tabA.getByText('Account A secret todo')).toBeVisible()

  await tabB.goto('/today')
  await expect(tabB.getByText('Account A secret todo')).toBeVisible()
  await expect(tabB.getByRole('textbox', { name: 'Daily intention' })).toHaveValue(
    'Account A private intention',
  )
  await expect(tabB.getByText('Guest local plan')).toBeHidden()

  // Trigger a pending Account A /todos request in Tab B by navigating to Week and back to Today.
  holdSecondAccountATodos = true
  await tabB.goto('/today')
  await waitForHeldTodos

  // 3. Tab A signs out on Profile -> Tab B clears Account A UI promptly without reload.
  await tabA.goto('/profile')
  await expect(tabA.getByText(ACCOUNT_A.user.email)).toBeVisible()
  await tabA.getByRole('button', { name: 'Sign out' }).click()
  await expect(tabA.getByRole('link', { name: 'Try it now' })).toBeVisible()

  await expect(tabB.getByText('Guest local plan')).toBeVisible()
  await expect(tabB.getByText('Account A secret todo')).toBeHidden()
  await expect(tabB.getByRole('textbox', { name: 'Daily intention' })).toHaveValue('')

  // Release the retired Account A response: Tab B stays guest and does not leak Account A's task.
  releaseHeldTodos()
  await tabB.waitForTimeout(150)
  await expect(tabB.getByText('Account A secret todo')).toBeHidden()
  await expect(tabB.getByText('Guest local plan')).toBeVisible()
  expect(await savedGuestTodoIds(tabB)).toEqual(guestBefore)

  // 4. Account switching between tabs: Tab B opens Profile as guest, Tab A signs in as Account A then switches to Account B.
  await tabB.goto('/profile')
  await expect(tabB.getByText('Data lives on this device only.')).toBeVisible()

  await tabA.goto('/sign-in')
  await tabA.getByLabel('Email').fill(ACCOUNT_A.user.email)
  await tabA.getByLabel('Password').fill('correct-horse')
  await tabA.getByRole('button', { name: 'Sign in' }).click()
  await expect(tabA.getByText('Account A secret todo')).toBeVisible()
  await expect(tabB.getByText(ACCOUNT_A.user.email)).toBeVisible()

  await tabA.goto('/profile')
  await tabA.getByRole('button', { name: 'Sign out' }).click()
  await expect(tabB.getByText('Data lives on this device only.')).toBeVisible()

  await tabA.goto('/sign-in')
  await tabA.getByLabel('Email').fill(ACCOUNT_B.user.email)
  await tabA.getByLabel('Password').fill('correct-horse')
  await tabA.getByRole('button', { name: 'Sign in' }).click()
  await expect(tabA.getByText('Account B fresh todo')).toBeVisible()

  await expect(tabB.getByText(ACCOUNT_B.user.email)).toBeVisible()
  await expect(tabB.getByText(ACCOUNT_A.user.email)).toBeHidden()

  // Verify accessibility and phone width on Tab B after cross-tab transitions.
  const { violations } = await new AxeBuilder({ page: tabB })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  expect(violations).toEqual([])
  if (info.project.name === 'phone-375') {
    expect(await tabB.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  }

  expect(problems).toEqual([])
})
