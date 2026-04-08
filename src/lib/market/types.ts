export type Action = 'BUY' | 'SELL' | 'HOLD'

export type Regime = 'bull' | 'bear' | 'sideways' | 'volatile'

export interface Tick {
  t: number
  price: number
  regime: Regime
}

export interface IndicatorSet {
  smaDistance: number
  bbp: number
  macdHist: number
  stochK: number
  roc: number
}

export interface Portfolio {
  cash: number
  shares: number
  equity: number
  trades: number
  wins: number
  losses: number
  maxDrawdown: number
  peakEquity: number
  equityCurve: number[]
  dailyReturns: number[]
}

export interface StrategyResult {
  name: string
  type: 'manual' | 'dtree' | 'forest' | 'qlearner' | 'benchmark'
  portfolio: Portfolio
  actions: Action[]
  totalReturn: number
  sharpe: number
  explanation: string[]
}
