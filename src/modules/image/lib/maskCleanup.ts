/**
 * Tidies the transparency mask produced by the AI model (photo method):
 * removes faint haze, drops small stray patches of leftover background, and
 * fills pinholes in the subject. Works in place on one alpha byte per pixel.
 */
export function cleanMask(alpha: Uint8Array, w: number, h: number): void {
  const total = w * h

  // 1. Haze: nearly-transparent becomes transparent, nearly-solid becomes solid.
  const LOW = 28
  const HIGH = 228
  for (let p = 0; p < total; p++) {
    const a = alpha[p]
    alpha[p] = a <= LOW ? 0 : a >= HIGH ? 255 : Math.round(((a - LOW) / (HIGH - LOW)) * 255)
  }

  const label = new Int32Array(total)
  const stack = new Int32Array(total)
  /** Label connected regions where `inside` holds; returns per-region area, peak alpha, and whether it touches the picture edge. */
  const regions = (inside: (p: number) => boolean) => {
    label.fill(0)
    const info: { area: number; peak: number; edge: boolean }[] = [{ area: 0, peak: 0, edge: false }]
    for (let start = 0; start < total; start++) {
      if (label[start] || !inside(start)) continue
      const id = info.length
      const r = { area: 0, peak: 0, edge: false }
      let top = 0
      label[start] = id
      stack[top++] = start
      while (top) {
        const p = stack[--top]
        r.area++
        if (alpha[p] > r.peak) r.peak = alpha[p]
        const x = p % w
        if (x === 0 || x === w - 1 || p < w || p >= total - w) r.edge = true
        if (x > 0 && !label[p - 1] && inside(p - 1)) { label[p - 1] = id; stack[top++] = p - 1 }
        if (x < w - 1 && !label[p + 1] && inside(p + 1)) { label[p + 1] = id; stack[top++] = p + 1 }
        if (p >= w && !label[p - w] && inside(p - w)) { label[p - w] = id; stack[top++] = p - w }
        if (p < total - w && !label[p + w] && inside(p + w)) { label[p + w] = id; stack[top++] = p + w }
      }
      info.push(r)
    }
    return info
  }

  // 2. Stray patches: keep the main subject and anything of comparable size.
  const kept = regions((p) => alpha[p] > 0)
  const largest = Math.max(0, ...kept.map((r) => r.area))
  for (let p = 0; p < total; p++) {
    const r = kept[label[p]]
    if (label[p] && (r.peak < 128 || r.area < largest * 0.02)) alpha[p] = 0
  }

  // 3. Pinholes: small fully enclosed gaps inside the subject.
  const gaps = regions((p) => alpha[p] < 255)
  for (let p = 0; p < total; p++) {
    const r = gaps[label[p]]
    if (label[p] && !r.edge && r.area < total * 0.0005) alpha[p] = 255
  }
}
