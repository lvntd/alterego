import { describe, expect, it, vi } from 'vitest'
import { runClean } from '../src/core/clean.js'
import { SESSION_ROOT } from '../src/core/swarm.js'

describe('runClean', () => {
  it('removes the session root when it exists', () => {
    const remove = vi.fn()
    const result = runClean({ exists: () => true, remove })
    expect(remove).toHaveBeenCalledWith(SESSION_ROOT)
    expect(result).toEqual({ removed: true, path: SESSION_ROOT })
  })

  it('is a no-op when the session root does not exist', () => {
    const remove = vi.fn()
    const result = runClean({ exists: () => false, remove })
    expect(remove).not.toHaveBeenCalled()
    expect(result).toEqual({ removed: false, path: SESSION_ROOT })
  })
})
