import type { PdfOps } from './worker'

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void; progress?: (p: number) => void }>()

function getWorker(): Worker {
  if (worker) return worker
  worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: { name: string; message: string }; progress?: number }>) => {
    const job = pending.get(e.data.id)
    if (!job) return
    if (e.data.progress !== undefined) return job.progress?.(e.data.progress)
    pending.delete(e.data.id)
    if (e.data.error) {
      const err = new Error(e.data.error.message)
      err.name = e.data.error.name
      job.reject(err)
    } else job.resolve(e.data.result)
  }
  worker.onerror = (e) => {
    // The worker died (for example, out of memory). Fail every waiting job and start fresh next time.
    for (const job of pending.values()) job.reject(new Error(e.message || 'Worker crashed'))
    pending.clear()
    worker?.terminate()
    worker = null
  }
  return worker
}

/** Run a PDF operation in the worker. Rejects with an Error named 'PdfToolError' for user-facing problems. */
export function runPdf<K extends keyof PdfOps>(
  op: K,
  args: Parameters<PdfOps[K]>[0],
  onProgress?: (fraction: number) => void,
): Promise<Awaited<ReturnType<PdfOps[K]>>> {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve: resolve as (v: unknown) => void, reject, progress: onProgress })
    getWorker().postMessage({ id, op, args })
  })
}
