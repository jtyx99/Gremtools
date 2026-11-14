import { PDFDocument, degrees } from 'pdf-lib'
import { loadPdf, PdfToolError } from './common'

export interface PageInstruction {
  /** Zero-based index of the page in the source PDF. */
  index: number
  /** Extra clockwise rotation in degrees (multiple of 90), added to the page's own. */
  rotate: number
}

/** Build a new PDF from the listed pages, in the listed order. Omitted pages are dropped. */
export async function organisePdf(bytes: Uint8Array, pages: PageInstruction[]): Promise<Uint8Array> {
  if (!pages.length) throw new PdfToolError('Keep at least one page.')
  const src = await loadPdf(bytes)
  const out = await PDFDocument.create()
  const copied = await out.copyPages(src, pages.map((p) => p.index))
  copied.forEach((page, i) => {
    const delta = pages[i].rotate
    if (delta) page.setRotation(degrees((((page.getRotation().angle + delta) % 360) + 360) % 360))
    out.addPage(page)
  })
  return out.save()
}
