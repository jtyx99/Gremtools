import type { BgModel, BgProgress } from './engines/backgroundRemoval'
import type { CutoutMethod, CutoutReply, CutoutRequest, CutoutResult } from './worker'

export type { CutoutMethod, CutoutResult }

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (r: CutoutResult) => void; reject: (e: Error) => void; progress?: (p: BgProgress) => void }>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<CutoutReply>) => {
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
 * Cut the subject out of `image`. Resolves with a full-size PNG whose
 * background is transparent, and the method that was used.
 */
export function cutOut(
  image: Blob,
  method: CutoutMethod | 'auto',
  model: BgModel,
  onProgress?: (p: BgProgress) => void,
): Promise<CutoutResult> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve, reject, progress: onProgress })
    getWorker().postMessage({ id, image, method, model, publicPath: MODEL_URL } satisfies CutoutRequest)
  })
}
