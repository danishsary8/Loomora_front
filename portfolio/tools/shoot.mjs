// Captures screens from the dev server with the seeded demo data.
// Usage: node portfolio/tools/shoot.mjs <outDir> <phone,laptop> <name=path[|action]...>...
// Actions: btn:<name> clicks a button, scroll:<px> scrolls, wait:<ms> advances the fixed clock.
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
    const [path, ...actions] = rest.split('|')
    await page.goto(BASE + path)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(900)
    for (const step of actions) {
      const [kind, arg] = step.split(/:(.*)/s)
      if (kind === 'btn') await page.getByRole('button', { name: arg, exact: true }).first().click()
      if (kind === 'scroll') await page.mouse.wheel(0, Number(arg))
      if (kind === 'wait') await page.clock.runFor(Number(arg))
      await page.waitForTimeout(900)
    }
    await page.screenshot({ path: `${outDir}/${prefix}${name}.png` })
  }
  await context.close()
}
await browser.close()
