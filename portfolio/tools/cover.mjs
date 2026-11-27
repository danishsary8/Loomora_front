// Renders cover/card and cover/banner from cover/cover.source.html at 2x (3200x2000, 3840x1600).
import { chromium } from 'playwright'
import { resolve } from 'node:path'

const source = resolve('portfolio/cover/cover.source.html')
const browser = await chromium.launch()
for (const [mode, width, height] of [
  ['card', 1600, 1000],
  ['banner', 1920, 800],
]) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 })
  await page.goto(`file://${source}?mode=${mode}`)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  if (!(await page.evaluate(() => document.fonts.check('650 40px Geist')))) {
    throw new Error('Geist did not load')
  }
  await page.screenshot({ path: `portfolio/cover/${mode}.png` })
}
await browser.close()
