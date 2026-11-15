/**
 * Background removal for logos, illustrations and screenshots: pictures whose
 * background is one flat colour. No model involved: the background colour is
 * read from the border and everything of that colour connected to the border
 * is removed, with proper soft edges.
 *
 * All functions work on RGBA pixel arrays (as in ImageData.data) and have no
 * DOM access, so they run in the worker and in unit tests.
 */

export type Rgb = [number, number, number]

/** Largest per-channel difference between pixel `i` (byte offset) and `ref`. */
function diff(px: Uint8ClampedArray, i: number, ref: Rgb): number {
  return Math.max(Math.abs(px[i] - ref[0]), Math.abs(px[i + 1] - ref[1]), Math.abs(px[i + 2] - ref[2]))
}

export interface BorderInfo {
  colour: Rgb
  /** Share of border pixels (0 to 1) that are close to `colour`. */
  uniformity: number
  /** True when most of the border is already transparent. */
  transparent: boolean
}

/** The typical colour around the edge of the picture, and how consistent it is. */
export function borderColour(px: Uint8ClampedArray, w: number, h: number, tolerance = 16): BorderInfo {
  const idx: number[] = []
  for (let x = 0; x < w; x++) idx.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) idx.push(y * w, y * w + w - 1)
  const opaque = idx.filter((p) => px[p * 4 + 3] > 10)
  if (opaque.length < idx.length * 0.1) return { colour: [0, 0, 0], uniformity: 1, transparent: true }
  const median = (c: number) => {
    const v = opaque.map((p) => px[p * 4 + c]).sort((a, b) => a - b)
    return v[v.length >> 1]
  }
  const colour: Rgb = [median(0), median(1), median(2)]
  const close = opaque.filter((p) => diff(px, p * 4, colour) <= tolerance).length
  return { colour, uniformity: close / idx.length, transparent: false }
}

/**
 * How many distinct colours (at 4 bits per channel) are needed to cover 98% of
 * the picture. Logos and flat graphics need a handful; photos need hundreds.
 */
export function colourSpread(px: Uint8ClampedArray, w: number, h: number): number {
  const bins = new Uint32Array(4096)
  const total = w * h
  for (let i = 0; i < total * 4; i += 4) bins[((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4)]++
  const sorted = Array.from(bins).filter(Boolean).sort((a, b) => b - a)
  let covered = 0
  for (let n = 0; n < sorted.length; n++) {
    covered += sorted[n]
    if (covered >= total * 0.98) return n + 1
  }
  return sorted.length
}

/** Should this picture be handled as a flat-background graphic rather than a photo? */
export function looksLikeGraphic(px: Uint8ClampedArray, w: number, h: number): boolean {
  const border = borderColour(px, w, h)
  if (border.transparent) return true
  return border.uniformity >= 0.97 && colourSpread(px, w, h) <= 48
}

/**
 * Make transparent every pixel that is connected to one of `seeds` (pixel
 * indices) through pixels within `tolerance` of `ref`. Then soften the new
 * edge: anti-aliased edge pixels are a blend of the removed colour and the
 * shape's colour, so each gets the matching partial transparency and has the
 * removed colour taken back out of it (no halo on a new background).
 * Edits `px` in place and returns the number of pixels removed.
 */
export function eraseRegion(px: Uint8ClampedArray, w: number, h: number, seeds: number[], ref: Rgb, tolerance: number): number {
  const total = w * h
  const removed = new Uint8Array(total)
  const stack = new Int32Array(total)
  let top = 0
  const matches = (p: number) => px[p * 4 + 3] > 0 && diff(px, p * 4, ref) <= tolerance
  for (const s of seeds) {
    if (s >= 0 && s < total && !removed[s] && matches(s)) { removed[s] = 1; stack[top++] = s }
  }
  let count = 0
  while (top) {
    const p = stack[--top]
    count++
    const x = p % w
    if (x > 0 && !removed[p - 1] && matches(p - 1)) { removed[p - 1] = 1; stack[top++] = p - 1 }
    if (x < w - 1 && !removed[p + 1] && matches(p + 1)) { removed[p + 1] = 1; stack[top++] = p + 1 }
    if (p >= w && !removed[p - w] && matches(p - w)) { removed[p - w] = 1; stack[top++] = p - w }
    if (p < total - w && !removed[p + w] && matches(p + w)) { removed[p + w] = 1; stack[top++] = p + w }
  }
  if (!count) return 0

  // Edge band: kept pixels within two pixels of a removed one.
  const band: number[] = []
  const inBand = new Uint8Array(total)
  for (let ring = 0; ring < 2; ring++) {
    const found: number[] = []
    for (let p = 0; p < total; p++) {
      if (removed[p] || inBand[p] || px[p * 4 + 3] === 0) continue
      const x = p % w
      const y = (p / w) | 0
      let near = false
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const q = ny * w + nx
          if (removed[q] || (ring === 1 && inBand[q] === 1)) { near = true; break }
        }
      }
      if (near) found.push(p)
    }
    for (const p of found) { inBand[p] = ring + 1; band.push(p) }
  }

  // For each band pixel, find the shape's own colour nearby (the kept pixel
  // least like the removed colour) and work out how much of the pixel is shape.
  const updates: [number, number, number, number, number][] = []
  for (const p of band) {
    const x = p % w
    const y = (p / w) | 0
    let best = -1
    let bestDiff = -1
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
        const q = ny * w + nx
        if (removed[q] || px[q * 4 + 3] === 0) continue
        const d = diff(px, q * 4, ref)
        if (d > bestDiff) { bestDiff = d; best = q }
      }
    }
    if (best < 0) continue
    const i = p * 4
    const f = best * 4
    const fr = px[f] - ref[0], fg = px[f + 1] - ref[1], fb = px[f + 2] - ref[2]
    const len = fr * fr + fg * fg + fb * fb
    if (len < 1) continue
    const a = ((px[i] - ref[0]) * fr + (px[i + 1] - ref[1]) * fg + (px[i + 2] - ref[2]) * fb) / len
    if (a >= 0.96) continue
    if (a <= 0.04) { updates.push([i, 0, 0, 0, 0]); continue }
    const unmix = (c: number, r: number) => Math.max(0, Math.min(255, Math.round((c - (1 - a) * r) / a)))
    updates.push([i, unmix(px[i], ref[0]), unmix(px[i + 1], ref[1]), unmix(px[i + 2], ref[2]), Math.round(px[i + 3] * a)])
  }
  for (let p = 0; p < total; p++) if (removed[p]) px[p * 4 + 3] = 0
  for (const [i, r, g, b, a] of updates) { px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a }
  return count
}

/**
 * Remove a flat background: everything of the border colour that touches the
 * border, plus small enclosed pockets of the same colour (the holes in letters
 * such as A, O and R). Larger enclosed areas are kept, because they are usually
 * part of the design (a white shape inside a coloured badge).
 * Returns false, leaving `px` untouched, if there is nothing to remove.
 */
export function removeFlatBackground(px: Uint8ClampedArray, w: number, h: number, tolerance = 28, pocketShare = 0.01): boolean {
  const border = borderColour(px, w, h)
  if (border.transparent) return false
  const ref = border.colour
  const total = w * h
  const seeds: number[] = []
  for (let x = 0; x < w; x++) seeds.push(x, (h - 1) * w + x)
  for (let y = 1; y < h - 1; y++) seeds.push(y * w, y * w + w - 1)
  if (!eraseRegion(px, w, h, seeds, ref, tolerance)) return false

  // Enclosed pockets of the background colour. A pocket is measured together
  // with the lighter anti-aliased pixels around it, so a sliver that is really
  // the tip of a large shape counts as part of that shape and is kept.
  const seen = new Uint8Array(total)
  const stack = new Int32Array(total)
  const loose = Math.max(tolerance, 110)
  const matches = (p: number) => px[p * 4 + 3] === 255 && diff(px, p * 4, ref) <= tolerance
  const near = (p: number) => px[p * 4 + 3] === 255 && diff(px, p * 4, ref) <= loose
  const pockets: number[] = []
  for (let start = 0; start < total; start++) {
    if (seen[start] || !matches(start)) continue
    let top = 0
    let area = 0
    seen[start] = 1
    stack[top++] = start
    while (top) {
      const p = stack[--top]
      area++
      const x = p % w
      if (x > 0 && !seen[p - 1] && near(p - 1)) { seen[p - 1] = 1; stack[top++] = p - 1 }
      if (x < w - 1 && !seen[p + 1] && near(p + 1)) { seen[p + 1] = 1; stack[top++] = p + 1 }
      if (p >= w && !seen[p - w] && near(p - w)) { seen[p - w] = 1; stack[top++] = p - w }
      if (p < total - w && !seen[p + w] && near(p + w)) { seen[p + w] = 1; stack[top++] = p + w }
    }
    if (area <= total * pocketShare) pockets.push(start)
  }
  for (const seed of pockets) eraseRegion(px, w, h, [seed], ref, tolerance)
  return true
}
