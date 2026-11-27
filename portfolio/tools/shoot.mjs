// Captures screens from the dev server with the seeded demo data.
// Usage: node portfolio/tools/shoot.mjs <outDir> <name=path[|action]>...
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const BASE = process.env.BASE ?? 'http://localhost:5173'
const [outDir, sizes = 'phone,laptop', ...shots] = process.argv.slice(2)
mkdirSync(outDir, { recursive: true })
const seedSrc = (
  await import(pathToFileURL(resolve('portfolio/tools/seed.mjs')))
).seedGuestDemo.toString()
const VIEWPORTS = {
  laptop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, prefix: '' },
  phone: {
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1.2,
    prefix: 'm-',
    hasTouch: true,
    isMobile: true,
  },
}
const browser = await chromium.launch()
for (const size of sizes.split(',')) {
  const { prefix, ...opts } = VIEWPORTS[size]
  const context = await browser.newContext({
    ...opts,
    timezoneId: 'Asia/Phnom_Penh',
    locale: 'en-GB',
  })
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2026-11-27T03:40:00Z') })
  await page.goto(BASE + '/today')
  await page.evaluate(`(${seedSrc})()`)
  for (const shot of shots) {
    const [name, rest] = shot.split('=')
    const [path, action] = rest.split('|')
    await page.goto(BASE + path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(900)
    if (action) {
      await page
        .getByRole('button', { name: new RegExp(action, 'i') })
        .first()
        .click()
      await page.waitForTimeout(900)
    }
    await page.screenshot({ path: `${outDir}/${prefix}${name}.png` })
  }
  await context.close()
}
await browser.close()
