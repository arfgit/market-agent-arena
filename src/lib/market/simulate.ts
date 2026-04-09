import type { Tick, Action, StrategyResult, IndicatorSet } from './types'
import { createPortfolio, step, sharpe } from './portfolio'
import { computeIndicators, makeThresholds, WARMUP } from '../indicators/compute'
import { manualDecision, explainManual } from '../learners/manual'
import { DecisionTree, dtreeDecision, explainDTree } from '../learners/dtree'
import { RandomForest, forestDecision, explainForest } from '../learners/forest'
import {
  createQLearner, qUpdate, qExploit, indicatorToState, actionToTrade,
  getQValues, getExplorationRate, explainQLearner, NUM_BINS,
} from '../learners/qlearner'

export interface SimulationSnapshot {
  tick: number
  price: number
  date: string
  regime: string
  indicators: IndicatorSet
  strategies: StrategyResult[]
  trainingProgress: number
}

interface Signal {
  tick: number
  action: Action
  strength: number
  explanation: string
}

const MAX_TRADES = 1000

export function runSimulation(market: Tick[]): SimulationSnapshot[] {
  const prices = market.map((t) => t.price)
  const trainEnd = Math.floor(prices.length * 0.65)
  const testLen = prices.length - trainEnd

  // === PHASE 1: Training data ===
  const trainX: number[][] = []
  const trainY: number[] = []
  const trainSma: number[] = []
  const trainBbp: number[] = []
  const trainMacd: number[] = []

  for (let i = WARMUP; i < trainEnd - 1; i++) {
    const ind = computeIndicators(prices, i)
    trainX.push([ind.smaDistance, ind.bbp, ind.macdHist, ind.stochK, ind.roc])
    trainY.push((prices[i + 1]! - prices[i]!) / prices[i]!)
    trainSma.push(ind.smaDistance)
    trainBbp.push(ind.bbp)
    trainMacd.push(ind.macdHist)
  }

  const qThresholds = {
    sma: makeThresholds(trainSma, NUM_BINS),
    bbp: makeThresholds(trainBbp, NUM_BINS),
    macd: makeThresholds(trainMacd, NUM_BINS),
  }

  // === PHASE 2: Train ===
  const dtree = new DecisionTree()
  if (trainX.length > 0) dtree.train(trainX, trainY)

  const forest = new RandomForest(15)
  if (trainX.length > 0) forest.train(trainX, trainY)

  const qlearner = createQLearner()
  for (let epoch = 0; epoch < 20; epoch++) {
    for (let i = WARMUP; i < trainEnd - 1; i++) {
      const ind = computeIndicators(prices, i)
      const state = indicatorToState(ind, qThresholds)
      const reward = (prices[i + 1]! - prices[i]!) / prices[i]!
      qUpdate(qlearner, state, reward * 100)
    }
  }

  // === PHASE 3: Generate all signals first (dry run) ===
  const allIndicators: IndicatorSet[] = []
  const allFeatures: number[][] = []
  const manualSignals: Signal[] = []
  const dtreeSignals: Signal[] = []
  const forestSignals: Signal[] = []
  const qlearnerSignals: Signal[] = []

  for (let i = trainEnd; i < prices.length; i++) {
    const tick = i - trainEnd
    const ind = computeIndicators(prices, i)
    const features = [ind.smaDistance, ind.bbp, ind.macdHist, ind.stochK, ind.roc]
    allIndicators.push(ind)
    allFeatures.push(features)

    // Manual: strength = how many indicators agree
    const mAction = manualDecision(ind, 0)
    if (mAction !== 'HOLD') {
      const buyStr = (ind.smaDistance < -0.015 ? 1 : 0) + (ind.bbp < 0.25 ? 1 : 0) + (ind.macdHist > 0 ? 1 : 0)
      const sellStr = (ind.smaDistance > 0.015 ? 1 : 0) + (ind.bbp > 0.75 ? 1 : 0) + (ind.macdHist < 0 ? 1 : 0)
      manualSignals.push({ tick, action: mAction, strength: mAction === 'BUY' ? buyStr : sellStr, explanation: explainManual(ind) })
    }

    // DTree: strength = absolute prediction magnitude
    const dtPred = dtree.predict(features)
    const dtAction = dtreeDecision(dtPred)
    if (dtAction !== 'HOLD') {
      dtreeSignals.push({ tick, action: dtAction, strength: Math.abs(dtPred), explanation: explainDTree(dtree.getPath(features)) })
    }

    // Forest: strength = absolute averaged prediction
    const forestPred = forest.predict(features)
    const forestAction = forestDecision(forestPred)
    if (forestAction !== 'HOLD') {
      forestSignals.push({ tick, action: forestAction, strength: Math.abs(forestPred), explanation: explainForest(forest.getVotes(features)) })
    }

    // Q-Learner: strength = Q-value gap between best and second-best
    const qState = indicatorToState(ind, qThresholds)
    const qActionNum = qExploit(qlearner, qState)
    const qAction = actionToTrade(qActionNum)
    if (qAction !== 'HOLD') {
      const qv = getQValues(qlearner, qState)
      const vals = [qv.sell, qv.hold, qv.buy].sort((a, b) => b - a)
      const gap = vals[0]! - vals[1]!
      qlearnerSignals.push({ tick, action: qAction, strength: gap, explanation: explainQLearner(qv, getExplorationRate(qlearner)) })
    }
  }

  // === PHASE 4: Pick top MAX_TRADES signals per strategy by strength ===
  function pickTopSignals(signals: Signal[]): Set<number> {
    const sorted = [...signals].sort((a, b) => b.strength - a.strength)
    const picked = new Set<number>()
    for (const s of sorted) {
      if (picked.size >= MAX_TRADES) break
      picked.add(s.tick)
    }
    return picked
  }

  const manualTrades = pickTopSignals(manualSignals)
  const dtreeTrades = pickTopSignals(dtreeSignals)
  const forestTrades = pickTopSignals(forestSignals)
  const qlearnerTrades = pickTopSignals(qlearnerSignals)

  // Build lookup maps for explanations
  const manualExplMap = new Map(manualSignals.map((s) => [s.tick, s]))
  const dtreeExplMap = new Map(dtreeSignals.map((s) => [s.tick, s]))
  const forestExplMap = new Map(forestSignals.map((s) => [s.tick, s]))
  const qlearnerExplMap = new Map(qlearnerSignals.map((s) => [s.tick, s]))

  // === PHASE 5: Execute trades and build snapshots ===
  const portfolios = {
    manual: createPortfolio(),
    dtree: createPortfolio(),
    forest: createPortfolio(),
    qlearner: createPortfolio(),
    benchmark: createPortfolio(),
  }

  let benchmarkBought = false
  const snapshots: SimulationSnapshot[] = []

  for (let t = 0; t < testLen; t++) {
    const i = trainEnd + t
    const price = prices[i]!
    const ind = allIndicators[t]!

    // Execute only if this tick is in the strategy's top signals
    const mSig = manualTrades.has(t) ? manualExplMap.get(t)! : null
    const manualAction: Action = mSig ? mSig.action : 'HOLD'
    step(portfolios.manual, manualAction, price)
    const manualExpl = mSig ? mSig.explanation : explainManual(ind)

    const dtSig = dtreeTrades.has(t) ? dtreeExplMap.get(t)! : null
    const dtAction: Action = dtSig ? dtSig.action : 'HOLD'
    step(portfolios.dtree, dtAction, price)
    const dtExpl = dtSig ? dtSig.explanation : 'Holding (not in top signals)'

    const fSig = forestTrades.has(t) ? forestExplMap.get(t)! : null
    const forestAction: Action = fSig ? fSig.action : 'HOLD'
    step(portfolios.forest, forestAction, price)
    const forestExpl = fSig ? fSig.explanation : 'Holding (not in top signals)'

    const qSig = qlearnerTrades.has(t) ? qlearnerExplMap.get(t)! : null
    const qAction: Action = qSig ? qSig.action : 'HOLD'
    step(portfolios.qlearner, qAction, price)
    const qExpl = qSig ? qSig.explanation : 'Holding (not in top signals)'

    let benchAction: Action = 'HOLD'
    if (!benchmarkBought) {
      benchAction = 'BUY'
      const success = step(portfolios.benchmark, 'BUY', price)
      if (success) benchmarkBought = true
    } else {
      step(portfolios.benchmark, 'HOLD', price)
    }

    const makeResult = (
      name: string,
      type: StrategyResult['type'],
      p: typeof portfolios.manual,
      action: Action,
      explanation: string
    ): StrategyResult => ({
      name,
      type,
      portfolio: { ...p, equityCurve: [...p.equityCurve], dailyReturns: [...p.dailyReturns] },
      actions: [action],
      totalReturn: ((p.equity - 100000) / 100000) * 100,
      sharpe: sharpe(p.dailyReturns),
      explanation: [explanation],
    })

    snapshots.push({
      tick: t,
      price,
      date: market[i]!.date,
      regime: market[i]!.regime,
      indicators: ind,
      strategies: [
        makeResult('Manual Strategy', 'manual', portfolios.manual, manualAction, manualExpl),
        makeResult('Decision Tree', 'dtree', portfolios.dtree, dtAction, dtExpl),
        makeResult('Random Forest', 'forest', portfolios.forest, forestAction, forestExpl),
        makeResult('Q-Learner', 'qlearner', portfolios.qlearner, qAction, qExpl),
        makeResult('Buy & Hold', 'benchmark', portfolios.benchmark, benchAction, 'Passive benchmark'),
      ],
      trainingProgress: 1,
    })
  }

  return snapshots
}
