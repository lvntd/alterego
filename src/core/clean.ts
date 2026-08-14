import { existsSync, rmSync } from 'node:fs'
import { SESSION_ROOT } from './swarm.js'

export interface CleanDeps {
  exists?: (path: string) => boolean
  remove?: (path: string) => void
}

export interface CleanResult {
  removed: boolean
  path: string
}

export function runClean(deps: CleanDeps = {}): CleanResult {
  const exists = deps.exists ?? existsSync
  const remove = deps.remove ?? ((path: string) => rmSync(path, { recursive: true, force: true }))

  if (!exists(SESSION_ROOT)) {
    return { removed: false, path: SESSION_ROOT }
  }

  remove(SESSION_ROOT)
  return { removed: true, path: SESSION_ROOT }
}
