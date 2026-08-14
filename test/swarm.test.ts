import { describe, expect, it, vi } from 'vitest'
import { normalizeUrl, runSwarm, sessionDir, validateCount, type SpawnFn } from '../src/core/swarm.js'
import type { BrowserName } from '../src/core/browsers.js'

function fakeSpawn(pidStart = 1000): { spawnFn: SpawnFn; calls: Array<{ bin: string; args: string[] }> } {
  const calls: Array<{ bin: string; args: string[] }> = []
  let pid = pidStart
  const spawnFn: SpawnFn = (bin, args) => {
    calls.push({ bin, args })
    return { pid: pid++, unref: () => {}, on: () => {} }
  }
  return { spawnFn, calls }
}

const resolveChrome = () => ({ browser: 'chrome' as BrowserName, path: '/fake/chrome' })

describe('normalizeUrl', () => {
  it('leaves a URL with a scheme untouched', () => {
    expect(normalizeUrl('https://example.com')).toBe('https://example.com/')
  })

  it('prepends https:// when no scheme is present', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/')
  })

  it('throws on empty input', () => {
    expect(() => normalizeUrl('  ')).toThrow()
  })

  it('throws on unparseable input', () => {
    expect(() => normalizeUrl('https://')).toThrow()
  })
})

describe('validateCount', () => {
  it('accepts positive integers up to 12 with no warning', () => {
    expect(validateCount(1).warning).toBeUndefined()
    expect(validateCount(12).warning).toBeUndefined()
  })

  it('warns above 12', () => {
    expect(validateCount(13).warning).toMatch(/13/)
  })

  it('throws on zero, negative, or non-integer', () => {
    expect(() => validateCount(0)).toThrow()
    expect(() => validateCount(-1)).toThrow()
    expect(() => validateCount(1.5)).toThrow()
  })
})

describe('sessionDir', () => {
  it('is stable and namespaced under alterego', () => {
    expect(sessionDir(0)).toMatch(/alterego[\\/]session-0$/)
    expect(sessionDir(3)).toMatch(/alterego[\\/]session-3$/)
  })
})

describe('runSwarm', () => {
  it('spawns n windows with mandatory flags and a fresh incognito dir by default', () => {
    const { spawnFn, calls } = fakeSpawn()
    const mkdir = vi.fn()

    const result = runSwarm(2, 'example.com', {}, { spawnFn, mkdir, resolve: resolveChrome })

    expect(result.exitCode).toBe(0)
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call.bin).toBe('/fake/chrome')
      expect(call.args).toContain('--no-first-run')
      expect(call.args).toContain('--no-default-browser-check')
      expect(call.args).toContain('--incognito')
      expect(call.args.some((a) => a.startsWith('--user-data-dir='))).toBe(true)
      expect(call.args.at(-1)).toBe('https://example.com/')
    }
    // distinct session dirs
    const dirs = calls.map((c) => c.args.find((a) => a.startsWith('--user-data-dir=')))
    expect(new Set(dirs).size).toBe(2)
  })

  it('omits the incognito flag when persist is set', () => {
    const { spawnFn, calls } = fakeSpawn()
    runSwarm(1, 'example.com', { persist: true }, { spawnFn, mkdir: vi.fn(), resolve: resolveChrome })
    expect(calls[0]!.args).not.toContain('--incognito')
  })

  it('uses --inprivate for edge', () => {
    const { spawnFn, calls } = fakeSpawn()
    runSwarm(
      1,
      'example.com',
      { browser: 'edge' },
      {
        spawnFn,
        mkdir: vi.fn(),
        resolve: () => ({ browser: 'edge', path: '/fake/edge' }),
      },
    )
    expect(calls[0]!.args).toContain('--inprivate')
    expect(calls[0]!.args).not.toContain('--incognito')
  })

  it('adds window-position and window-size flags by default (tiled)', () => {
    const { spawnFn, calls } = fakeSpawn()
    runSwarm(4, 'example.com', {}, { spawnFn, mkdir: vi.fn(), resolve: resolveChrome })
    for (const call of calls) {
      expect(call.args.some((a) => a.startsWith('--window-position='))).toBe(true)
      expect(call.args.some((a) => a.startsWith('--window-size='))).toBe(true)
    }
  })

  it('omits tiling flags when tile is false', () => {
    const { spawnFn, calls } = fakeSpawn()
    runSwarm(4, 'example.com', { tile: false }, { spawnFn, mkdir: vi.fn(), resolve: resolveChrome })
    for (const call of calls) {
      expect(call.args.some((a) => a.startsWith('--window-position='))).toBe(false)
      expect(call.args.some((a) => a.startsWith('--window-size='))).toBe(false)
    }
  })

  it('respects a custom screen size for tiling', () => {
    const { spawnFn, calls } = fakeSpawn()
    runSwarm(
      1,
      'example.com',
      { screen: { width: 2560, height: 1440 } },
      { spawnFn, mkdir: vi.fn(), resolve: resolveChrome },
    )
    expect(calls[0]!.args).toContain('--window-size=2560,1440')
  })

  it('reports per-window results with index, dir, and pid', () => {
    const { spawnFn } = fakeSpawn(5000)
    const result = runSwarm(2, 'example.com', {}, { spawnFn, mkdir: vi.fn(), resolve: resolveChrome })
    expect(result.windows).toEqual([
      expect.objectContaining({ index: 0, status: 'launched', pid: 5000 }),
      expect.objectContaining({ index: 1, status: 'launched', pid: 5001 }),
    ])
  })

  it('continues launching remaining windows when one spawn fails, and reports failure + non-zero exit', () => {
    const calls: Array<{ bin: string; args: string[] }> = []
    const spawnFn: SpawnFn = (bin, args) => {
      calls.push({ bin, args })
      if (calls.length === 2) {
        throw new Error('spawn EACCES')
      }
      return { pid: 1000 + calls.length, unref: () => {}, on: () => {} }
    }

    const result = runSwarm(4, 'example.com', {}, { spawnFn, mkdir: vi.fn(), resolve: resolveChrome })

    expect(calls).toHaveLength(4)
    expect(result.exitCode).toBe(1)
    expect(result.windows.map((w) => w.status)).toEqual(['launched', 'failed', 'launched', 'launched'])
    expect(result.windows[1]!.error).toMatch(/EACCES/)
  })

  it('reports browser fallback when the requested browser is unavailable', () => {
    const { spawnFn } = fakeSpawn()
    const result = runSwarm(
      1,
      'example.com',
      { browser: 'chrome' },
      {
        spawnFn,
        mkdir: vi.fn(),
        resolve: () => ({ browser: 'brave', path: '/fake/brave', fellBackFrom: 'chrome' }),
      },
    )
    expect(result.browser.fellBackFrom).toBe('chrome')
    expect(result.browser.browser).toBe('brave')
  })
})
