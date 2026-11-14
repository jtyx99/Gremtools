import { PDFDocument } from 'pdf-lib'
import { loadPdf, PdfToolError } from './common'

export async function mergePdfs(files: Uint8Array[]): Promise<Uint8Array> {
  if (files.length < 1) throw new PdfToolError('Add at least one PDF.')
  const out = await PDFDocument.create()
  for (const bytes of files) {
    const src = await loadPdf(bytes)
    const pages = await out.copyPages(src, src.getPageIndices())
    pages.forEach((p) => out.addPage(p))
  }
  return out.save()
}
