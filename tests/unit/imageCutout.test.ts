import { describe, expect, it } from 'vitest'
import { borderColour, colourSpread, eraseRegion, looksLikeGraphic, removeFlatBackground } from '../../src/modules/image/lib/flatBackground'
import { cleanMask } from '../../src/modules/image/lib/maskCleanup'

type Rgb = [number, number, number]
const WHITE: Rgb = [255, 255, 255]
const BLUE: Rgb = [107, 184, 215]
const BLACK: Rgb = [0, 0, 0]

function canvas(w: number, h: number, fill: Rgb) {
  const px = new Uint8ClampedArray(w * h * 4)
  const set = (x: number, y: number, c: Rgb) => px.set([...c, 255], (y * w + x) * 4)
  const rect = (x0: number, y0: number, x1: number, y1: number, c: Rgb) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, c)
  }
  rect(0, 0, w, h, fill)
  const at = (x: number, y: number) => Array.from(px.slice((y * w + x) * 4, (y * w + x) * 4 + 4))
  return { px, set, rect, at }
}

/** A logo-like picture: white ground, a blue badge with a large white shape inside, and a black letter with a small hole. */
function logo() {
  const w = 200, h = 100
  const c = canvas(w, h, WHITE)
  c.rect(10, 10, 80, 90, BLUE)
  c.rect(30, 30, 60, 70, WHITE) // large enclosed white shape: part of the design
  c.rect(110, 20, 180, 80, BLACK)
  c.rect(140, 45, 148, 53, WHITE) // small hole in the letter
  // A half-covered (anti-aliased) column on the letter's left edge.
  for (let y = 20; y < 80; y++) c.set(109, y, [128, 128, 128])
  return { ...c, w, h }
}

describe('flat background removal', () => {
  it('reads the border colour', () => {
    const { px, w, h } = logo()
    const b = borderColour(px, w, h)
    expect(b.colour).toEqual(WHITE)
    expect(b.uniformity).toBe(1)
    expect(b.transparent).toBe(false)
  })

  it('tells graphics from photos', () => {
    const { px, w, h } = logo()
    expect(colourSpread(px, w, h)).toBeLessThan(10)
    expect(looksLikeGraphic(px, w, h)).toBe(true)
    // Photo-like: smooth gradients everywhere, border not one colour.
    const photo = canvas(64, 64, WHITE)
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) photo.set(x, y, [x * 4, y * 4, (x * y) % 256])
    expect(looksLikeGraphic(photo.px, 64, 64)).toBe(false)
  })

  it('removes the ground, keeps the design, opens small holes', () => {
    const { px, w, h, at } = logo()
    expect(removeFlatBackground(px, w, h)).toBe(true)
    expect(at(0, 0)[3]).toBe(0) // ground
    expect(at(95, 50)[3]).toBe(0) // ground between badge and letter
    expect(at(20, 50)).toEqual([...BLUE, 255]) // badge untouched
    expect(at(45, 50)).toEqual([...WHITE, 255]) // large white shape kept
    expect(at(150, 30)).toEqual([...BLACK, 255]) // letter untouched
    expect(at(144, 49)[3]).toBe(0) // small hole opened
  })

  it('gives anti-aliased edges partial transparency in the shape colour', () => {
    const { px, w, h, at } = logo()
    removeFlatBackground(px, w, h)
    const [r, g, b, a] = at(109, 50)
    expect(a).toBeGreaterThan(100)
    expect(a).toBeLessThan(155)
    expect(Math.max(r, g, b)).toBeLessThan(10) // white taken out: pure black at half strength
    // Solid edge pixels stay solid.
    expect(at(10, 50)).toEqual([...BLUE, 255])
  })

  it('leaves pictures with no flat ground or an already transparent border alone', () => {
    const clear = new Uint8ClampedArray(20 * 20 * 4)
    expect(removeFlatBackground(clear, 20, 20)).toBe(false)
  })

  it('erases only the clicked region', () => {
    const { px, w, h, at } = logo()
    const inside = 50 * w + 45
    expect(eraseRegion(px, w, h, [inside], WHITE, 28)).toBe(30 * 40)
    expect(at(45, 50)[3]).toBe(0)
    expect(at(0, 0)[3]).toBe(255) // the outer ground was not touched
  })
})

describe('AI mask clean-up', () => {
  it('drops haze and specks, keeps the subject, fills pinholes', () => {
    const w = 100, h = 100
    const a = new Uint8Array(w * h)
    const rect = (x0: number, y0: number, x1: number, y1: number, v: number) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) a[y * w + x] = v
    }
    rect(20, 20, 80, 80, 255) // subject
    rect(50, 50, 52, 52, 0) // pinhole
    rect(2, 2, 6, 6, 200) // speck
    rect(90, 90, 99, 99, 20) // haze
    rect(30, 30, 40, 40, 240) // nearly solid part of the subject
    cleanMask(a, w, h)
    expect(a[50 * w + 50]).toBe(255)
    expect(a[51 * w + 51]).toBe(255)
    expect(a[3 * w + 3]).toBe(0)
    expect(a[95 * w + 95]).toBe(0)
    expect(a[35 * w + 35]).toBe(255)
    expect(a[10 * w + 50]).toBe(0)
  })

  it('keeps a second subject of similar size', () => {
    const w = 100, h = 50
    const a = new Uint8Array(w * h)
    for (let y = 10; y < 40; y++) for (let x = 5; x < 40; x++) a[y * w + x] = 255
    for (let y = 10; y < 40; y++) for (let x = 60; x < 90; x++) a[y * w + x] = 255
    cleanMask(a, w, h)
    expect(a[25 * w + 20]).toBe(255)
    expect(a[25 * w + 75]).toBe(255)
  })
})
