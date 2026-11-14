import { PDFDocument } from 'pdf-lib'
import { loadPdf } from './common'

/** One output PDF per group of zero-based page indices. */
export async function splitPdf(bytes: Uint8Array, groups: number[][]): Promise<Uint8Array[]> {
  const src = await loadPdf(bytes)
  const outputs: Uint8Array[] = []
  for (const group of groups) {
    const out = await PDFDocument.create()
    const pages = await out.copyPages(src, group)
    pages.forEach((p) => out.addPage(p))
    outputs.push(await out.save())
  }
  return outputs
}
