import type { Portfolio, Action } from './types'

const COMMISSION = 9.95
const IMPACT = 0.001

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

export function step(p: Portfolio, action: Action, price: number, size: number = 1000): boolean {
  const prevEquity = p.equity
  let traded = false

  if (action === 'BUY' && p.shares <= 0) {
    const target = size
    const delta = target - p.shares
    if (delta > 0) {
      const cost = delta * price * (1 + IMPACT) + COMMISSION
      if (cost <= p.cash) {
        p.cash -= cost
        p.shares = target
        p.trades++
        traded = true
      }
    }
  } else if (action === 'SELL' && p.shares > 0) {
    const revenue = p.shares * price * (1 - IMPACT) - COMMISSION
    p.cash += revenue

    // Track win/loss based on whether equity improved after closing
    const newEquity = p.cash
    if (newEquity > prevEquity) p.wins++
    else if (newEquity < prevEquity) p.losses++

    p.shares = 0
    p.trades++
    traded = true
  }

  p.equity = p.cash + p.shares * price
  p.equityCurve.push(p.equity)

  if (prevEquity > 0) {
    const dailyRet = (p.equity - prevEquity) / prevEquity
    p.dailyReturns.push(dailyRet)
  }

  if (p.peakEquity > 0) {
    p.peakEquity = Math.max(p.peakEquity, p.equity)
    const dd = (p.peakEquity - p.equity) / p.peakEquity
    p.maxDrawdown = Math.max(p.maxDrawdown, dd)
  }

  return traded
}

export function sharpe(returns: number[]): number {
  if (returns.length < 2) return 0
  const n = returns.length
  const mean = returns.reduce((a, b) => a + b, 0) / n
  const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1))
  if (std === 0) return 0
  return (mean / std) * Math.sqrt(252)
}
