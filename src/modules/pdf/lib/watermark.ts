import { StandardFonts } from 'pdf-lib'
import { degrees, hexToRgb, loadPdf, PdfToolError, rotatedOrigin, visualFrame } from './common'

export type WatermarkPosition =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right'
  | 'tile'

export interface WatermarkOptions {
  kind: 'text' | 'image'
  text?: string
  fontSize?: number
  color?: string
  image?: { bytes: Uint8Array; type: 'jpg' | 'png' }
  /** Image width as a fraction of the page width (0.05 to 1). */
  imageScale?: number
  /** 0 to 1. */
  opacity: number
  /** Counter-clockwise degrees. */
  rotation: number
  position: WatermarkPosition
}

const MARGIN = 36

export async function watermarkPdf(bytes: Uint8Array, opts: WatermarkOptions): Promise<Uint8Array> {
  const doc = await loadPdf(bytes)
  const opacity = Math.min(1, Math.max(0.02, opts.opacity))

  let font, image
  if (opts.kind === 'text') {
    if (!opts.text?.trim()) throw new PdfToolError('Enter the watermark text.')
    // Standard fonts only cover Latin characters (WinAnsi).
    if (/[^\x20-\x7e\xa0-\xff]/.test(opts.text)) {
      throw new PdfToolError('Text watermarks support Latin characters only for now. Use an image watermark for other scripts.')
    }
    font = await doc.embedFont(StandardFonts.HelveticaBold)
  } else {
    if (!opts.image) throw new PdfToolError('Choose a watermark image.')
    image = opts.image.type === 'jpg' ? await doc.embedJpg(opts.image.bytes) : await doc.embedPng(opts.image.bytes)
  }

  for (const page of doc.getPages()) {
    const frame = visualFrame(page)
    let boxW: number, boxH: number
    const size = opts.fontSize ?? 48
    if (font) {
      boxW = font.widthOfTextAtSize(opts.text!, size)
      boxH = font.heightAtSize(size, { descender: false })
    } else {
      boxW = frame.width * Math.min(1, Math.max(0.05, opts.imageScale ?? 0.4))
      boxH = (boxW * image!.height) / image!.width
    }

    const centres: [number, number][] = []
    if (opts.position === 'tile') {
      const stepX = boxW + 120
      const stepY = boxH + 140
      for (let y = stepY / 2, row = 0; y < frame.height + stepY / 2; y += stepY, row++) {
        for (let x = (row % 2 ? 0 : stepX / 2); x < frame.width + stepX / 2; x += stepX) centres.push([x, y])
      }
    } else {
      const p = opts.position
      const cx = p.includes('left') ? MARGIN + boxW / 2 : p.includes('right') ? frame.width - MARGIN - boxW / 2 : frame.width / 2
      const cy = p.startsWith('top') ? frame.height - MARGIN - boxH / 2 : p.startsWith('bottom') ? MARGIN + boxH / 2 : frame.height / 2
      centres.push([cx, cy])
    }

    const angle = opts.rotation + frame.angle
    for (const [vx, vy] of centres) {
      const [cx, cy] = frame.toPage(vx, vy)
      const [x, y] = rotatedOrigin(cx, cy, boxW, boxH, angle)
      if (font) {
        page.drawText(opts.text!, { x, y, size, font, color: hexToRgb(opts.color ?? '#888888'), opacity, rotate: degrees(angle) })
      } else {
        page.drawImage(image!, { x, y, width: boxW, height: boxH, opacity, rotate: degrees(angle) })
      }
    }
  }
  return doc.save()
}
