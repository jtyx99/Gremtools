import { StandardFonts } from 'pdf-lib'
import { degrees, hexToRgb, loadPdf, rotatedOrigin, visualFrame } from './common'
import { parseRanges } from './ranges'

export interface PageNumberOptions {
  position: 'top-left' | 'top' | 'top-right' | 'bottom-left' | 'bottom' | 'bottom-right'
  /** Uses {n} for the number and {total} for the last number, e.g. "Page {n} of {total}". */
  format: string
  /** Number given to the first numbered page. */
  start: number
  fontSize: number
  /** Distance from the page edge in points. */
  margin: number
  color: string
  /** Pages to number, e.g. "2-" to skip a cover. Empty means all pages. */
  pages?: string
}

export async function addPageNumbers(bytes: Uint8Array, opts: PageNumberOptions): Promise<Uint8Array> {
  const doc = await loadPdf(bytes)
  const all = doc.getPages()
  const indices = opts.pages?.trim()
    ? [...new Set(parseRanges(opts.pages, all.length).flat())].sort((a, b) => a - b)
    : all.map((_, i) => i)
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const total = opts.start + indices.length - 1
  const size = opts.fontSize

  indices.forEach((pageIndex, i) => {
    const page = all[pageIndex]
    const frame = visualFrame(page)
    const label = opts.format.replaceAll('{n}', String(opts.start + i)).replaceAll('{total}', String(total))
    const w = font.widthOfTextAtSize(label, size)
    const h = font.heightAtSize(size, { descender: false })
    const p = opts.position
    const vx = p.includes('left') ? opts.margin + w / 2 : p.includes('right') ? frame.width - opts.margin - w / 2 : frame.width / 2
    const vy = p.startsWith('top') ? frame.height - opts.margin - h / 2 : opts.margin + h / 2
    const [cx, cy] = frame.toPage(vx, vy)
    const [x, y] = rotatedOrigin(cx, cy, w, h, frame.angle)
    page.drawText(label, { x, y, size, font, color: hexToRgb(opts.color), rotate: degrees(frame.angle) })
  })
  return doc.save()
}
