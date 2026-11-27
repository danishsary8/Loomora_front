// Captures screens from the dev server with the seeded demo data.
// Usage: node portfolio/tools/shoot.mjs <outDir> <phone,laptop> <name=path[|action]...>...
// Date is fixed (Fri 27 Nov 2026 10:40, Phnom Penh); timers and animations still run.
// Actions: top scrolls back up, btn:<name> clicks a button (btn:~regex matches), scroll:<px> scrolls, wait:<ms> moves the fixed time forward.
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
    reducedMotion: 'reduce',
    timezoneId: 'Asia/Phnom_Penh',
    locale: 'en-GB',
  })
  const page = await context.newPage()
  const START = Date.parse('2026-11-27T03:40:00Z')
  await page.clock.setFixedTime(START)
  await page.goto(BASE + '/today')
  await page.evaluate(`(${seedSrc})()`)
  for (const shot of shots) {
    const [name, rest] = shot.split('=')
    const [path, ...actions] = rest.split('|')
    await page.goto(BASE + path)
    await page.waitForLoadState('networkidle')
    await page.clock.setFixedTime(START)
    await page.waitForTimeout(1500)
    for (const step of actions) {
      const [kind, arg] = step.split(/:(.*)/s)
      if (kind === 'btn') {
        const name = arg.startsWith('~') ? new RegExp(arg.slice(1)) : arg
        await page.getByRole('button', { name, exact: true }).first().click()
      }
      if (kind === 'scroll') await page.mouse.wheel(0, Number(arg))
      if (kind === 'wait') await page.clock.setFixedTime(START + Number(arg))
      if (kind === 'top') await page.evaluate(() => window.scrollTo(0, 0))
      await page.waitForTimeout(1500)
    }
    await page.screenshot({ path: `${outDir}/${prefix}${name}.png` })
  }
  await context.close()
}
await browser.close()
