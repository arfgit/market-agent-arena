import type { Action, IndicatorSet } from '../market/types'

/**
 * Manual rule-based strategy from ML4T ManualStrategy.py
 *
 * Buy when: price < SMA * 0.98 AND BBP < 0.2 AND MACD histogram > 0
 * Sell when: price > SMA * 1.02 AND BBP > 0.8 AND MACD histogram < 0
 *
 * The logic: oversold + momentum turning up = buy. Overbought + momentum turning down = sell.
 */
export function manualDecision(ind: IndicatorSet, _currentShares: number): Action {
  const buySignal = ind.smaDistance < -0.02 && ind.bbp < 0.2 && ind.macdHist > 0
  const sellSignal = ind.smaDistance > 0.02 && ind.bbp > 0.8 && ind.macdHist < 0

  if (buySignal) return 'BUY'
  if (sellSignal) return 'SELL'
  return 'HOLD'
}

export function explainManual(ind: IndicatorSet): string {
  const parts: string[] = []

  if (ind.smaDistance < -0.02) parts.push('Price below SMA (oversold)')
  else if (ind.smaDistance > 0.02) parts.push('Price above SMA (overbought)')
  else parts.push('Price near SMA')

  if (ind.bbp < 0.2) parts.push('BBP low (near lower band)')
  else if (ind.bbp > 0.8) parts.push('BBP high (near upper band)')

  if (ind.macdHist > 0) parts.push('MACD bullish')
  else if (ind.macdHist < 0) parts.push('MACD bearish')

  return parts.join(' | ')
}
