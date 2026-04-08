import type { Tick } from './types'
import jpmData from './jpm-data.json'

const priceData: { date: string; price: number }[] = jpmData as { date: string; price: number }[]

/**
 * Load a slice of real JPM stock data (2008-2011) from the ML4T course dataset.
 * Shuffles the start index slightly on each call so restarts produce different windows.
 */
export function generateMarket(ticks: number): Tick[] {
  const safeTicks = Math.min(ticks, priceData.length)

  // Random start offset within the first 20% of the data to vary each run
  const maxOffset = Math.floor(priceData.length * 0.1)
  const offset = Math.floor(Math.random() * maxOffset)
  const end = Math.min(offset + safeTicks, priceData.length)

  const out: Tick[] = []
  for (let i = offset; i < end; i++) {
    const entry = priceData[i]!
    const price = entry.price

    // Classify regime from price action (rolling 20-day return)
    let regime: Tick['regime'] = 'sideways'
    if (i >= offset + 20) {
      const pastPrice = priceData[i - 20]!.price
      const ret20 = (price - pastPrice) / pastPrice
      const vol = computeLocalVol(priceData, i, 20)

      if (ret20 > 0.03 && vol < 0.025) regime = 'bull'
      else if (ret20 < -0.03 && vol < 0.025) regime = 'bear'
      else if (vol >= 0.025) regime = 'volatile'
      else regime = 'sideways'
    }

    out.push({ t: i - offset, price, regime })
  }

  return out
}

function computeLocalVol(data: { price: number }[], i: number, period: number): number {
  const returns: number[] = []
  const start = Math.max(0, i - period)
  for (let j = start + 1; j <= i; j++) {
    const prev = data[j - 1]!.price
    if (prev > 0) returns.push((data[j]!.price - prev) / prev)
  }
  if (returns.length < 2) return 0
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  return Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length)
}

export function getDataInfo(): { symbol: string; dateRange: string; totalBars: number } {
  const first = priceData[0]!
  const last = priceData[priceData.length - 1]!
  return {
    symbol: 'JPM',
    dateRange: `${first.date} to ${last.date}`,
    totalBars: priceData.length,
  }
}
