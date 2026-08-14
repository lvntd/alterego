import { describe, expect, it } from 'vitest'
import { computeGrid, parseScreenSize, type ScreenSize, type WindowRect } from '../src/core/tile.js'

function rectsOverlap(a: WindowRect, b: WindowRect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

function assertNoOverlaps(rects: WindowRect[]): void {
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      expect(rectsOverlap(rects[i]!, rects[j]!)).toBe(false)
    }
  }
}

function assertOnScreen(rects: WindowRect[], screen: ScreenSize): void {
  for (const rect of rects) {
    expect(rect.x).toBeGreaterThanOrEqual(0)
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.x + rect.width).toBeLessThanOrEqual(screen.width)
    expect(rect.y + rect.height).toBeLessThanOrEqual(screen.height)
    expect(rect.width).toBeGreaterThan(0)
    expect(rect.height).toBeGreaterThan(0)
  }
}

const screens: ScreenSize[] = [
  { width: 1920, height: 1080 },
  { width: 2560, height: 1440 },
  { width: 1280, height: 720 },
  { width: 3840, height: 2160 },
]

const counts = [1, 2, 3, 4, 6, 9, 12]

describe('computeGrid', () => {
  for (const screen of screens) {
    for (const n of counts) {
      it(`produces ${n} non-overlapping on-screen rects for ${screen.width}x${screen.height}`, () => {
        const rects = computeGrid(n, screen)
        expect(rects).toHaveLength(n)
        assertNoOverlaps(rects)
        assertOnScreen(rects, screen)
      })
    }
  }

  it('uses ceil(sqrt(n)) columns', () => {
    // n=4 -> cols=2, rows=2
    const rects4 = computeGrid(4, { width: 1000, height: 1000 })
    expect(rects4[0]).toEqual({ x: 0, y: 0, width: 500, height: 500 })
    expect(rects4[1]).toEqual({ x: 500, y: 0, width: 500, height: 500 })
    expect(rects4[2]).toEqual({ x: 0, y: 500, width: 500, height: 500 })
    expect(rects4[3]).toEqual({ x: 500, y: 500, width: 500, height: 500 })
  })

  it('handles n=1 as a single full-screen window', () => {
    const rects = computeGrid(1, { width: 1920, height: 1080 })
    expect(rects).toEqual([{ x: 0, y: 0, width: 1920, height: 1080 }])
  })

  it('handles n=3 with a partially filled last row', () => {
    // cols = ceil(sqrt(3)) = 2, rows = ceil(3/2) = 2
    const rects = computeGrid(3, { width: 1000, height: 1000 })
    expect(rects).toHaveLength(3)
    assertNoOverlaps(rects)
  })

  it('throws on n=0', () => {
    expect(() => computeGrid(0)).toThrow()
  })

  it('throws on negative n', () => {
    expect(() => computeGrid(-1)).toThrow()
  })

  it('throws on non-integer n', () => {
    expect(() => computeGrid(2.5)).toThrow()
  })

  it('defaults to 1920x1080 when no screen is given', () => {
    const rects = computeGrid(1)
    expect(rects).toEqual([{ x: 0, y: 0, width: 1920, height: 1080 }])
  })
})

describe('parseScreenSize', () => {
  it('parses a valid WIDTHxHEIGHT string', () => {
    expect(parseScreenSize('2560x1440')).toEqual({ width: 2560, height: 1440 })
  })

  it('is case-insensitive on the separator', () => {
    expect(parseScreenSize('1920X1080')).toEqual({ width: 1920, height: 1080 })
  })

  it('throws on malformed input', () => {
    expect(() => parseScreenSize('not-a-size')).toThrow()
    expect(() => parseScreenSize('1920x')).toThrow()
    expect(() => parseScreenSize('x1080')).toThrow()
  })

  it('throws on zero or negative dimensions', () => {
    expect(() => parseScreenSize('0x1080')).toThrow()
    expect(() => parseScreenSize('1920x0')).toThrow()
  })
})
