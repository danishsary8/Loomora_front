import { defineConfig, devices } from '@playwright/test'
import { approval } from './e2e/staging/approval'

if (process.env.DEBUG || process.env.PWDEBUG) {
  throw new Error('QA-022 staging must run without debug logging')
}
process.env.PLAYWRIGHT_NO_COPY_PROMPT = '1'

export default defineConfig({
  testDir: './e2e/staging',
  workers: 1,
  retries: 0,
  maxFailures: 1,
  forbidOnly: true,
  timeout: 90_000,
  reporter: 'list',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: approval.frontend,
    viewport: { width: 375, height: 812 },
    hasTouch: true,
    timezoneId: 'Asia/Phnom_Penh',
    serviceWorkers: 'block',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
})
