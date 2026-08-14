import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export type BrowserName = 'chrome' | 'edge' | 'brave' | 'vivaldi'
export type Platform = 'darwin' | 'win32' | 'linux'

export const BROWSER_NAMES: BrowserName[] = ['chrome', 'edge', 'brave', 'vivaldi']

const INCOGNITO_FLAGS: Record<BrowserName, string> = {
  chrome: '--incognito',
  brave: '--incognito',
  vivaldi: '--incognito',
  edge: '--inprivate',
}

export function incognitoFlagFor(browser: BrowserName): string {
  return INCOGNITO_FLAGS[browser]
}

function candidatePaths(browser: BrowserName, platform: Platform, home: string): string[] {
  switch (platform) {
    case 'darwin':
      return {
        chrome: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
        edge: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
        brave: ['/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'],
        vivaldi: ['/Applications/Vivaldi.app/Contents/MacOS/Vivaldi'],
      }[browser]
    case 'win32': {
      const programFiles = process.env.PROGRAMFILES ?? 'C:\\Program Files'
      const programFilesX86 = process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)'
      const localAppData = process.env.LOCALAPPDATA ?? join(home, 'AppData', 'Local')
      return {
        chrome: [
          join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
          join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ],
        edge: [
          join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
          join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ],
        brave: [
          join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
          join(programFilesX86, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
          join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
        ],
        vivaldi: [
          join(programFiles, 'Vivaldi', 'Application', 'vivaldi.exe'),
          join(programFilesX86, 'Vivaldi', 'Application', 'vivaldi.exe'),
          join(localAppData, 'Vivaldi', 'Application', 'vivaldi.exe'),
        ],
      }[browser]
    }
    case 'linux':
      return {
        chrome: ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome'],
        edge: ['/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable'],
        brave: ['/usr/bin/brave-browser', '/usr/bin/brave'],
        vivaldi: ['/usr/bin/vivaldi', '/usr/bin/vivaldi-stable'],
      }[browser]
  }
}

export interface FindBrowserOptions {
  platform?: Platform
  home?: string
  exists?: (path: string) => boolean
}

export function findBrowserPath(browser: BrowserName, options: FindBrowserOptions = {}): string | null {
  const platform = options.platform ?? (process.platform as Platform)
  const home = options.home ?? homedir()
  const exists = options.exists ?? existsSync

  const paths = candidatePaths(browser, platform, home)
  for (const path of paths) {
    if (exists(path)) {
      return path
    }
  }
  return null
}

export interface ResolveBrowserResult {
  browser: BrowserName
  path: string
  fellBackFrom?: BrowserName
}

export function resolveBrowser(
  requested: BrowserName,
  options: FindBrowserOptions = {},
): ResolveBrowserResult {
  const requestedPath = findBrowserPath(requested, options)
  if (requestedPath) {
    return { browser: requested, path: requestedPath }
  }

  for (const candidate of BROWSER_NAMES) {
    if (candidate === requested) continue
    const path = findBrowserPath(candidate, options)
    if (path) {
      return { browser: candidate, path, fellBackFrom: requested }
    }
  }

  throw new Error(
    `Could not find any supported browser (${BROWSER_NAMES.join(', ')}) installed on this system`,
  )
}
