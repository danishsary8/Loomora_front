// Renders the PWA icons from public/icon.svg and scripts/icon-maskable.svg.
// Run with `npm run icons` after changing either SVG.
import { readFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const ICONS = [
  { source: '../public/icon.svg', file: 'icon-192.png', size: 192 },
  { source: '../public/icon.svg', file: 'icon-512.png', size: 512 },
  { source: 'icon-maskable.svg', file: 'icon-maskable-512.png', size: 512 },
  { source: 'icon-maskable.svg', file: 'apple-touch-icon.png', size: 180 },
]

const browser = await chromium.launch()
try {
  for (const { source, file, size } of ICONS) {
    const svg = await readFile(new URL(source, import.meta.url), 'utf8')
    const page = await browser.newPage({ viewport: { width: size, height: size } })
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`,
    )
    await page.screenshot({
      path: new URL(`../public/${file}`, import.meta.url).pathname,
      omitBackground: true,
    })
    await page.close()
  }
} finally {
  await browser.close()
}
