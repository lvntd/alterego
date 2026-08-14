import { Box, Text } from 'ink'
import React from 'react'
import type { WindowResult } from '../core/swarm.js'

export type WindowRowState =
  | { index: number; phase: 'spawning' }
  | { index: number; phase: 'launched'; pid: number; dir: string }
  | { index: number; phase: 'failed'; error: string }

export function toRowState(result: WindowResult): WindowRowState {
  if (result.status === 'launched') {
    return { index: result.index, phase: 'launched', pid: result.pid!, dir: result.dir }
  }
  return { index: result.index, phase: 'failed', error: result.error ?? 'unknown error' }
}

function StatusIcon({ phase }: { phase: WindowRowState['phase'] }): React.JSX.Element {
  if (phase === 'spawning') return <Text color="yellow">…</Text>
  if (phase === 'launched') return <Text color="green">✔</Text>
  return <Text color="red">✘</Text>
}

function Row({ row }: { row: WindowRowState }): React.JSX.Element {
  return (
    <Box>
      <Text>
        [{row.index}] <StatusIcon phase={row.phase} />{' '}
      </Text>
      {row.phase === 'spawning' && <Text dimColor>spawning…</Text>}
      {row.phase === 'launched' && (
        <Text>
          launched (pid {row.pid}) — <Text dimColor>{row.dir}</Text>
        </Text>
      )}
      {row.phase === 'failed' && <Text color="red">failed — {row.error}</Text>}
    </Box>
  )
}

export interface SwarmStatusProps {
  rows: WindowRowState[]
}

export function SwarmStatus({ rows }: SwarmStatusProps): React.JSX.Element {
  const launched = rows.filter((r) => r.phase === 'launched').length
  const failed = rows.filter((r) => r.phase === 'failed').length
  const done = launched + failed === rows.length

  return (
    <Box flexDirection="column">
      {rows.map((row) => (
        <Row key={row.index} row={row} />
      ))}
      {done && (
        <Box marginTop={1}>
          <Text>
            {launched}/{rows.length} windows launched
            {failed > 0 && <Text color="red"> ({failed} failed)</Text>}
          </Text>
        </Box>
      )}
    </Box>
  )
}
