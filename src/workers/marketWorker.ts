import { generateMarket } from '../lib/market/generate'
import { runSimulation } from '../lib/market/simulate'
import type { SimulationSnapshot } from '../lib/market/simulate'

interface StartMessage { type: 'start'; ticks: number }
interface ControlMessage { type: 'pause' | 'resume' }
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
let streamTimer: ReturnType<typeof setTimeout> | null = null

function cancelStream() {
  if (streamTimer !== null) {
    clearTimeout(streamTimer)
    streamTimer = null
  }
}

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
    const delay = cursor < 10 ? 50 : 150
    streamTimer = setTimeout(streamTicks, delay)
  }
  // Done — stay on final state
}

self.onmessage = (e: MessageEvent<IncomingMessage>) => {
  const msg = e.data

  switch (msg.type) {
    case 'start': {
      const ticks = Math.max(50, Math.min(500, msg.ticks))
      running = true
      paused = false
      cancelStream()

      self.postMessage({ type: 'training', progress: 0 } satisfies TrainMessage)

      const market = generateMarket(ticks)
      self.postMessage({ type: 'training', progress: 0.5 } satisfies TrainMessage)

      snapshots = runSimulation(market)
      cursor = 0
      self.postMessage({ type: 'training', progress: 1 } satisfies TrainMessage)

      streamTicks()
      break
    }

    case 'pause':
      paused = true
      cancelStream()
      break

    case 'resume':
      if (paused) {
        paused = false
        streamTicks()
      }
      break
  }
}
