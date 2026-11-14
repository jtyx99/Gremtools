/// <reference lib="webworker" />
/**
 * All PDF processing runs here, off the main thread. Each entry in `ops` is one
 * operation; the page calls it through `runPdf` in client.ts. MuPDF is imported
 * lazily so its large WASM file loads only for the operations that need it.
 */
import { mergePdfs } from './lib/merge'
import { splitPdf } from './lib/split'
import { organisePdf, type PageInstruction } from './lib/organise'
import { imagesToPdf, type ImageInput, type ImagesToPdfOptions } from './lib/imagesToPdf'
import { watermarkPdf, type WatermarkOptions } from './lib/watermark'
import { addPageNumbers, type PageNumberOptions } from './lib/pageNumbers'
import type { CompressLevel, RenderOptions } from './engines/mupdf'

type Progress = (fraction: number) => void

const ops = {
  merge: (a: { files: Uint8Array[] }) => mergePdfs(a.files),
  split: (a: { bytes: Uint8Array; groups: number[][] }) => splitPdf(a.bytes, a.groups),
  organise: (a: { bytes: Uint8Array; pages: PageInstruction[] }) => organisePdf(a.bytes, a.pages),
  imagesToPdf: (a: { images: ImageInput[]; options: ImagesToPdfOptions }) => imagesToPdf(a.images, a.options),
  watermark: (a: { bytes: Uint8Array; options: WatermarkOptions }) => watermarkPdf(a.bytes, a.options),
  pageNumbers: (a: { bytes: Uint8Array; options: PageNumberOptions }) => addPageNumbers(a.bytes, a.options),
  compress: async (a: { bytes: Uint8Array; level: CompressLevel }) =>
    (await import('./engines/mupdf')).compressPdf(a.bytes, a.level),
  pdfToImages: async (a: { bytes: Uint8Array; options: RenderOptions }, progress: Progress) =>
    (await import('./engines/mupdf')).renderAllPages(a.bytes, a.options, (done, total) => progress(done / total)),
}

export type PdfOps = typeof ops

self.onmessage = async (e: MessageEvent<{ id: number; op: keyof PdfOps; args: never }>) => {
  const { id, op, args } = e.data
  try {
    const result = await ops[op](args, (progress) => self.postMessage({ id, progress }))
    self.postMessage({ id, result })
  } catch (err) {
    const error = err instanceof Error ? { name: err.name, message: err.message } : { name: 'Error', message: String(err) }
    self.postMessage({ id, error })
  }
}
