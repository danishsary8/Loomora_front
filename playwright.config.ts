import { defineConfig, devices } from '@playwright/test'
import { LOCAL_API_ORIGIN } from './e2e/local-api'

const PORT = process.env.LOOMORA_E2E_PORT ?? '4173'
if (!/^[1-9]\d{3,4}$/.test(PORT) || Number(PORT) < 1024 || Number(PORT) > 65_535) {
  throw new Error('LOOMORA_E2E_PORT must be a valid unprivileged port')
}

const webServerEnv = Object.fromEntries(
  Object.entries({
    ...process.env,
    VITE_API_URL: `${LOCAL_API_ORIGIN}/api/v1`,
  }).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
)

export default defineConfig({
  testDir: './e2e',
  testIgnore: '**/staging/**',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'phone-375',
      use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 812 }, hasTouch: true },
    },
    {
      name: 'desktop-1280',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'firefox-375',
      use: { ...devices['Desktop Firefox'], viewport: { width: 375, height: 812 }, hasTouch: true },
    },
    {
      name: 'firefox-1280',
      use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'webkit-375',
      use: { ...devices['Desktop Safari'], viewport: { width: 375, height: 812 }, hasTouch: true },
    },
    {
      name: 'webkit-1280',
      use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    env: webServerEnv,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
