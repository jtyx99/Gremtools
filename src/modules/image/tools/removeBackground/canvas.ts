/** Canvas drawing shared by the editor preview, downloads and batch export. */
import type { CutoutMethod } from '../../client'
import { blurRadius, coverRect, fitWithin, type BackgroundKind } from '../../lib/compose'

export interface BgSettings {
  kind: BackgroundKind
  colour: string
  /** The replacement background picture, kept as a file so batch items stay small in memory. */
  image: Blob | null
}

/** One picture in the tool: its source file and, once processed, its cut-out. */
export interface Item {
  id: string
  file: File
  /** Full-size PNG with a transparent background. Null if processing failed. */
  cutout: Blob | null
  width: number
  height: number
  method?: CutoutMethod
  bg: BgSettings
  /** Object URL of a small preview for the batch grid. */
  thumbUrl: string | null
  error?: string
}

export const DEFAULT_BG: BgSettings = { kind: 'transparent', colour: '#ffffff', image: null }

/** Paint the chosen background, then the cut-out on top. */
export function paintResult(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  original: CanvasImageSource,
  cutout: CanvasImageSource,
  bg: BgSettings,
  bgImage: ImageBitmap | null,
) {
  ctx.globalCompositeOperation = 'source-over'
  ctx.clearRect(0, 0, w, h)
  if (bg.kind === 'colour') {
    ctx.fillStyle = bg.colour
    ctx.fillRect(0, 0, w, h)
  } else if (bg.kind === 'blur') {
    const r = blurRadius(w, h)
    ctx.filter = `blur(${r}px)`
    // Drawn slightly oversized so the blur does not fade out at the edges.
    ctx.drawImage(original, -2 * r, -2 * r, w + 4 * r, h + 4 * r)
    ctx.filter = 'none'
  } else if (bg.kind === 'image' && bgImage) {
    const { sx, sy, sw, sh } = coverRect(bgImage.width, bgImage.height, w, h)
    ctx.drawImage(bgImage, sx, sy, sw, sh, 0, 0, w, h)
  }
  ctx.drawImage(cutout, 0, 0, w, h)
}

export function isFilled(bg: BgSettings): boolean {
  return bg.kind === 'colour' || bg.kind === 'blur' || (bg.kind === 'image' && !!bg.image)
}

export function canvasBlob(canvas: HTMLCanvasElement, ext: 'png' | 'jpg'): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), ext === 'png' ? 'image/png' : 'image/jpeg', 0.92),
  )
}

export function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

/** Small preview of the finished picture for the batch grid. */
export async function makeThumb(original: CanvasImageSource, cutout: CanvasImageSource, w: number, h: number, bg: BgSettings, bgImage: ImageBitmap | null): Promise<string> {
  const size = fitWithin(w, h, 360)
  const canvas = makeCanvas(size.width, size.height)
  paintResult(canvas.getContext('2d')!, size.width, size.height, original, cutout, bg, bgImage)
  return URL.createObjectURL(await canvasBlob(canvas, 'png'))
}

/** The finished picture for one item, at full size. Decodes what it needs and releases it again. */
export async function renderItem(item: Item, ext: 'png' | 'jpg'): Promise<Blob> {
  if (!item.cutout) throw new Error('Item has no cut-out')
  if (!isFilled(item.bg) && ext === 'png') return item.cutout
  const [original, cutout, bgImage] = await Promise.all([
    createImageBitmap(item.file),
    createImageBitmap(item.cutout),
    item.bg.kind === 'image' && item.bg.image ? createImageBitmap(item.bg.image) : null,
  ])
  const canvas = makeCanvas(item.width, item.height)
  paintResult(canvas.getContext('2d')!, item.width, item.height, original, cutout, item.bg, bgImage)
  original.close()
  cutout.close()
  bgImage?.close()
  return canvasBlob(canvas, ext)
}
