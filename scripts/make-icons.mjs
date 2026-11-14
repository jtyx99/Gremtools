// Renders public/favicon.svg to the PNG app icons. Run: node scripts/make-icons.mjs
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'

const svg = readFileSync('public/favicon.svg', 'utf8')
const browser = await chromium.launch()
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } })
  await page.setContent(`<style>body{margin:0;background:#15171c}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`)
  await page.screenshot({ path: `public/icon-${size}.png` })
  await page.close()
}
await browser.close()
