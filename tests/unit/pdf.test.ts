import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { parseRanges, everyN } from '../../src/modules/pdf/lib/ranges'
import { mergePdfs } from '../../src/modules/pdf/lib/merge'
import { splitPdf } from '../../src/modules/pdf/lib/split'
import { organisePdf } from '../../src/modules/pdf/lib/organise'
import { imagesToPdf } from '../../src/modules/pdf/lib/imagesToPdf'
import { watermarkPdf } from '../../src/modules/pdf/lib/watermark'
import { addPageNumbers } from '../../src/modules/pdf/lib/pageNumbers'
import { compressPdf, pageCount, renderAllPages, renderPage } from '../../src/modules/pdf/engines/mupdf'
import { makeImagePdf, makePdf, makePng, pageTexts } from './fixtures'

describe('ranges', () => {
  it('parses pages, ranges, open and reversed ranges', () => {
    expect(parseRanges('1-3, 5, 8-', 9)).toEqual([[0, 1, 2], [4], [7, 8]])
    expect(parseRanges('3-1', 5)).toEqual([[2, 1, 0]])
    expect(parseRanges('-2', 5)).toEqual([[0, 1]])
  })
  it('rejects bad input', () => {
    expect(() => parseRanges('0', 5)).toThrow(/out of range/)
    expect(() => parseRanges('1-9', 5)).toThrow(/out of range/)
    expect(() => parseRanges('abc', 5)).toThrow(/not a valid/)
    expect(() => parseRanges(' , ', 5)).toThrow(/at least one/)
  })
  it('groups every N pages', () => {
    expect(everyN(2, 5)).toEqual([[0, 1], [2, 3], [4]])
  })
})

describe('merge, split, organise', () => {
  it('merges in order', async () => {
    const out = await mergePdfs([await makePdf(2), await makePdf(3)])
    expect(pageTexts(out)).toEqual(['Page 1', 'Page 2', 'Page 1', 'Page 2', 'Page 3'])
  })
  it('splits into groups', async () => {
    const outs = await splitPdf(await makePdf(5), [[0, 1], [4]])
    expect(outs.map(pageTexts)).toEqual([['Page 1', 'Page 2'], ['Page 5']])
  })
  it('reorders, deletes and rotates', async () => {
    const out = await organisePdf(await makePdf(4), [
      { index: 3, rotate: 90 },
      { index: 0, rotate: 0 },
    ])
    expect(pageTexts(out)).toEqual(['Page 4', 'Page 1'])
    const doc = await PDFDocument.load(out)
    expect(doc.getPages().map((p) => p.getRotation().angle)).toEqual([90, 0])
  })
  it('reports a clear error for a non-PDF', async () => {
    await expect(mergePdfs([new Uint8Array([1, 2, 3])])).rejects.toThrow(/could not be read/)
  })
})

describe('images to PDF', () => {
  it('makes one page per image, sized to fit', async () => {
    const png = makePng(300, 200)
    const out = await imagesToPdf([{ bytes: png, type: 'png' }, { bytes: png, type: 'png' }], {
      pageSize: 'fit', orientation: 'auto', margin: 10,
    })
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
    expect(doc.getPage(0).getSize()).toEqual({ width: 320, height: 220 })
  })
  it('uses landscape A4 for a wide image', async () => {
    const out = await imagesToPdf([{ bytes: makePng(300, 200), type: 'png' }], {
      pageSize: 'a4', orientation: 'auto', margin: 0,
    })
    const { width, height } = (await PDFDocument.load(out)).getPage(0).getSize()
    expect(width).toBeGreaterThan(height)
  })
})

describe('watermark and page numbers', () => {
  it('adds watermark text to every page', async () => {
    const out = await watermarkPdf(await makePdf(2), {
      kind: 'text', text: 'DRAFT', opacity: 0.3, rotation: 45, position: 'center', fontSize: 40,
    })
    for (const t of pageTexts(out)) expect(t).toContain('DRAFT')
  })
  it('adds an image watermark', async () => {
    const out = await watermarkPdf(await makePdf(1), {
      kind: 'image', image: { bytes: makePng(100, 50), type: 'png' }, opacity: 0.5, rotation: 0, position: 'tile',
    })
    expect(out.length).toBeGreaterThan(0)
    expect(pageCount(out)).toBe(1)
  })
  it('numbers the chosen pages from the start number', async () => {
    const out = await addPageNumbers(await makePdf(3), {
      position: 'bottom', format: '{n} of {total}', start: 1, fontSize: 10, margin: 24, color: '#000000', pages: '2-',
    })
    const texts = pageTexts(out)
    expect(texts[0]).toBe('Page 1')
    expect(texts[1]).toContain('1 of 2')
    expect(texts[2]).toContain('2 of 2')
  })
  it('keeps numbers on the visual bottom of rotated pages', async () => {
    const out = await addPageNumbers(await makePdf(1, 90), {
      position: 'bottom', format: 'N{n}', start: 7, fontSize: 10, margin: 24, color: '#000000',
    })
    expect(pageTexts(out)[0]).toContain('N7')
  })
})

describe('mupdf engine', () => {
  it('compresses an image-heavy PDF and keeps it readable', async () => {
    const src = await makeImagePdf()
    const { bytes, imagesRewritten } = compressPdf(src, 'balanced')
    expect(imagesRewritten).toBe(1)
    expect(bytes.length).toBeLessThan(src.length * 0.5)
    expect(pageCount(bytes)).toBe(1)
    expect(renderPage(bytes, 0, { format: 'png', dpi: 36 }).length).toBeGreaterThan(100)
  })
  it('does not break a text-only PDF', async () => {
    const src = await makePdf(3)
    const { bytes } = compressPdf(src, 'strong')
    expect(pageTexts(bytes)).toEqual(['Page 1', 'Page 2', 'Page 3'])
  })
  it('renders pages to PNG and JPG', async () => {
    const src = await makePdf(2)
    const pngs = renderAllPages(src, { format: 'png', dpi: 72 })
    expect(pngs).toHaveLength(2)
    expect([...pngs[0].slice(1, 4)]).toEqual([0x50, 0x4e, 0x47])
    const jpg = renderPage(src, 1, { format: 'jpg', dpi: 72 })
    expect([...jpg.slice(0, 2)]).toEqual([0xff, 0xd8])
  })
})
