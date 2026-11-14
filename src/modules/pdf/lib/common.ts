import { PDFDocument, PDFPage, degrees, rgb } from 'pdf-lib'

import { PdfToolError } from './errors'

export { PdfToolError }

export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (/encrypt/i.test(msg)) {
      throw new PdfToolError('This PDF is password-protected. Remove the password first, then try again.')
    }
    throw new PdfToolError('This file could not be read as a PDF. It may be damaged or not a PDF at all.')
  }
}

export function hexToRgb(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const n = m ? parseInt(m[1], 16) : 0
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

/**
 * Pages can carry a /Rotate flag, so "top left as the reader sees it" is not
 * "top left in page coordinates". This returns the size the reader sees, a
 * function that maps a visual point (origin bottom-left, as displayed) to page
 * coordinates, and the angle to add so content appears upright.
 */
export function visualFrame(page: PDFPage) {
  const { width: w, height: h } = page.getSize()
  const r = ((page.getRotation().angle % 360) + 360) % 360
  const swap = r === 90 || r === 270
  const toPage = (vx: number, vy: number): [number, number] => {
    if (r === 90) return [w - vy, vx]
    if (r === 180) return [w - vx, h - vy]
    if (r === 270) return [vy, h - vx]
    return [vx, vy]
  }
  return { width: swap ? h : w, height: swap ? w : h, toPage, angle: r }
}

/**
 * Origin (bottom-left corner before rotation) for a box of boxW x boxH that
 * should be rotated by `deg` around its own centre and centred on (cx, cy).
 */
export function rotatedOrigin(cx: number, cy: number, boxW: number, boxH: number, deg: number): [number, number] {
  const t = (deg * Math.PI) / 180
  const dx = boxW / 2
  const dy = boxH / 2
  return [cx - (dx * Math.cos(t) - dy * Math.sin(t)), cy - (dx * Math.sin(t) + dy * Math.cos(t))]
}

export { degrees }
