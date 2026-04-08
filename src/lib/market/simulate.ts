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
  regime: string
  indicators: IndicatorSet
  strategies: StrategyResult[]
  trainingProgress: number
}

export function runSimulation(market: Tick[]): SimulationSnapshot[] {
  const prices = market.map((t) => t.price)
  // Train on first 65% (matches ML4T in-sample convention)
  const trainEnd = Math.floor(prices.length * 0.65)

  // === PHASE 1: Compute training data ===
  const trainX: number[][] = []
  const trainY: number[] = []
  const trainSma: number[] = []
  const trainBbp: number[] = []
  const trainMacd: number[] = []

  for (let i = WARMUP; i < trainEnd - 1; i++) {
    const ind = computeIndicators(prices, i)
    trainX.push([ind.smaDistance, ind.bbp, ind.macdHist, ind.stochK, ind.roc])
    // Target: next-day return
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

  // === PHASE 3: Out-of-sample test ===
  const portfolios = {
    manual: createPortfolio(),
    dtree: createPortfolio(),
    forest: createPortfolio(),
    qlearner: createPortfolio(),
    benchmark: createPortfolio(),
  }

  let benchmarkBought = false
  const snapshots: SimulationSnapshot[] = []

  for (let i = trainEnd; i < prices.length; i++) {
    const price = prices[i]!
    const ind = computeIndicators(prices, i)
    const features = [ind.smaDistance, ind.bbp, ind.macdHist, ind.stochK, ind.roc]

    const manualAction = manualDecision(ind, portfolios.manual.shares)
    step(portfolios.manual, manualAction, price)
    const manualExpl = explainManual(ind)

    const dtPred = dtree.predict(features)
    const dtAction = dtreeDecision(dtPred)
    step(portfolios.dtree, dtAction, price)
    const dtPath = dtree.getPath(features)
    const dtExpl = explainDTree(dtPath)

    const forestPred = forest.predict(features)
    const forestAction = forestDecision(forestPred)
    step(portfolios.forest, forestAction, price)
    const votes = forest.getVotes(features)
    const forestExpl = explainForest(votes)

    const qState = indicatorToState(ind, qThresholds)
    const qActionNum = qExploit(qlearner, qState)
    const qAction = actionToTrade(qActionNum)
    step(portfolios.qlearner, qAction, price)
    const qValues = getQValues(qlearner, qState)
    const qExpl = explainQLearner(qValues, getExplorationRate(qlearner))

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
      tick: i - trainEnd,
      price,
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
