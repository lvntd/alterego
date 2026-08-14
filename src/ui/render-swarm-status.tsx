import { render } from 'ink'
import React from 'react'
import type { SwarmResult } from '../core/swarm.js'
import { SwarmStatus, toRowState } from './SwarmStatus.jsx'

export async function renderSwarmStatus(result: SwarmResult): Promise<void> {
  const rows = result.windows.map(toRowState)

  if (result.browser.fellBackFrom) {
    console.log(`${result.browser.fellBackFrom} not found, falling back to ${result.browser.browser}`)
  }

  const instance = render(<SwarmStatus rows={rows} />)
  instance.unmount()
  await instance.waitUntilExit()
}
