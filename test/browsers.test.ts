import { describe, expect, it } from 'vitest'
import {
  BROWSER_NAMES,
  findBrowserPath,
  incognitoFlagFor,
  resolveBrowser,
  type BrowserName,
  type Platform,
} from '../src/core/browsers.js'

describe('incognitoFlagFor', () => {
  it('uses --incognito for chrome, brave, vivaldi', () => {
    expect(incognitoFlagFor('chrome')).toBe('--incognito')
    expect(incognitoFlagFor('brave')).toBe('--incognito')
    expect(incognitoFlagFor('vivaldi')).toBe('--incognito')
  })

  it('uses --inprivate for edge', () => {
    expect(incognitoFlagFor('edge')).toBe('--inprivate')
  })
})

describe('findBrowserPath', () => {
  const platforms: Platform[] = ['darwin', 'win32', 'linux']

  for (const platform of platforms) {
    for (const browser of BROWSER_NAMES) {
      it(`finds ${browser} on ${platform} when its path exists`, () => {
        const path = findBrowserPath(browser, {
          platform,
          home: platform === 'win32' ? 'C:\\Users\\test' : '/home/test',
          exists: () => true,
        })
        expect(path).not.toBeNull()
        expect(typeof path).toBe('string')
      })

      it(`returns null for ${browser} on ${platform} when nothing exists`, () => {
        const path = findBrowserPath(browser, {
          platform,
          home: platform === 'win32' ? 'C:\\Users\\test' : '/home/test',
          exists: () => false,
        })
        expect(path).toBeNull()
      })
    }
  }

  it('checks candidate paths in order and returns the first that exists', () => {
    const seen: string[] = []
    const path = findBrowserPath('chrome', {
      platform: 'win32',
      home: 'C:\\Users\\test',
      exists: (p) => {
        seen.push(p)
        return seen.length === 2
      },
    })
    expect(path).toBe(seen[1])
  })
})

describe('resolveBrowser', () => {
  it('returns the requested browser when it is installed', () => {
    const result = resolveBrowser('brave', {
      platform: 'darwin',
      home: '/home/test',
      exists: (p) => p.includes('Brave'),
    })
    expect(result.browser).toBe('brave')
    expect(result.fellBackFrom).toBeUndefined()
  })

  it('falls back to another installed browser when requested is missing, and records the fallback', () => {
    const result = resolveBrowser('chrome', {
      platform: 'darwin',
      home: '/home/test',
      exists: (p) => p.includes('Edge'),
    })
    expect(result.browser).toBe('edge')
    expect(result.fellBackFrom).toBe('chrome')
  })

  it('throws when no supported browser is installed', () => {
    expect(() =>
      resolveBrowser('chrome', {
        platform: 'linux',
        home: '/home/test',
        exists: () => false,
      }),
    ).toThrow()
  })

  it('every BrowserName has an incognito flag entry', () => {
    const names: BrowserName[] = [...BROWSER_NAMES]
    for (const name of names) {
      expect(incognitoFlagFor(name)).toMatch(/^--/)
    }
  })
})
