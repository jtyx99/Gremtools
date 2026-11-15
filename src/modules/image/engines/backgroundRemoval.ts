/**
 * Background removal with @imgly/background-removal (AGPL-3.0), which runs the
 * ISNet model through onnxruntime-web. Import this only from the worker.
 *
 * To swap the model or library later, keep this function's shape: image in,
 * same-size PNG with a transparent background out.
 */
import { removeBackground } from '@imgly/background-removal'

export type BgModel = 'small' | 'medium'

export interface BgProgress {
  stage: 'download' | 'process'
  /** 0 to 1 within the stage. */
  fraction: number
}

export async function removeImageBackground(
  image: Blob,
  model: BgModel,
  /** Absolute URL of the folder holding resources.json and the model chunks. */
  publicPath: string,
  onProgress?: (p: BgProgress) => void,
): Promise<Blob> {
  // The library reports each file separately; add them up into one download figure.
  const files = new Map<string, [number, number]>()
  return removeBackground(image, {
    publicPath,
    model,
    // We are already inside a worker.
    proxyToWorker: false,
    output: { format: 'image/png', quality: 1 },
    progress: (key: string, current: number, total: number) => {
      if (key.startsWith('fetch:')) {
        files.set(key, [current, total])
        let done = 0
        let all = 0
        for (const [c, t] of files.values()) { done += c; all += t }
        onProgress?.({ stage: 'download', fraction: all ? done / all : 0 })
      } else if (key.startsWith('compute:')) {
        onProgress?.({ stage: 'process', fraction: total ? current / total : 0 })
      }
    },
  })
}
