/**
 * MuPDF engine (AGPL-3.0). Loads a ~10 MB WASM file, so only import this
 * module dynamically, from the worker, for operations that need it.
 */
import * as mupdf from 'mupdf'
import { PdfToolError } from '../lib/common'

function open(bytes: Uint8Array): mupdf.PDFDocument {
  let doc: mupdf.Document
  try {
    doc = mupdf.Document.openDocument(bytes, 'application/pdf')
  } catch {
    throw new PdfToolError('This file could not be read as a PDF. It may be damaged or not a PDF at all.')
  }
  if (doc.needsPassword()) {
    throw new PdfToolError('This PDF is password-protected. Remove the password first, then try again.')
  }
  return doc as mupdf.PDFDocument
}

export type CompressLevel = 'light' | 'balanced' | 'strong'

/** Longest image side in pixels, and JPEG quality, per level. */
const LEVELS: Record<CompressLevel, { maxSide: number; quality: number }> = {
  light: { maxSide: 2600, quality: 82 },
  balanced: { maxSide: 1700, quality: 68 },
  strong: { maxSide: 1100, quality: 50 },
}

export interface CompressResult {
  bytes: Uint8Array
  imagesRewritten: number
}

/**
 * Two passes:
 * 1. Re-encode large embedded images as (smaller) JPEGs, when that saves space.
 * 2. Rewrite the file: drop unused objects, deduplicate, compress streams.
 * Images with transparency masks keep their mask; 1-bit and mask images are left alone.
 */
export function compressPdf(bytes: Uint8Array, level: CompressLevel): CompressResult {
  const doc = open(bytes)
  const { maxSide, quality } = LEVELS[level]
  let imagesRewritten = 0

  const count = doc.countObjects()
  for (let num = 1; num < count; num++) {
    try {
      // Stream checks and stream I/O must go through the indirect reference.
      const obj = doc.newIndirect(num)
      if (!obj.isStream()) continue
      const subtype = obj.get('Subtype')
      if (!subtype.isName() || subtype.asName() !== 'Image') continue
      const mask = obj.get('ImageMask')
      if (mask.isBoolean() && mask.asBoolean()) continue
      const bpc = obj.get('BitsPerComponent')
      if (bpc.isNumber() && bpc.asNumber() < 8) continue
      const w = obj.get('Width').asNumber()
      const h = obj.get('Height').asNumber()
      if (w * h < 64 * 64) continue

      const before = obj.readRawStream().getLength()
      const image = doc.loadImage(obj)
      let pix = image.toPixmap()
      const cs = pix.getColorSpace()
      const gray = !!cs && cs.isGray()
      if (!gray && !(cs && cs.isRGB())) pix = pix.convertToColorSpace(mupdf.ColorSpace.DeviceRGB, false)
      else if (pix.getAlpha()) pix = pix.convertToColorSpace(gray ? mupdf.ColorSpace.DeviceGray : mupdf.ColorSpace.DeviceRGB, false)

      const scale = Math.min(1, maxSide / Math.max(w, h))
      let nw = w
      let nh = h
      if (scale < 1) {
        nw = Math.max(1, Math.round(w * scale))
        nh = Math.max(1, Math.round(h * scale))
        pix = pix.warp([[0, 0], [w, 0], [w, h], [0, h]], nw, nh)
      }
      const jpeg = pix.asJPEG(quality, false)
      if (jpeg.length >= before * 0.9) continue

      obj.writeRawStream(jpeg)
      obj.put('Filter', doc.newName('DCTDecode'))
      obj.put('ColorSpace', doc.newName(gray ? 'DeviceGray' : 'DeviceRGB'))
      obj.put('BitsPerComponent', 8)
      obj.put('Width', nw)
      obj.put('Height', nh)
      obj.delete('DecodeParms')
      obj.delete('Decode')
      imagesRewritten++
    } catch {
      // An image we cannot decode is left exactly as it was.
    }
  }

  const out = doc.saveToBuffer('garbage=deduplicate,compress=yes,compress-fonts=yes,compress-images=yes,objstms=yes')
  return { bytes: out.asUint8Array().slice(), imagesRewritten }
}

export interface RenderOptions {
  format: 'png' | 'jpg'
  /** Dots per inch. 72 is screen size; 150 is good for sharing; 300 for print. */
  dpi: number
  /** JPEG quality 1-100. */
  quality?: number
}

export function pageCount(bytes: Uint8Array): number {
  return open(bytes).countPages()
}

/** Render one page (zero-based) to an image. */
export function renderPage(bytes: Uint8Array, index: number, opts: RenderOptions): Uint8Array {
  return renderOpen(open(bytes), index, opts)
}

/** Render every page, reporting progress after each. */
export function renderAllPages(
  bytes: Uint8Array,
  opts: RenderOptions,
  onProgress?: (done: number, total: number) => void,
): Uint8Array[] {
  const doc = open(bytes)
  const total = doc.countPages()
  const out: Uint8Array[] = []
  for (let i = 0; i < total; i++) {
    out.push(renderOpen(doc, i, opts))
    onProgress?.(i + 1, total)
  }
  return out
}

function renderOpen(doc: mupdf.PDFDocument, index: number, opts: RenderOptions): Uint8Array {
  const page = doc.loadPage(index)
  const zoom = opts.dpi / 72
  const pix = page.toPixmap(mupdf.Matrix.scale(zoom, zoom), mupdf.ColorSpace.DeviceRGB, false, true)
  const data = opts.format === 'png' ? pix.asPNG() : pix.asJPEG(opts.quality ?? 85, false)
  const copy = data.slice()
  pix.destroy()
  page.destroy()
  return copy
}
