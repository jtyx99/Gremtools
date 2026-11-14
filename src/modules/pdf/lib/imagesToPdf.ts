import { PDFDocument } from 'pdf-lib'
import { PdfToolError } from './common'

export interface ImageInput {
  bytes: Uint8Array
  type: 'jpg' | 'png'
}

export interface ImagesToPdfOptions {
  /** 'fit' makes each page the size of its image (plus margin). */
  pageSize: 'fit' | 'a4' | 'letter'
  orientation: 'auto' | 'portrait' | 'landscape'
  /** Margin in points (72 points = 1 inch). */
  margin: number
}

const SIZES = { a4: [595.28, 841.89], letter: [612, 792] } as const

export async function imagesToPdf(images: ImageInput[], opts: ImagesToPdfOptions): Promise<Uint8Array> {
  if (!images.length) throw new PdfToolError('Add at least one image.')
  const out = await PDFDocument.create()
  for (const input of images) {
    let img
    try {
      img = input.type === 'jpg' ? await out.embedJpg(input.bytes) : await out.embedPng(input.bytes)
    } catch {
      throw new PdfToolError('One of the images could not be read. Try re-saving it as PNG or JPG.')
    }
    const m = Math.max(0, opts.margin)
    let pw: number, ph: number
    if (opts.pageSize === 'fit') {
      pw = img.width + m * 2
      ph = img.height + m * 2
    } else {
      const [short, long] = SIZES[opts.pageSize]
      const landscape =
        opts.orientation === 'landscape' || (opts.orientation === 'auto' && img.width > img.height)
      pw = landscape ? long : short
      ph = landscape ? short : long
    }
    const scale = Math.min((pw - m * 2) / img.width, (ph - m * 2) / img.height)
    const w = img.width * scale
    const h = img.height * scale
    const page = out.addPage([pw, ph])
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
  }
  return out.save()
}
