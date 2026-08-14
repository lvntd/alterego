export interface ScreenSize {
  width: number
  height: number
}

export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

export const DEFAULT_SCREEN: ScreenSize = { width: 1920, height: 1080 }

export function parseScreenSize(input: string): ScreenSize {
  const match = /^(\d+)x(\d+)$/i.exec(input.trim())
  if (!match) {
    throw new Error(`Invalid screen size "${input}", expected format WIDTHxHEIGHT, e.g. 2560x1440`)
  }
  const width = Number(match[1])
  const height = Number(match[2])
  if (width <= 0 || height <= 0) {
    throw new Error(`Invalid screen size "${input}", width and height must be positive`)
  }
  return { width, height }
}

export function computeGrid(n: number, screen: ScreenSize = DEFAULT_SCREEN): WindowRect[] {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`computeGrid requires a positive integer, got ${n}`)
  }

  const cols = Math.ceil(Math.sqrt(n))
  const rows = Math.ceil(n / cols)

  const cellWidth = Math.floor(screen.width / cols)
  const cellHeight = Math.floor(screen.height / rows)

  const rects: WindowRect[] = []
  for (let i = 0; i < n; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    rects.push({
      x: col * cellWidth,
      y: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    })
  }
  return rects
}
