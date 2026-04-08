import type { IndicatorSet } from '../market/types'

function sma(prices: number[], period: number, i: number): number {
  if (i < period - 1) return prices[i]!
  let sum = 0
  for (let j = i - period + 1; j <= i; j++) sum += prices[j]!
  return sum / period
}

function stddev(prices: number[], period: number, i: number, mean: number): number {
  if (i < period - 1) return 0
  let sum = 0
  for (let j = i - period + 1; j <= i; j++) sum += (prices[j]! - mean) ** 2
  return Math.sqrt(sum / period)
}

function ema(prices: number[], period: number, end: number): number {
  const k = 2 / (period + 1)
  let val = prices[0]!
  for (let j = 1; j <= end; j++) val = prices[j]! * k + val * (1 - k)
  return val
}

function emaOfSeries(series: number[], period: number): number {
  if (series.length === 0) return 0
  const k = 2 / (period + 1)
  let val = series[0]!
  for (let i = 1; i < series.length; i++) val = series[i]! * k + val * (1 - k)
  return val
}

// Minimum bar index for reliable indicators (26 EMA warmup + 9 signal warmup)
export const WARMUP = 52

export function computeIndicators(prices: number[], i: number): IndicatorSet {
  const sma20 = sma(prices, 20, i)
  const smaDistance = sma20 !== 0 ? (prices[i]! - sma20) / sma20 : 0

  const bbStd = stddev(prices, 20, i, sma20)
  const upper = sma20 + 2 * bbStd
  const lower = sma20 - 2 * bbStd
  const bbp = upper !== lower ? (prices[i]! - lower) / (upper - lower) : 0.5

  let macdHist = 0
  if (i >= WARMUP) {
    const ema12 = ema(prices, 12, i)
    const ema26 = ema(prices, 26, i)
    const macdLine = ema12 - ema26

    const macdSeries: number[] = []
    for (let j = 25; j <= i; j++) {
      const e12 = ema(prices, 12, j)
      const e26 = ema(prices, 26, j)
      macdSeries.push(e12 - e26)
    }
    const signal = emaOfSeries(macdSeries, 9)
    macdHist = macdLine - signal
  }

  const lookback = Math.min(14, i + 1)
  let high14 = -Infinity, low14 = Infinity
  for (let j = i - lookback + 1; j <= i; j++) {
    if (prices[j]! > high14) high14 = prices[j]!
    if (prices[j]! < low14) low14 = prices[j]!
  }
  const stochK = high14 !== low14 ? (prices[i]! - low14) / (high14 - low14) : 0.5

  const rocPeriod = 12
  const rocBase = i >= rocPeriod ? prices[i - rocPeriod]! : prices[0]!
  const roc = rocBase !== 0 ? (prices[i]! - rocBase) / rocBase : 0

  return { smaDistance, bbp, macdHist, stochK, roc }
}

export function discretize(value: number, thresholds: number[]): number {
  for (let i = 0; i < thresholds.length; i++) {
    if (value < thresholds[i]!) return i
  }
  return thresholds.length
}

export function makeThresholds(values: number[], numBins: number): number[] {
  const sorted = [...values].sort((a, b) => a - b)
  const thresholds: number[] = []
  for (let i = 1; i < numBins; i++) {
    const idx = Math.floor((i / numBins) * sorted.length)
    thresholds.push(sorted[idx]!)
  }
  return thresholds
}
