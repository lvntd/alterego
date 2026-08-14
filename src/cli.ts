#!/usr/bin/env node

import { Command } from 'commander'
import { runClean } from './core/clean.js'
import type { BrowserName } from './core/browsers.js'
import { BROWSER_NAMES } from './core/browsers.js'
import { runSwarm, validateCount, type SwarmResult } from './core/swarm.js'
import { parseScreenSize } from './core/tile.js'
import { renderSwarmStatus } from './ui/render-swarm-status.jsx'

function isInteractive(noInteractiveFlag: boolean): boolean {
  if (noInteractiveFlag) return false
  if (process.env.CI) return false
  if (!process.stdout.isTTY) return false
  return true
}

function printPlainSwarmResult(result: SwarmResult): void {
  if (result.browser.fellBackFrom) {
    console.log(`${result.browser.fellBackFrom} not found, falling back to ${result.browser.browser}`)
  }

  for (const w of result.windows) {
    if (w.status === 'launched') {
      console.log(`[${w.index}] launched (pid ${w.pid}) — ${w.dir}`)
    } else {
      console.log(`[${w.index}] failed — ${w.error}`)
    }
  }

  const failed = result.windows.filter((w) => w.status === 'failed').length
  const launched = result.windows.length - failed
  console.log(`\n${launched}/${result.windows.length} windows launched`)
}

const program = new Command()

program.name('ego').description('Launch multiple isolated Chromium browser windows at once')

program
  .command('swarm')
  .description('Launch N isolated browser windows pointed at a URL')
  .argument('<count>', 'number of windows to launch')
  .argument('<url>', 'URL to open in each window')
  .option('--browser <name>', `browser to use (${BROWSER_NAMES.join('|')})`, 'chrome')
  .option('--persist', 'reuse stable session dirs instead of fresh incognito sessions', false)
  .option('--no-tile', 'disable automatic window tiling')
  .option('--screen <WxH>', 'screen size to tile against, e.g. 2560x1440')
  .option('--no-interactive', 'force plain-text output, skip Ink UI')
  .action(async (countArg: string, url: string, opts) => {
    const n = Number(countArg)

    let warning: string | undefined
    try {
      ;({ warning } = validateCount(n))
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exitCode = 1
      return
    }
    if (warning) {
      console.warn(`Warning: ${warning}`)
    }

    if (!BROWSER_NAMES.includes(opts.browser as BrowserName)) {
      console.error(`Error: unknown browser "${opts.browser}", expected one of ${BROWSER_NAMES.join(', ')}`)
      process.exitCode = 1
      return
    }

    let screen
    if (opts.screen) {
      try {
        screen = parseScreenSize(opts.screen)
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
        process.exitCode = 1
        return
      }
    }

    let result
    try {
      result = runSwarm(n, url, {
        browser: opts.browser as BrowserName,
        persist: Boolean(opts.persist),
        tile: opts.tile !== false,
        screen,
      })
    } catch (err) {
      console.error(`Error: ${err instanceof Error ? err.message : String(err)}`)
      process.exitCode = 1
      return
    }

    if (isInteractive(opts.interactive === false)) {
      await renderSwarmStatus(result)
    } else {
      printPlainSwarmResult(result)
    }

    process.exitCode = result.exitCode
  })

program
  .command('clean')
  .description('Remove all alterego session directories')
  .action(() => {
    const result = runClean()
    if (result.removed) {
      console.log(`Removed ${result.path}`)
    } else {
      console.log(`Nothing to clean — ${result.path} does not exist`)
    }
  })

program.parse()
