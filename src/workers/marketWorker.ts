import { generateMarket } from '../lib/market/generate'
import { runSimulation } from '../lib/market/simulate'
import type { SimulationSnapshot } from '../lib/market/simulate'

interface StartMessage { type: 'start'; ticks: number }
interface ControlMessage { type: 'pause' | 'resume' | 'newMarket' }
type IncomingMessage = StartMessage | ControlMessage

export interface TickMessage {
  type: 'tick'
  snapshot: SimulationSnapshot
  totalTicks: number
  isComplete: boolean
}

export interface TrainMessage {
  type: 'training'
  progress: number
}

let running = false
let paused = false
let snapshots: SimulationSnapshot[] = []
let cursor = 0
let ticks = 250

function streamTicks() {
  if (!running || paused) return

  if (cursor < snapshots.length) {
    const snapshot = snapshots[cursor]!
    self.postMessage({
      type: 'tick',
      snapshot,
      totalTicks: snapshots.length,
      isComplete: cursor === snapshots.length - 1,
    } satisfies TickMessage)

    cursor++
    const delay = cursor < 10 ? 50 : 150 // fast start, then slower
    setTimeout(streamTicks, delay)
  } else {
    // Simulation done, generate new market after a pause
    setTimeout(() => {
      if (running && !paused) {
        startNewSimulation()
      }
    }, 3000)
  }
}

function startNewSimulation() {
  self.postMessage({ type: 'training', progress: 0 } satisfies TrainMessage)

  const market = generateMarket(ticks)

  self.postMessage({ type: 'training', progress: 0.5 } satisfies TrainMessage)

  snapshots = runSimulation(market)
  cursor = 0

  self.postMessage({ type: 'training', progress: 1 } satisfies TrainMessage)

  streamTicks()
}

self.onmessage = (e: MessageEvent<IncomingMessage>) => {
  const msg = e.data

  switch (msg.type) {
    case 'start':
      ticks = msg.ticks
      running = true
      paused = false
      startNewSimulation()
      break

    case 'pause':
      paused = true
      break

    case 'resume':
      if (paused) {
        paused = false
        streamTicks()
      }
      break

    case 'newMarket':
      cursor = snapshots.length // stop current stream
      startNewSimulation()
      break
  }
}
