/** Pure helpers for the background editor. No DOM access, so they run in unit tests. */

export type BackgroundKind = 'transparent' | 'colour' | 'blur' | 'image'

/** Longest side, in pixels, of the copy sent to the model. The model works at 1024 anyway. */
export const MODEL_MAX_SIDE = 1024

/** Scale (w, h) down so the longest side is at most `max`. Never scales up. */
export function fitWithin(w: number, h: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(w, h))
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) }
}

/** Largest canvas area that works on every current browser (iOS Safari's limit). */
export const MAX_OUTPUT_PIXELS = 16_000_000

/** Scale (w, h) down so the area is at most `maxPixels`. Never scales up. */
export function fitArea(w: number, h: number, maxPixels: number): { width: number; height: number } {
  const scale = Math.min(1, Math.sqrt(maxPixels / (w * h)))
  return { width: Math.max(1, Math.floor(w * scale)), height: Math.max(1, Math.floor(h * scale)) }
}

/**
 * Source rectangle to draw so an image of (srcW, srcH) fills (dstW, dstH)
 * completely, cropped evenly on the overflowing sides ("cover" fit).
 */
export function coverRect(srcW: number, srcH: number, dstW: number, dstH: number) {
  const scale = Math.max(dstW / srcW, dstH / srcH)
  const sw = dstW / scale
  const sh = dstH / scale
  return { sx: (srcW - sw) / 2, sy: (srcH - sh) / 2, sw, sh }
}

/** Blur strength that looks the same whatever the image size. */
export function blurRadius(w: number, h: number): number {
  return Math.max(2, Math.round(Math.max(w, h) / 50))
}

/** "holiday.jpeg" -> "holiday-no-background.png". */
export function outputName(original: string, ext: 'png' | 'jpg'): string {
  const base = original.replace(/\.[^.]+$/, '') || 'image'
  return `${base}-no-background.${ext}`
}

/** Make names unique for a zip: a second "a.png" becomes "a-2.png". */
export function uniqueNames(names: string[]): string[] {
  const used = new Map<string, number>()
  return names.map((name) => {
    const n = (used.get(name) ?? 0) + 1
    used.set(name, n)
    return n === 1 ? name : name.replace(/(\.[^.]+)?$/, `-${n}$1`)
  })
}

/** Brush width in picture pixels for a 1-100 slider value: 0.5% to 25% of the longest side. */
export function brushWidth(slider: number, w: number, h: number): number {
  return Math.max(2, Math.round((Math.max(w, h) * (0.5 + (slider - 1) * 0.2475)) / 100))
}
