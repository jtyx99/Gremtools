import { describe, expect, it } from 'vitest'
import { blurRadius, coverRect, fitArea, fitWithin, outputName } from '../../src/modules/image/lib/compose'

describe('image compose helpers', () => {
  it('fits within a longest side without scaling up', () => {
    expect(fitWithin(4000, 3000, 1024)).toEqual({ width: 1024, height: 768 })
    expect(fitWithin(300, 200, 1024)).toEqual({ width: 300, height: 200 })
  })
  it('fits within a pixel budget', () => {
    const { width, height } = fitArea(8000, 6000, 16_000_000)
    expect(width * height).toBeLessThanOrEqual(16_000_000)
    expect(width / height).toBeCloseTo(8000 / 6000, 2)
    expect(fitArea(100, 100, 16_000_000)).toEqual({ width: 100, height: 100 })
  })
  it('crops a background evenly to cover the target', () => {
    // Wide source into a square target: full height, centred horizontally.
    expect(coverRect(200, 100, 50, 50)).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100 })
    // Tall source into a wide target: full width, centred vertically.
    expect(coverRect(100, 400, 100, 50)).toEqual({ sx: 0, sy: 175, sw: 100, sh: 50 })
  })
  it('scales blur with image size', () => {
    expect(blurRadius(1000, 500)).toBe(20)
    expect(blurRadius(40, 40)).toBe(2)
  })
  it('names the output after the original', () => {
    expect(outputName('holiday.photo.jpeg', 'png')).toBe('holiday.photo-no-background.png')
    expect(outputName('.hidden', 'jpg')).toBe('image-no-background.jpg')
  })
})
