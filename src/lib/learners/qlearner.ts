import type { Action, IndicatorSet } from '../market/types'
import { discretize, makeThresholds } from '../indicators/compute'

/**
 * Q-Learner from ML4T QLearner.py / StrategyLearner.py
 *
 * Uses three indicators (SMA distance, BBP, MACD hist) discretized into 6 bins each.
 * Total states: 6 * 6 * 6 = 216
 * Actions: 0=SELL, 1=HOLD, 2=BUY
 *
 * Q-update: Q[s,a] = (1-alpha)*Q[s,a] + alpha*(r + gamma*max(Q[s',*]))
 * Exploration: random action with probability rar, decaying by radr each step
 */

const NUM_BINS = 6
const NUM_ACTIONS = 3
const NUM_STATES = NUM_BINS ** 3

export interface QState {
  qtable: Float64Array
  rar: number
  lastState: number
  lastAction: number
  totalUpdates: number
}

export function createQLearner(): QState {
  return {
    qtable: new Float64Array(NUM_STATES * NUM_ACTIONS),
    rar: 0.5,
    lastState: 0,
    lastAction: 1,
    totalUpdates: 0,
  }
}

function qIdx(state: number, action: number): number {
  return state * NUM_ACTIONS + action
}

function bestAction(q: QState, state: number): number {
  let best = 0
  let bestVal = q.qtable[qIdx(state, 0)]!
  for (let a = 1; a < NUM_ACTIONS; a++) {
    const val = q.qtable[qIdx(state, a)]!
    if (val > bestVal) {
      bestVal = val
      best = a
    }
  }
  return best
}

const ALPHA = 0.2
const GAMMA = 0.9
const RADR = 0.997

export function qUpdate(q: QState, newState: number, reward: number): number {
  const oldQ = q.qtable[qIdx(q.lastState, q.lastAction)]!
  const maxFutureQ = Math.max(
    q.qtable[qIdx(newState, 0)]!,
    q.qtable[qIdx(newState, 1)]!,
    q.qtable[qIdx(newState, 2)]!
  )
  q.qtable[qIdx(q.lastState, q.lastAction)] =
    (1 - ALPHA) * oldQ + ALPHA * (reward + GAMMA * maxFutureQ)

  let action: number
  if (Math.random() < q.rar) {
    action = Math.floor(Math.random() * NUM_ACTIONS)
  } else {
    action = bestAction(q, newState)
  }

  q.rar *= RADR
  q.lastState = newState
  q.lastAction = action
  q.totalUpdates++

  return action
}

/** Exploit-only: pick best action without updating Q-table */
export function qExploit(q: QState, state: number): number {
  return bestAction(q, state)
}

export function indicatorToState(
  ind: IndicatorSet,
  thresholds: { sma: number[]; bbp: number[]; macd: number[] }
): number {
  const s1 = discretize(ind.smaDistance, thresholds.sma)
  const s2 = discretize(ind.bbp, thresholds.bbp)
  const s3 = discretize(ind.macdHist, thresholds.macd)
  return s1 * NUM_BINS * NUM_BINS + s2 * NUM_BINS + s3
}

export function actionToTrade(action: number): Action {
  if (action === 0) return 'SELL'
  if (action === 2) return 'BUY'
  return 'HOLD'
}

export function getQValues(q: QState, state: number): { sell: number; hold: number; buy: number } {
  return {
    sell: q.qtable[qIdx(state, 0)]!,
    hold: q.qtable[qIdx(state, 1)]!,
    buy: q.qtable[qIdx(state, 2)]!,
  }
}

export function getExplorationRate(q: QState): number {
  return q.rar
}

export function explainQLearner(
  qValues: { sell: number; hold: number; buy: number },
  explorationRate: number
): string {
  const parts = [
    `Q[sell]=${qValues.sell.toFixed(2)}`,
    `Q[hold]=${qValues.hold.toFixed(2)}`,
    `Q[buy]=${qValues.buy.toFixed(2)}`,
    `explore=${(explorationRate * 100).toFixed(1)}%`,
  ]
  return parts.join(' | ')
}

export { NUM_BINS, makeThresholds }
