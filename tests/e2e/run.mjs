/**
 * End-to-end checks against the production build, in real Chromium.
 * Run `npm run build` first, then `npm run e2e`.
 * For a sub-path build, set the same BASE_PATH for both commands.
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
const ORIGIN = `http://localhost:${PORT}`
// Set BASE_PATH (as for the build) to test a site served under a sub-path, e.g. /Gremtools/.
const BASE = ORIGIN + (process.env.BASE_PATH || '/').replace(/\/+$/, '')
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

/** A photo-like test picture: a red ball with shading on a blue-to-green backdrop. */
function subjectPng() {
  const w = 640, h = 480
  const pix = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, w, h], false)
  const px = pix.getPixels()
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3
      const d = Math.hypot(x - 320, y - 240)
      if (d < 150) {
        const light = 1 - Math.hypot(x - 270, y - 190) / 320
        px[i] = 230 * light + 20; px[i + 1] = 40 * light; px[i + 2] = 30 * light
      } else {
        px[i] = 40; px[i + 1] = 110 + (y * 60) / h; px[i + 2] = 200 - (y * 80) / h
      }
    }
  }
  const path = join(dir, 'ball.png')
  writeFileSync(path, pix.asPNG())
  return path
}
/** Alpha (0-255) of a PNG at the given pixel. */
function alphaAt(png, x, y) {
  const pix = new mupdf.Image(png).toPixmap()
  const n = pix.getNumberOfComponents()
  if (!pix.getAlpha()) return 255
  return pix.getPixels()[(y * pix.getWidth() + x) * n + n - 1]
}
const ball = subjectPng()

console.log('Gremtools end-to-end')

await test('home lists the PDF tools and search filters them', async () => {
  await open('/')
  await assert.doesNotReject(page.getByTestId('tool-card').first().waitFor())
  assert.equal(await page.getByTestId('tool-card').count(), 9)
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

/** A logo-like picture: white ground, blue badge with a large white shape, black block with a small hole. */
function logoPng() {
  const w = 400, h = 200
  const pix = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, w, h], false)
  const px = pix.getPixels()
  const rect = (x0, y0, x1, y1, c) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) px.set(c, (y * w + x) * 3)
  }
  rect(0, 0, w, h, [255, 255, 255])
  rect(20, 20, 160, 180, [107, 184, 215])
  rect(60, 60, 120, 140, [255, 255, 255])
  rect(220, 50, 380, 150, [0, 0, 0])
  rect(290, 95, 300, 105, [255, 255, 255])
  const path = join(dir, 'logo.png')
  writeFileSync(path, pix.asPNG())
  return path
}
const logo = logoPng()

async function startRemoval(files) {
  await open('/image/remove-background')
  await upload(files)
  // The default is the Best model. BG_MODEL=fast uses the smaller one.
  if (process.env.BG_MODEL === 'fast') await page.getByText('Fast', { exact: true }).click()
  await page.getByTestId('run').click()
}
async function savePng() {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-png').click()])
  return new Uint8Array(readFileSync(await dl.path()))
}
/** Drag across the editor canvas between two points given as fractions of its size. */
async function drag(from, to) {
  const box = await page.getByTestId('editor-canvas').boundingBox()
  await page.mouse.move(box.x + box.width * from[0], box.y + box.height * from[1])
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * to[0], box.y + box.height * to[1], { steps: 8 })
  await page.mouse.up()
}
const toolButton = (name) => page.getByRole('toolbar').getByRole('button', { name, exact: true })

async function removeBackground() {
  const started = Date.now()
  await startRemoval(ball)
  await page.getByTestId('download-png').waitFor({ timeout: 240000 })
  const seconds = ((Date.now() - started) / 1000).toFixed(1)
  return { png: await savePng(), seconds }
}

await test('remove background: photo is cut out with the model, cleanly', async () => {
  const { png, seconds } = await removeBackground()
  console.log(`        (first run, including model download: ${seconds}s)`)
  assert.match(await page.getByTestId('result').innerText(), /photo model/)
  assert.equal(alphaAt(png, 5, 5), 0, 'corner should be fully transparent')
  assert.equal(alphaAt(png, 634, 474), 0, 'opposite corner should be fully transparent')
  assert.equal(alphaAt(png, 560, 120), 0, 'no specks left in the background')
  assert.ok(alphaAt(png, 320, 240) > 225, 'subject should be opaque')
  await shot('remove-background')
})

await test('remove background: erase, undo and restore brushes', async () => {
  await toolButton('Erase').click()
  await drag([0.4, 0.5], [0.6, 0.5])
  assert.equal(alphaAt(await savePng(), 320, 240), 0, 'erased stroke should be transparent')
  await page.getByRole('button', { name: 'Undo' }).click()
  assert.ok(alphaAt(await savePng(), 320, 240) > 225, 'undo should bring the subject back')
  // Restore paints the original back, even where the model removed it.
  await toolButton('Restore').click()
  await drag([0.05, 0.1], [0.15, 0.1])
  assert.ok(alphaAt(await savePng(), 64, 48) > 225, 'restored stroke should be opaque')
  await shot('remove-background-restore')
})

await test('remove background: a colour background fills the picture', async () => {
  await toolButton('Background').click()
  await page.getByTestId('result').getByText('Colour', { exact: true }).click()
  await page.getByTestId('download-jpg').waitFor()
  const filled = new mupdf.Image(await savePng()).toPixmap()
  const n = filled.getNumberOfComponents()
  assert.ok(!filled.getAlpha() || filled.getPixels()[n - 1] === 255, 'filled background should be opaque')
  await shot('remove-background-colour')
})

await test('remove background: a logo is handled as a graphic, exactly', async () => {
  const before = requests.length
  await startRemoval(logo)
  await page.getByTestId('download-png').waitFor({ timeout: 60000 })
  assert.match(await page.getByTestId('result').innerText(), /flat-colour graphic/)
  assert.equal(requests.slice(before).filter((r) => r.url.includes('/bg-removal/')).length, 0, 'no model needed for a graphic')
  let png = await savePng()
  assert.equal(alphaAt(png, 2, 2), 0, 'ground removed')
  assert.equal(alphaAt(png, 190, 100), 0, 'ground between shapes removed')
  assert.equal(alphaAt(png, 40, 100), 255, 'badge kept')
  assert.equal(alphaAt(png, 90, 100), 255, 'large white shape inside the badge kept')
  assert.equal(alphaAt(png, 250, 100), 255, 'black block kept')
  assert.equal(alphaAt(png, 295, 100), 0, 'small hole opened')
  await shot('remove-background-logo')
  // Magic eraser: one click removes the whole badge colour, nothing else.
  await toolButton('Magic eraser').click()
  const box = await page.getByTestId('editor-canvas').boundingBox()
  await page.mouse.click(box.x + box.width * 0.1, box.y + box.height * 0.5)
  png = await savePng()
  assert.equal(alphaAt(png, 40, 100), 0, 'clicked colour removed')
  assert.equal(alphaAt(png, 90, 100), 255, 'white shape untouched')
  assert.equal(alphaAt(png, 250, 100), 255, 'black block untouched')
})

await test('remove background: batch gives a zip, and items can be edited', async () => {
  await startRemoval([ball, logo])
  await page.getByTestId('download-all').waitFor({ timeout: 240000 })
  assert.equal(await page.getByTestId('batch-item').count(), 2)
  await shot('remove-background-batch')
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-all').click()])
  const zip = unzipSync(new Uint8Array(readFileSync(await dl.path())))
  assert.deepEqual(Object.keys(zip).sort(), ['ball-no-background.png', 'logo-no-background.png'])
  assert.equal(alphaAt(zip['logo-no-background.png'], 2, 2), 0)
  // Open one, erase part of it, and check the edit is kept in the zip.
  await page.getByTestId('batch-edit').nth(1).click()
  await toolButton('Erase').click()
  await drag([0.6, 0.5], [0.9, 0.5])
  await page.getByTestId('editor-done').click()
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.getByTestId('download-all').click()])
  const zip2 = unzipSync(new Uint8Array(readFileSync(await dl2.path())))
  assert.equal(alphaAt(zip2['logo-no-background.png'], 300, 100), 0, 'edit should be saved')
})

await test('no request leaves the site or carries data', async () => {
  const outside = requests.filter((r) => !r.url.startsWith(ORIGIN) && !r.url.startsWith('blob:') && !r.url.startsWith('data:'))
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
  // The background-removal model was cached by the earlier run.
  const { png, seconds } = await removeBackground()
  console.log(`        (offline run from cache: ${seconds}s)`)
  assert.ok(alphaAt(png, 320, 240) > 225)
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
