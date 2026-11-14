import { PDFDocument, StandardFonts, degrees } from 'pdf-lib'
import * as mupdf from 'mupdf'

/** A PDF whose page i (1-based) contains the text "Page i". */
export async function makePdf(pages: number, rotate = 0): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  for (let i = 1; i <= pages; i++) {
    const page = doc.addPage([400, 600])
    page.drawText(`Page ${i}`, { x: 50, y: 500, size: 24, font })
    if (rotate) page.setRotation(degrees(rotate))
  }
  return doc.save()
}

/** A photo-like PNG: smooth gradients plus a little noise. */
export function makePng(w: number, h: number): Uint8Array {
  const pix = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, w, h], false)
  const px = pix.getPixels()
  let seed = 7
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const n = (seed >> 16) % 24
      const i = (y * w + x) * 3
      px[i] = ((x * 255) / w + n) & 255
      px[i + 1] = ((y * 255) / h + n) & 255
      px[i + 2] = (128 + 100 * Math.sin((x + y) / 60) + n) & 255
    }
  }
  return pix.asPNG().slice()
}

export async function makeImagePdf(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const img = await doc.embedPng(makePng(2400, 1800))
  const page = doc.addPage([600, 450])
  page.drawImage(img, { x: 0, y: 0, width: 600, height: 450 })
  return doc.save()
}

export function pageTexts(bytes: Uint8Array): string[] {
  const doc = mupdf.Document.openDocument(bytes, 'application/pdf')
  const out: string[] = []
  for (let i = 0; i < doc.countPages(); i++) {
    out.push(doc.loadPage(i).toStructuredText('').asText().trim())
  }
  return out
}
