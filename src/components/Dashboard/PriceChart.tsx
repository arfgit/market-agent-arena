import { useMemo } from 'react'
import type { SimulationSnapshot } from '@/lib/market/simulate'

const REGIME_BG: Record<string, string> = {
  bull: 'rgba(74,222,128,0.05)',
  bear: 'rgba(248,113,113,0.05)',
  sideways: 'rgba(113,113,122,0.03)',
  volatile: 'rgba(251,191,36,0.05)',
}

const REGIME_TAG: Record<string, string> = { bull: 'BULL', bear: 'BEAR', sideways: 'FLAT', volatile: 'VOL' }
const REGIME_COLOR: Record<string, string> = { bull: 'text-success', bear: 'text-danger', sideways: 'text-text-muted', volatile: 'text-warning' }

interface Props {
  history: SimulationSnapshot[]
  snapshot: SimulationSnapshot | null
  isRunning: boolean
  isTraining: boolean
}

export default function PriceChart({ history, snapshot, isRunning, isTraining }: Props) {
  const chartData = useMemo(() => {
    if (history.length < 2) return null

    const prices = history.map((h) => h.price)
    const regimes = history.map((h) => h.regime)
    const W = 800, H = 120
    const pad = { t: 6, b: 16 }
    const cH = H - pad.t - pad.b
    const n = prices.length

    let min = prices[0]!, max = prices[0]!
    for (const p of prices) { if (p < min) min = p; if (p > max) max = p }
    const range = max - min || 1

    // Price line
    const pts = prices.map((p, i) => {
      const x = (i / (n - 1)) * W
      const y = pad.t + cH - ((p - min) / range) * cH
      return `${x},${y}`
    }).join(' ')

    // SMA20 + Bollinger bands (precomputed)
    const smaLine: string[] = []
    const upperBand: string[] = []
    const lowerBand: string[] = []

    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - 19)
      let sum = 0
      const count = i - start + 1
      for (let j = start; j <= i; j++) sum += prices[j]!
      const smaVal = sum / count

      let variance = 0
      for (let j = start; j <= i; j++) variance += (prices[j]! - smaVal) ** 2
      const std = Math.sqrt(variance / count)

      const x = (i / (n - 1)) * W
      smaLine.push(`${x},${pad.t + cH - ((smaVal - min) / range) * cH}`)
      upperBand.push(`${x},${pad.t + cH - ((smaVal + 2 * std - min) / range) * cH}`)
      lowerBand.push(`${x},${pad.t + cH - ((smaVal - 2 * std - min) / range) * cH}`)
    }

    const bbFill = [...upperBand, ...[...lowerBand].reverse()].join(' ')

    // Regime bands
    const bands: { x1: number; x2: number; regime: string }[] = []
    let bStart = 0, curRegime = regimes[0]!
    for (let i = 1; i < n; i++) {
      if (regimes[i] !== curRegime) {
        bands.push({ x1: (bStart / (n - 1)) * W, x2: (i / (n - 1)) * W, regime: curRegime })
        bStart = i
        curRegime = regimes[i]!
      }
    }
    bands.push({ x1: (bStart / (n - 1)) * W, x2: ((n - 1) / (n - 1)) * W, regime: curRegime })

    const first = prices[0]!
    const last = prices[n - 1]!
    const isUp = last >= first
    const totalRet = ((last - first) / first * 100).toFixed(2)

    return { pts, smaLine: smaLine.join(' '), bbFill, bands, isUp, totalRet, last, W, H, pad, cH }
  }, [history])

  if (!snapshot || !chartData) {
    return (
      <div className="rounded-lg border border-border bg-bg-secondary/30 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-2 h-5">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-text-muted" />
            <span className="text-[10px] text-text-muted tracking-wide">JPM</span>
          </div>
        </div>
        <div className="h-[120px] flex items-center justify-center">
          <span className="text-[10px] text-text-muted animate-pulse">
            {isTraining ? 'Training learners...' : 'Initializing...'}
          </span>
        </div>
        <div className="h-4 mt-1.5" />
      </div>
    )
  }

  const regimeTag = REGIME_TAG[snapshot.regime] ?? ''
  const regimeColorClass = REGIME_COLOR[snapshot.regime] ?? 'text-text-muted'

  return (
    <div className="rounded-lg border border-border bg-bg-secondary/30 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
          <span className="text-[10px] text-text-muted tracking-wide">JPM</span>
          <span className="text-[10px] text-text-muted tabular-nums">{snapshot.date}</span>
        </div>
        <div className="flex items-center gap-3 text-[10px]">
          <span className={`font-semibold ${regimeColorClass}`}>{regimeTag}</span>
          <span className={`font-semibold tabular-nums ${chartData.isUp ? 'text-success' : 'text-danger'}`}>
            ${chartData.last.toFixed(2)} ({chartData.isUp ? '+' : ''}{chartData.totalRet}%)
          </span>
        </div>
      </div>

      <svg width="100%" height={chartData.H} viewBox={`0 0 ${chartData.W} ${chartData.H}`} preserveAspectRatio="none" className="overflow-visible">
        {chartData.bands.map((b, i) => (
          <rect key={i} x={b.x1} y={chartData.pad.t} width={b.x2 - b.x1} height={chartData.cH} fill={REGIME_BG[b.regime] ?? 'transparent'} />
        ))}
        <polygon points={chartData.bbFill} fill="rgba(167,139,250,0.04)" />
        <polyline points={chartData.smaLine} fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="1" strokeDasharray="3,3" />
        <polyline points={chartData.pts} fill="none" stroke={chartData.isUp ? 'var(--color-success)' : 'var(--color-danger)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="flex items-center gap-4 mt-1.5 text-[8px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-[1px] inline-block border-t border-dashed border-accent/30" />
          SMA20
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 bg-accent/5 inline-block rounded-sm" />
          BB
        </span>
      </div>
    </div>
  )
}
