/// <reference lib="webworker" />
/**
 * Image processing off the main thread. One operation so far: cutting the
 * subject out of a picture. The page calls it through `cutOut` in client.ts.
 *
 * Two methods:
 *  - 'graphic': flat-colour background removal (lib/flatBackground.ts). Exact,
 *    instant, no model. Right for logos, illustrations, screenshots.
 *  - 'photo': the AI model (engines/backgroundRemoval.ts) plus mask clean-up
 *    (lib/maskCleanup.ts). Right for photos of people, products, animals.
 * 'auto' looks at the picture and picks one.
 */
import { removeImageBackground, type BgModel, type BgProgress } from './engines/backgroundRemoval'
import { MAX_OUTPUT_PIXELS, MODEL_MAX_SIDE, fitArea, fitWithin } from './lib/compose'
import { looksLikeGraphic, removeFlatBackground } from './lib/flatBackground'
import { cleanMask } from './lib/maskCleanup'

export type CutoutMethod = 'graphic' | 'photo'

export interface CutoutRequest { id: number; image: Blob; method: CutoutMethod | 'auto'; model: BgModel; publicPath: string }
export interface CutoutResult { cutout: Blob; width: number; height: number; method: CutoutMethod }
export type CutoutReply =
  | { id: number; progress: BgProgress }
  | { id: number; result: CutoutResult }
  | { id: number; error: string }

function draw(source: CanvasImageSource, width: number, height: number, smooth = true) {
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = smooth
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(source, 0, 0, width, height)
  return { canvas, ctx }
}

async function cutOut(req: CutoutRequest, onProgress: (p: BgProgress) => void): Promise<CutoutResult> {
  const bitmap = await createImageBitmap(req.image)
  const { width, height } = fitArea(bitmap.width, bitmap.height, MAX_OUTPUT_PIXELS)
  const full = draw(bitmap, width, height)

  let method: CutoutMethod
  if (req.method === 'auto') {
    // Judge on a small unsmoothed copy: quick, and scaling does not invent new colours.
    const probe = fitWithin(width, height, 256)
    const small = draw(bitmap, probe.width, probe.height, false)
    method = looksLikeGraphic(small.ctx.getImageData(0, 0, probe.width, probe.height).data, probe.width, probe.height) ? 'graphic' : 'photo'
  } else method = req.method
  bitmap.close()

  if (method === 'graphic') {
    onProgress({ stage: 'process', fraction: 0 })
    const data = full.ctx.getImageData(0, 0, width, height)
    removeFlatBackground(data.data, width, height)
    full.ctx.putImageData(data, 0, 0)
  } else {
    // The model works at 1024 px. Shrinking large photos first avoids minutes of
    // slow resizing inside the library; the mask is applied to the full-size picture below.
    const size = fitWithin(width, height, MODEL_MAX_SIDE)
    const small = draw(full.canvas, size.width, size.height)
    const input = await small.canvas.convertToBlob({ type: 'image/png' })
    const output = await createImageBitmap(await removeImageBackground(input, req.model, req.publicPath, onProgress))

    const mask = draw(output, size.width, size.height, false)
    output.close()
    const data = mask.ctx.getImageData(0, 0, size.width, size.height)
    const alpha = new Uint8Array(size.width * size.height)
    for (let p = 0; p < alpha.length; p++) alpha[p] = data.data[p * 4 + 3]
    cleanMask(alpha, size.width, size.height)
    for (let p = 0; p < alpha.length; p++) data.data[p * 4 + 3] = alpha[p]
    mask.ctx.putImageData(data, 0, 0)

    full.ctx.globalCompositeOperation = 'destination-in'
    full.ctx.drawImage(mask.canvas, 0, 0, width, height)
  }
  return { cutout: await full.canvas.convertToBlob({ type: 'image/png' }), width, height, method }
}

self.onmessage = async (e: MessageEvent<CutoutRequest>) => {
  const { id } = e.data
  const send = (reply: CutoutReply) => self.postMessage(reply)
  try {
    send({ id, result: await cutOut(e.data, (progress) => send({ id, progress })) })
  } catch (err) {
    send({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
