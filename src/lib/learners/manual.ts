import type { Action, IndicatorSet } from '../market/types'

/**
 * Manual rule-based strategy from ML4T ManualStrategy.py
 *
 * Buy when: SMA distance < -0.02 AND BBP < 0.2 AND MACD histogram > 0
 * Sell when: SMA distance > 0.02 AND BBP > 0.8 AND MACD histogram < 0
 *
 * On real data these thresholds fire infrequently because all three must align.
 * We also add a secondary signal: if two of three conditions agree, act.
 */
export function manualDecision(ind: IndicatorSet, currentShares: number): Action {
  // Strong signals: all three agree
  const strongBuy = ind.smaDistance < -0.02 && ind.bbp < 0.2 && ind.macdHist > 0
  const strongSell = ind.smaDistance > 0.02 && ind.bbp > 0.8 && ind.macdHist < 0

  if (strongBuy && currentShares <= 0) return 'BUY'
  if (strongSell && currentShares > 0) return 'SELL'

  // Moderate signals: two of three agree
  const buySignals = (ind.smaDistance < -0.015 ? 1 : 0) + (ind.bbp < 0.25 ? 1 : 0) + (ind.macdHist > 0 ? 1 : 0)
  const sellSignals = (ind.smaDistance > 0.015 ? 1 : 0) + (ind.bbp > 0.75 ? 1 : 0) + (ind.macdHist < 0 ? 1 : 0)

  if (buySignals >= 2 && currentShares <= 0) return 'BUY'
  if (sellSignals >= 2 && currentShares > 0) return 'SELL'

  return 'HOLD'
}

export function explainManual(ind: IndicatorSet): string {
  const parts: string[] = []

  if (ind.smaDistance < -0.02) parts.push('Price below SMA (oversold)')
  else if (ind.smaDistance > 0.02) parts.push('Price above SMA (overbought)')
  else parts.push('Price near SMA')

  if (ind.bbp < 0.2) parts.push('BBP low')
  else if (ind.bbp > 0.8) parts.push('BBP high')

  if (ind.macdHist > 0) parts.push('MACD bullish')
  else if (ind.macdHist < 0) parts.push('MACD bearish')

  return parts.join(' | ')
}
