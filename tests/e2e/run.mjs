/**
 * End-to-end checks against the production build, in real Chromium.
 * Run `npm run build` first, then `npm run e2e`.
 * Set SHOTS=<dir> to also save screenshots.
 */
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { unzipSync } from 'fflate'
import * as mupdf from 'mupdf'

const PORT = 4183
const BASE = `http://localhost:${PORT}`
const dir = mkdtempSync(join(tmpdir(), 'gremtools-e2e-'))
const shots = process.env.SHOTS
if (shots) mkdirSync(shots, { recursive: true })

// ---------- sample files ----------
async function textPdf(name, pages) {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 1; i <= pages; i++) doc.addPage([400, 600]).drawText(`${name} page ${i}`, { x: 40, y: 500, size: 22, font })
  const path = join(dir, `${name}.pdf`)
  writeFileSync(path, await doc.save())
  return path
}
function png(name, w, h) {
  const pix = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, w, h], false)
  const px = pix.getPixels()
  let seed = 3
  for (let i = 0; i < w * h; i++) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    const n = (seed >> 16) % 20
    px[i * 3] = (((i % w) * 255) / w + n) & 255
    px[i * 3 + 1] = ((Math.floor(i / w) * 255) / h + n) & 255
    px[i * 3 + 2] = 150 + n
  }
  const path = join(dir, `${name}.png`)
  writeFileSync(path, pix.asPNG())
  return path
}
async function imagePdf() {
  const doc = await PDFDocument.create()
  const img = await doc.embedPng(readFileSync(png('big', 2200, 1600)))
  doc.addPage([550, 400]).drawImage(img, { x: 0, y: 0, width: 550, height: 400 })
  const path = join(dir, 'photo.pdf')
  writeFileSync(path, await doc.save())
  return path
}
function texts(bytes) {
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf')
  return Array.from({ length: doc.countPages() }, (_, i) => doc.loadPage(i).toStructuredText('').asText().trim())
}

// ---------- harness ----------
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' })
await new Promise((resolve, reject) => {
  server.stdout.on('data', (d) => String(d).includes('localhost') && resolve())
  server.on('exit', () => reject(new Error('preview server exited; did you run npm run build?')))
})

process.on('exit', () => server.kill())

const browser = await chromium.launch()
const context = await browser.newContext({ acceptDownloads: true })
const page = await context.newPage()
const requests = []
page.on('request', (r) => requests.push({ url: r.url(), method: r.method(), body: r.postData() }))
page.on('pageerror', (e) => console.error('PAGE ERROR', e.message))

let failed = 0
async function test(name, fn) {
  try {
    await fn()
    console.log(`  ok    ${name}`)
  } catch (e) {
    failed++
    console.log(`  FAIL  ${name}\n        ${String(e.stack ?? e).split('\n').join('\n        ')}`)
  }
}
const open = (path) => page.goto(BASE + path)
const upload = (files, nth = 0) => page.getByTestId('file-input').nth(nth).setInputFiles(files)
async function runAndDownload(button = 'download') {
  await page.getByTestId('run').click()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId(button).click()])
  return new Uint8Array(readFileSync(await dl.path()))
}
const shot = async (name, opts = {}) => {
  if (!shots) return
  await page.waitForTimeout(400) // let transitions finish
  await page.screenshot({ path: join(shots, `${name}.png`), ...opts })
}

const a = await textPdf('alpha', 2)
const b = await textPdf('beta', 3)
const five = await textPdf('five', 5)
const photo = await imagePdf()
const img1 = png('one', 300, 200)
const img2 = png('two', 200, 300)
const notPdf = join(dir, 'fake.pdf')
writeFileSync(notPdf, 'this is not a pdf')

console.log('Gremtools end-to-end')

await test('home lists the PDF tools and search filters them', async () => {
  await open('/')
  await assert.doesNotReject(page.getByTestId('tool-card').first().waitFor())
  assert.equal(await page.getByTestId('tool-card').count(), 8)
  await shot('home')
  await page.getByLabel('Find a tool').fill('combine')
  assert.equal(await page.getByTestId('tool-card').count(), 1)
})

await test('merge keeps file order', async () => {
  await open('/pdf/merge')
  await upload([a, b])
  await shot('merge')
  const out = await runAndDownload()
  assert.deepEqual(texts(out), ['alpha page 1', 'alpha page 2', 'beta page 1', 'beta page 2', 'beta page 3'])
})

await test('split by ranges gives one file per range', async () => {
  await open('/pdf/split')
  await upload(five)
  await page.getByLabel('Pages for each new file').fill('1-2, 4-')
  const zip = unzipSync(await runAndDownload('download-all'))
  assert.deepEqual(Object.keys(zip).sort(), ['five-pages-1-2.pdf', 'five-pages-4-5.pdf'])
  assert.deepEqual(texts(zip['five-pages-4-5.pdf']), ['five page 4', 'five page 5'])
})

await test('split by picking pages', async () => {
  await open('/pdf/split')
  await upload(five)
  await page.getByText('Pick pages').click()
  await page.getByTestId('pick-page').nth(0).click()
  await page.getByTestId('pick-page').nth(4).click()
  assert.deepEqual(texts(await runAndDownload()), ['five page 1', 'five page 5'])
})

await test('organise deletes and rotates pages', async () => {
  await open('/pdf/organise')
  await upload(b)
  await page.getByTestId('page-card').first().waitFor()
  await page.getByLabel('Delete page 2').click()
  await page.getByLabel('Rotate page 1').click()
  await shot('organise')
  const out = await runAndDownload()
  assert.deepEqual(texts(out).length, 2)
  const doc = await PDFDocument.load(out)
  assert.deepEqual(doc.getPages().map((p) => p.getRotation().angle), [90, 0])
})

await test('compress shrinks an image-heavy PDF', async () => {
  await open('/pdf/compress')
  await upload(photo)
  const out = await runAndDownload()
  assert.ok(out.length < readFileSync(photo).length * 0.5, 'should be under half the size')
  assert.match(await page.getByTestId('result-note').innerText(), /smaller/)
  await shot('compress-done')
  assert.equal(texts(out).length, 1)
})

await test('images to PDF makes one page per image', async () => {
  await open('/pdf/images-to-pdf')
  await upload([img1, img2])
  const doc = await PDFDocument.load(await runAndDownload())
  assert.equal(doc.getPageCount(), 2)
})

await test('PDF to images gives one image per page', async () => {
  await open('/pdf/pdf-to-images')
  await upload(b)
  const zip = unzipSync(await runAndDownload('download-all'))
  const names = Object.keys(zip).sort()
  assert.deepEqual(names, ['beta-1.jpg', 'beta-2.jpg', 'beta-3.jpg'])
  assert.deepEqual([...zip[names[0]].slice(0, 2)], [0xff, 0xd8])
})

await test('watermark stamps every page', async () => {
  await open('/pdf/watermark')
  await upload(a)
  await page.getByRole('textbox', { name: 'Text' }).fill('SECRET')
  for (const t of texts(await runAndDownload())) assert.match(t, /SECRET/)
})

await test('page numbers are added', async () => {
  await open('/pdf/page-numbers')
  await upload(b)
  await page.getByLabel('Style').selectOption('Page {n} of {total}')
  const t = texts(await runAndDownload())
  assert.match(t[0], /Page 1 of 3/)
  assert.match(t[2], /Page 3 of 3/)
})

await test('a broken PDF gives a clear message', async () => {
  await open('/pdf/compress')
  await upload(notPdf)
  await page.getByTestId('run').click()
  assert.match(await page.getByTestId('error').innerText(), /could not be read as a PDF/)
  await shot('error')
  await open('/pdf/organise')
  await upload(notPdf)
  assert.match(await page.getByTestId('open-error').innerText(), /could not be read as a PDF/)
})

await test('no request leaves the site or carries data', async () => {
  const outside = requests.filter((r) => !r.url.startsWith(BASE) && !r.url.startsWith('blob:') && !r.url.startsWith('data:'))
  assert.deepEqual(outside, [])
  assert.deepEqual(requests.filter((r) => r.method !== 'GET' || r.body), [])
})

await test('works offline after the first visit', async () => {
  await open('/')
  await page.evaluate(() => navigator.serviceWorker.ready)
  // Wait until the service worker has finished caching every file.
  await page.waitForFunction(async () => {
    const keys = await caches.keys()
    for (const k of keys) {
      const reqs = await (await caches.open(k)).keys()
      if (reqs.some((r) => r.url.endsWith('.wasm'))) return true
    }
    return false
  }, null, { timeout: 60000 })
  await context.setOffline(true)
  await open('/pdf/compress')
  await upload(photo)
  const out = await runAndDownload()
  assert.equal(texts(out).length, 1)
  await context.setOffline(false)
})

if (shots) {
  await test('screenshots', async () => {
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
    await open('/')
    await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
    await shot('home-light', { fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    await shot('home-phone', { fullPage: true })
    await open('/pdf/watermark')
    await upload(a)
    await shot('watermark-phone', { fullPage: true })
  })
}

await browser.close()
server.kill()
console.log(failed ? `\n${failed} failed` : '\nAll passed')
process.exit(failed ? 1 : 0)
