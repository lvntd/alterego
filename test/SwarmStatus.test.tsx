import { render } from 'ink-testing-library'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from 'ink-testing-library'
import { SwarmStatus, toRowState, type WindowRowState } from '../src/ui/SwarmStatus.js'
import type { WindowResult } from '../src/core/swarm.js'

afterEach(() => {
  cleanup()
})

describe('toRowState', () => {
  it('maps a launched WindowResult', () => {
    const result: WindowResult = { index: 0, dir: '/tmp/alterego/session-0', status: 'launched', pid: 123 }
    expect(toRowState(result)).toEqual({ index: 0, phase: 'launched', pid: 123, dir: '/tmp/alterego/session-0' })
  })

  it('maps a failed WindowResult', () => {
    const result: WindowResult = { index: 1, dir: '/tmp/alterego/session-1', status: 'failed', error: 'boom' }
    expect(toRowState(result)).toEqual({ index: 1, phase: 'failed', error: 'boom' })
  })
})

describe('SwarmStatus', () => {
  it('renders a row per window with index and status', () => {
    const rows: WindowRowState[] = [
      { index: 0, phase: 'launched', pid: 111, dir: '/tmp/alterego/session-0' },
      { index: 1, phase: 'failed', error: 'spawn EACCES' },
    ]
    const { lastFrame } = render(<SwarmStatus rows={rows} />)
    const frame = lastFrame()
    expect(frame).toContain('[0]')
    expect(frame).toContain('111')
    expect(frame).toContain('[1]')
    expect(frame).toContain('spawn EACCES')
  })

  it('shows a spawning row before it resolves', () => {
    const rows: WindowRowState[] = [{ index: 0, phase: 'spawning' }]
    const { lastFrame } = render(<SwarmStatus rows={rows} />)
    expect(lastFrame()).toContain('spawning')
  })

  it('shows the summary line once every row has resolved', () => {
    const rows: WindowRowState[] = [
      { index: 0, phase: 'launched', pid: 1, dir: '/a' },
      { index: 1, phase: 'launched', pid: 2, dir: '/b' },
    ]
    const { lastFrame } = render(<SwarmStatus rows={rows} />)
    expect(lastFrame()).toContain('2/2 windows launched')
  })

  it('omits the summary line while windows are still spawning', () => {
    const rows: WindowRowState[] = [
      { index: 0, phase: 'launched', pid: 1, dir: '/a' },
      { index: 1, phase: 'spawning' },
    ]
    const { lastFrame } = render(<SwarmStatus rows={rows} />)
    expect(lastFrame()).not.toContain('windows launched')
  })

  it('includes a failure count in the summary when some windows fail', () => {
    const rows: WindowRowState[] = [
      { index: 0, phase: 'launched', pid: 1, dir: '/a' },
      { index: 1, phase: 'failed', error: 'boom' },
    ]
    const { lastFrame } = render(<SwarmStatus rows={rows} />)
    expect(lastFrame()).toContain('1 failed')
  })
})
