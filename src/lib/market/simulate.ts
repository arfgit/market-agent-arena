import type { Tick, Action, StrategyResult, IndicatorSet } from './types'
import { createPortfolio, step, sharpe } from './portfolio'
import { computeIndicators, makeThresholds } from '../indicators/compute'
import { manualDecision, explainManual } from '../learners/manual'
import { DecisionTree, dtreeDecision, explainDTree } from '../learners/dtree'
import { RandomForest, forestDecision, explainForest } from '../learners/forest'
import {
  createQLearner, qUpdate, indicatorToState, actionToTrade,
  getQValues, getExplorationRate, explainQLearner, NUM_BINS,
} from '../learners/qlearner'

export interface SimulationSnapshot {
  tick: number
  price: number
  regime: string
  indicators: IndicatorSet
  strategies: StrategyResult[]
  trainingProgress: number
}

/**
 * Run the full simulation: train learners on first half, test on full series.
 * Returns snapshots at each tick of the test phase.
 */
export function runSimulation(market: Tick[]): SimulationSnapshot[] {
  const prices = market.map((t) => t.price)
  const trainEnd = Math.floor(prices.length * 0.4)

  // === PHASE 1: Compute indicators for training data ===
  const trainIndicators: IndicatorSet[] = []
  const trainX: number[][] = []
  const trainY: number[] = []

  for (let i = 30; i < trainEnd - 1; i++) {
    const ind = computeIndicators(prices, i)
    trainIndicators.push(ind)
    trainX.push([ind.smaDistance, ind.bbp, ind.macdHist, ind.stochK, ind.roc])
    // Target: next-day return
    trainY.push((prices[i + 1]! - prices[i]!) / prices[i]!)
  }

  // === Compute indicator thresholds for Q-learner discretization ===
  const smaVals = trainIndicators.map((i) => i.smaDistance)
  const bbpVals = trainIndicators.map((i) => i.bbp)
  const macdVals = trainIndicators.map((i) => i.macdHist)
  const qThresholds = {
    sma: makeThresholds(smaVals, NUM_BINS),
    bbp: makeThresholds(bbpVals, NUM_BINS),
    macd: makeThresholds(macdVals, NUM_BINS),
  }

  // === PHASE 2: Train learners ===
  const dtree = new DecisionTree()
  dtree.train(trainX, trainY)

  const forest = new RandomForest(15)
  forest.train(trainX, trainY)

  // Q-learner: train over multiple epochs
  const qlearner = createQLearner()
  for (let epoch = 0; epoch < 5; epoch++) {
    for (let i = 30; i < trainEnd - 1; i++) {
      const ind = computeIndicators(prices, i)
      const state = indicatorToState(ind, qThresholds)
      const reward = (prices[i + 1]! - prices[i]!) / prices[i]!
      qUpdate(qlearner, state, reward * 100) // scale reward
    }
  }
  // Reset exploration for test phase
  qlearner.rar = 0.0

  // === PHASE 3: Run test phase (full series) ===
  const portfolios = {
    manual: createPortfolio(),
    dtree: createPortfolio(),
    forest: createPortfolio(),
    qlearner: createPortfolio(),
    benchmark: createPortfolio(),
  }

  // Benchmark buys on first tick and holds
  let benchmarkBought = false

  const snapshots: SimulationSnapshot[] = []

  for (let i = 30; i < prices.length; i++) {
    const price = prices[i]!
    const ind = computeIndicators(prices, i)
    const features = [ind.smaDistance, ind.bbp, ind.macdHist, ind.stochK, ind.roc]

    // Manual strategy
    const manualAction = manualDecision(ind, portfolios.manual.shares)
    step(portfolios.manual, manualAction, price)
    const manualExpl = explainManual(ind)

    // Decision tree
    const dtPred = dtree.predict(features)
    const dtAction = dtreeDecision(dtPred)
    step(portfolios.dtree, dtAction, price)
    const dtPath = dtree.getPath(features)
    const dtExpl = explainDTree(dtPath)

    // Random forest
    const forestPred = forest.predict(features)
    const forestAction = forestDecision(forestPred)
    step(portfolios.forest, forestAction, price)
    const votes = forest.getVotes(features)
    const forestExpl = explainForest(votes)

    // Q-learner
    const qState = indicatorToState(ind, qThresholds)
    const reward = i > 30 ? (price - prices[i - 1]!) / prices[i - 1]! * 100 : 0
    const qActionNum = qUpdate(qlearner, qState, reward)
    const qAction = actionToTrade(qActionNum)
    step(portfolios.qlearner, qAction, price)
    const qValues = getQValues(qlearner, qState)
    const qExpl = explainQLearner(qValues, getExplorationRate(qlearner), false)

    // Benchmark
    if (!benchmarkBought) {
      step(portfolios.benchmark, 'BUY', price)
      benchmarkBought = true
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
      tick: i - 30,
      price,
      regime: market[i]!.regime,
      indicators: ind,
      strategies: [
        makeResult('Manual Strategy', 'manual', portfolios.manual, manualAction, manualExpl),
        makeResult('Decision Tree', 'dtree', portfolios.dtree, dtAction, dtExpl),
        makeResult('Random Forest', 'forest', portfolios.forest, forestAction, forestExpl),
        makeResult('Q-Learner', 'qlearner', portfolios.qlearner, qAction, qExpl),
        makeResult('Buy & Hold', 'benchmark', portfolios.benchmark, benchmarkBought ? 'HOLD' : 'BUY', 'Passive benchmark'),
      ],
      trainingProgress: 1,
    })
  }

  return snapshots
}
