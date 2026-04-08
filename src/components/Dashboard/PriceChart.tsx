import type { SimulationSnapshot } from '@/lib/market/simulate'

const REGIME_BG: Record<string, string> = {
  bull: 'rgba(52,211,153,0.06)',
  bear: 'rgba(248,113,113,0.06)',
  sideways: 'rgba(138,138,147,0.03)',
  volatile: 'rgba(251,191,36,0.06)',
}

const REGIME_TAG: Record<string, string> = { bull: 'BULL', bear: 'BEAR', sideways: 'FLAT', volatile: 'VOL' }
const REGIME_COLOR: Record<string, string> = { bull: 'text-success', bear: 'text-danger', sideways: 'text-text-muted', volatile: 'text-warning' }

interface Props {
  history: SimulationSnapshot[]
  snapshot: SimulationSnapshot | null
  isRunning: boolean
  isTraining: boolean
  generation: number
}

export default function PriceChart({ history, snapshot, isRunning, isTraining, generation }: Props) {
  if (!snapshot) {
    return (
      <div className="rounded-lg border border-border bg-bg-secondary/40 p-4 h-[180px] flex items-center justify-center">
        <span className="text-xs font-mono text-text-muted animate-pulse">
          {isTraining ? 'Training learners on historical data...' : 'Initializing market...'}
        </span>
      </div>
    )
  }

  const prices = history.map((h) => h.price)
  const W = 800
  const H = 120
  const pad = { t: 6, b: 16, l: 0, r: 0 }
  const cW = W - pad.l - pad.r
  const cH = H - pad.t - pad.b

  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1

  // Price line
  const pts = prices.map((p, i) => {
    const x = pad.l + (i / Math.max(1, prices.length - 1)) * cW
    const y = pad.t + cH - ((p - min) / range) * cH
    return `${x},${y}`
  }).join(' ')

  // Indicator overlay: SMA20 (from indicators.shortMA equivalent)
  // We'll draw a subtle SMA line using a running average of prices
  const smaLine: string[] = []
  for (let i = 0; i < prices.length; i++) {
    const start = Math.max(0, i - 19)
    let sum = 0
    for (let j = start; j <= i; j++) sum += prices[j]!
    const smaVal = sum / (i - start + 1)
    const x = pad.l + (i / Math.max(1, prices.length - 1)) * cW
    const y = pad.t + cH - ((smaVal - min) / range) * cH
    smaLine.push(`${x},${y}`)
  }

  // Regime bands
  const bands: { x1: number; x2: number; regime: string }[] = []
  let bStart = 0
  let curRegime = history[0]?.regime ?? 'sideways'
  for (let i = 1; i < history.length; i++) {
    if (history[i]!.regime !== curRegime) {
      bands.push({
        x1: pad.l + (bStart / Math.max(1, prices.length - 1)) * cW,
        x2: pad.l + (i / Math.max(1, prices.length - 1)) * cW,
        regime: curRegime,
      })
      bStart = i
      curRegime = history[i]!.regime
    }
  }
  bands.push({
    x1: pad.l + (bStart / Math.max(1, prices.length - 1)) * cW,
    x2: pad.l + ((prices.length - 1) / Math.max(1, prices.length - 1)) * cW,
    regime: curRegime,
  })

  const firstPrice = prices[0]!
  const lastPrice = prices[prices.length - 1]!
  const totalRet = ((lastPrice - firstPrice) / firstPrice * 100).toFixed(2)
  const isUp = lastPrice >= firstPrice
  const regimeTag = REGIME_TAG[snapshot.regime] ?? 'N/A'
  const regimeColorClass = REGIME_COLOR[snapshot.regime] ?? 'text-text-muted'

  // Bollinger bands
  const upperBand: string[] = []
  const lowerBand: string[] = []
  for (let i = 0; i < prices.length; i++) {
    const start = Math.max(0, i - 19)
    let sum = 0
    const slice: number[] = []
    for (let j = start; j <= i; j++) { sum += prices[j]!; slice.push(prices[j]!) }
    const smaVal = sum / slice.length
    let variance = 0
    for (const p of slice) variance += (p - smaVal) ** 2
    const std = Math.sqrt(variance / slice.length)
    const x = pad.l + (i / Math.max(1, prices.length - 1)) * cW
    const uY = pad.t + cH - ((smaVal + 2 * std - min) / range) * cH
    const lY = pad.t + cH - ((smaVal - 2 * std - min) / range) * cH
    upperBand.push(`${x},${uY}`)
    lowerBand.push(`${x},${lY}`)
  }
  const bbFill = [...upperBand, ...lowerBand.reverse()].join(' ')

  return (
    <div className="rounded-lg border border-border bg-bg-secondary/40 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isRunning ? 'bg-accent animate-pulse' : 'bg-text-muted'}`} />
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Synthetic Market</span>
          <span className="text-[10px] font-mono text-text-muted">Gen {generation}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-mono font-semibold ${regimeColorClass}`}>{regimeTag}</span>
          <span className={`text-[10px] font-mono font-semibold tabular-nums ${isUp ? 'text-success' : 'text-danger'}`}>
            ${lastPrice.toFixed(2)} ({isUp ? '+' : ''}{totalRet}%)
          </span>
          <span className="text-[10px] font-mono text-text-muted tabular-nums">
            t={history.length}
          </span>
        </div>
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
        {/* Regime bands */}
        {bands.map((b, i) => (
          <rect key={i} x={b.x1} y={pad.t} width={b.x2 - b.x1} height={cH} fill={REGIME_BG[b.regime] ?? 'transparent'} />
        ))}
        {/* Bollinger band fill */}
        <polygon points={bbFill} fill="rgba(34,211,238,0.04)" />
        {/* SMA line */}
        <polyline points={smaLine.join(' ')} fill="none" stroke="rgba(34,211,238,0.25)" strokeWidth="1" strokeDasharray="3,3" />
        {/* Price line */}
        <polyline points={pts} fill="none" stroke={isUp ? 'var(--color-success)' : 'var(--color-danger)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="flex items-center gap-4 mt-1.5 text-[9px] font-mono text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-3 h-[1px] bg-accent/25 inline-block" style={{ borderTop: '1px dashed rgba(34,211,238,0.25)' }} />
          SMA 20
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 bg-accent/5 inline-block rounded-sm" />
          Bollinger Bands
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 bg-success/10 inline-block rounded-sm" />
          Bull
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 bg-danger/10 inline-block rounded-sm" />
          Bear
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-2 bg-warning/10 inline-block rounded-sm" />
          Vol
        </span>
      </div>
    </div>
  )
}
