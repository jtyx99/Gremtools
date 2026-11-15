import type { BgModel, BgProgress } from './engines/backgroundRemoval'
import type { BgReply, BgRequest } from './worker'

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (b: Blob) => void; reject: (e: Error) => void; progress?: (p: BgProgress) => void }>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<BgReply>) => {
    const job = pending.get(e.data.id)
    if (!job) return
    if ('progress' in e.data) return job.progress?.(e.data.progress)
    pending.delete(e.data.id)
    if ('error' in e.data) job.reject(new Error(e.data.error))
    else job.resolve(e.data.result)
  }
  worker.onerror = (e) => {
    for (const job of pending.values()) job.reject(new Error(e.message || 'Worker crashed'))
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

/** Folder the model files are served from, as an absolute URL (respects the site's base path). */
const MODEL_URL = new URL(`${import.meta.env.BASE_URL}bg-removal/`, window.location.origin).toString()

/**
 * Returns a cut-out of `image` as a PNG with a transparent background. The
 * result is at most 1024 px on its longest side; use it as a mask for the
 * full-size original (see applyMask in tools/RemoveBackground.tsx).
 */
export function removeBackgroundInWorker(image: Blob, model: BgModel, onProgress?: (p: BgProgress) => void): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject, progress: onProgress })
    getWorker().postMessage({ id, image, model, publicPath: MODEL_URL } satisfies BgRequest)
  })
}
