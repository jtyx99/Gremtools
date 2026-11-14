import { PdfToolError } from './errors'

/**
 * Parse "1-3, 5, 8-" into groups of zero-based page indices: [[0,1,2],[4],[7..last]].
 * Each comma-separated part is one group. Reversed ranges ("5-2") are allowed.
 */
export function parseRanges(input: string, pageCount: number): number[][] {
  const groups: number[][] = []
  for (const raw of input.split(',')) {
    const part = raw.trim()
    if (!part) continue
    const m = /^(\d+)?\s*(-)?\s*(\d+)?$/.exec(part)
    if (!m || (!m[1] && !m[3])) throw new PdfToolError(`"${part}" is not a valid page or range.`)
    const start = m[1] ? Number(m[1]) : 1
    const end = m[2] ? (m[3] ? Number(m[3]) : pageCount) : start
    for (const n of [start, end]) {
      if (n < 1 || n > pageCount) {
        throw new PdfToolError(`Page ${n} is out of range. This PDF has ${pageCount} page${pageCount === 1 ? '' : 's'}.`)
      }
    }
    const group: number[] = []
    const step = start <= end ? 1 : -1
    for (let n = start; n !== end + step; n += step) group.push(n - 1)
    groups.push(group)
  }
  if (!groups.length) throw new PdfToolError('Enter at least one page or range, for example 1-3, 5.')
  return groups
}

/** Groups of `size` consecutive pages: every(2, 5) -> [[0,1],[2,3],[4]]. */
export function everyN(size: number, pageCount: number): number[][] {
  const n = Math.max(1, Math.floor(size))
  const groups: number[][] = []
  for (let i = 0; i < pageCount; i += n) {
    groups.push(Array.from({ length: Math.min(n, pageCount - i) }, (_, k) => i + k))
  }
  return groups
}
