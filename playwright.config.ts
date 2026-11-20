import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

const webServerEnv = Object.fromEntries(
  Object.entries({
    ...process.env,
    VITE_API_URL: process.env.VITE_API_URL ?? 'https://loomora-api.onrender.com/api/v1',
  }).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
)

export default defineConfig({
  testDir: './e2e',
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
  ],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    env: webServerEnv,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
