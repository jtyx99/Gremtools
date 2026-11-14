/**
 * Page previews with PDF.js (Apache-2.0). Used on the main thread for
 * thumbnails only; PDF.js does its parsing in its own worker.
 */
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import type { PDFDocumentProxy } from 'pdfjs-dist'

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type PreviewDoc = PDFDocumentProxy

export async function openPreview(bytes: Uint8Array): Promise<PreviewDoc> {
  try {
    // PDF.js takes ownership of the buffer, so hand it a copy.
    return await pdfjs.getDocument({ data: bytes.slice() }).promise
  } catch (err) {
    const e = new Error(
      err instanceof Error && err.name === 'PasswordException'
        ? 'This PDF is password-protected. Remove the password first, then try again.'
        : 'This file could not be read as a PDF. It may be damaged or not a PDF at all.',
    )
    e.name = 'PdfToolError'
    throw e
  }
}

/** Render a page (1-based) to a canvas about `width` CSS pixels wide. */
export async function renderThumb(doc: PreviewDoc, pageNumber: number, canvas: HTMLCanvasElement, width: number) {
  const page = await doc.getPage(pageNumber)
  const base = page.getViewport({ scale: 1 })
  const scale = (width / base.width) * Math.min(2, window.devicePixelRatio || 1)
  const viewport = page.getViewport({ scale })
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise
  page.cleanup()
}
