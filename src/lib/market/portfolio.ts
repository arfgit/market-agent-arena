import type { Portfolio, Action } from './types'

const COMMISSION = 9.95
const IMPACT = 0.005

export function createPortfolio(startCash: number = 100000): Portfolio {
  return {
    cash: startCash,
    shares: 0,
    equity: startCash,
    trades: 0,
    wins: 0,
    losses: 0,
    maxDrawdown: 0,
    peakEquity: startCash,
    equityCurve: [startCash],
    dailyReturns: [],
  }
}

export function step(p: Portfolio, action: Action, price: number, size: number = 1000): void {
  const prevEquity = p.equity

  if (action === 'BUY' && p.shares <= 0) {
    const target = size
    const delta = target - p.shares
    if (delta > 0) {
      const cost = delta * price * (1 + IMPACT) + COMMISSION
      if (cost <= p.cash) {
        p.cash -= cost
        p.shares = target
        p.trades++
      }
    }
  } else if (action === 'SELL' && p.shares >= 0) {
    const target = -size
    const delta = p.shares - target
    if (delta > 0) {
      const revenue = delta * price * (1 - IMPACT) - COMMISSION
      p.cash += revenue
      p.shares = target
      p.trades++
    }
  }

  p.equity = p.cash + p.shares * price
  p.equityCurve.push(p.equity)

  if (prevEquity !== 0) {
    const dailyRet = (p.equity - prevEquity) / prevEquity
    p.dailyReturns.push(dailyRet)
  }

  p.peakEquity = Math.max(p.peakEquity, p.equity)
  const dd = (p.peakEquity - p.equity) / p.peakEquity
  p.maxDrawdown = Math.max(p.maxDrawdown, dd)

  if (p.equity > prevEquity) p.wins++
  else if (p.equity < prevEquity) p.losses++
}

export function sharpe(returns: number[]): number {
  if (returns.length < 2) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length)
  if (std === 0) return 0
  return (mean / std) * Math.sqrt(252)
}
