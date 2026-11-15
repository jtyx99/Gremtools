/// <reference lib="webworker" />
/**
 * Image processing off the main thread. One operation so far: background
 * removal. The page calls it through `removeBackgroundInWorker` in client.ts.
 */
import { removeImageBackground, type BgModel, type BgProgress } from './engines/backgroundRemoval'
import { MODEL_MAX_SIDE, fitWithin } from './lib/compose'

export interface BgRequest { id: number; image: Blob; model: BgModel; publicPath: string }
export type BgReply =
  | { id: number; progress: BgProgress }
  | { id: number; result: Blob }
  | { id: number; error: string }

self.onmessage = async (e: MessageEvent<BgRequest>) => {
  const { id, image, model, publicPath } = e.data
  const send = (reply: BgReply) => self.postMessage(reply)
  try {
    // The model works at 1024 px. Shrinking large photos first avoids minutes of
    // slow resizing inside the library; the page applies the result at full size.
    const bitmap = await createImageBitmap(image)
    const { width, height } = fitWithin(bitmap.width, bitmap.height, MODEL_MAX_SIDE)
    const canvas = new OffscreenCanvas(width, height)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const small = await canvas.convertToBlob({ type: 'image/png' })
    const result = await removeImageBackground(small, model, publicPath, (progress) => send({ id, progress }))
    send({ id, result })
  } catch (err) {
    send({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
