import { spawn, type ChildProcess } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type BrowserName, incognitoFlagFor, resolveBrowser, type ResolveBrowserResult } from './browsers.js'
import { computeGrid, DEFAULT_SCREEN, type ScreenSize } from './tile.js'

export const SESSION_ROOT = join(tmpdir(), 'alterego')

export function sessionDir(index: number): string {
  return join(SESSION_ROOT, `session-${index}`)
}

export function normalizeUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('URL must not be empty')
  }
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    throw new Error(`Invalid URL: "${input}"`)
  }
  return parsed.toString()
}

export function validateCount(n: number): { warning?: string } {
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`Window count must be a positive integer, got ${n}`)
  }
  if (n > 12) {
    return {
      warning: `Launching ${n} windows — each is a full browser instance and this may strain your system.`,
    }
  }
  return {}
}

export interface SwarmOptions {
  browser?: BrowserName
  persist?: boolean
  tile?: boolean
  screen?: ScreenSize
}

export interface WindowResult {
  index: number
  dir: string
  status: 'launched' | 'failed'
  pid?: number
  error?: string
}

export interface SpawnFn {
  (bin: string, args: string[]): Pick<ChildProcess, 'pid' | 'unref'>
}

export interface SwarmDeps {
  spawnFn?: SpawnFn
  mkdir?: (path: string) => void
  resolve?: (browser: BrowserName) => ResolveBrowserResult
}

export interface SwarmResult {
  windows: WindowResult[]
  browser: ResolveBrowserResult
  exitCode: 0 | 1
}

const defaultSpawn: SpawnFn = (bin, args) => spawn(bin, args, { detached: true, stdio: 'ignore' })

export function runSwarm(n: number, url: string, options: SwarmOptions = {}, deps: SwarmDeps = {}): SwarmResult {
  validateCount(n)
  const normalizedUrl = normalizeUrl(url)

  const spawnFn = deps.spawnFn ?? defaultSpawn
  const mkdir = deps.mkdir ?? ((path: string) => mkdirSync(path, { recursive: true }))
  const resolve = deps.resolve ?? ((browser: BrowserName) => resolveBrowser(browser))

  const browserResult = resolve(options.browser ?? 'chrome')
  const incognito = !options.persist
  const tile = options.tile ?? true
  const screen = options.screen ?? DEFAULT_SCREEN

  const rects = tile ? computeGrid(n, screen) : null

  const windows: WindowResult[] = []

  for (let i = 0; i < n; i++) {
    const dir = sessionDir(i)
    try {
      mkdir(dir)

      const args = [
        `--user-data-dir=${dir}`,
        '--no-first-run',
        '--no-default-browser-check',
        ...(incognito ? [incognitoFlagFor(browserResult.browser)] : []),
        ...(rects
          ? [
              `--window-position=${rects[i]!.x},${rects[i]!.y}`,
              `--window-size=${rects[i]!.width},${rects[i]!.height}`,
            ]
          : []),
        normalizedUrl,
      ]

      const child = spawnFn(browserResult.path, args)
      child.unref()

      windows.push({ index: i, dir, status: 'launched', pid: child.pid })
    } catch (err) {
      windows.push({
        index: i,
        dir,
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const exitCode = windows.some((w) => w.status === 'failed') ? 1 : 0

  return { windows, browser: browserResult, exitCode }
}
