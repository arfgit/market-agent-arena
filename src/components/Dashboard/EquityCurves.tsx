import type { SimulationSnapshot } from '@/lib/market/simulate'

const STRATEGY_COLORS: Record<string, string> = {
  manual: '#8b5cf6',
  dtree: '#10b981',
  forest: '#0ea5e9',
  qlearner: '#f59e0b',
  benchmark: '#6b7280',
}

const STRATEGY_LABELS: Record<string, string> = {
  manual: 'Manual',
  dtree: 'DTree',
  forest: 'Forest',
  qlearner: 'QLearner',
  benchmark: 'Buy&Hold',
}

interface Props {
  history: SimulationSnapshot[]
}

export default function EquityCurves({ history }: Props) {
  if (history.length < 2) return null

  const types = ['manual', 'dtree', 'forest', 'qlearner', 'benchmark'] as const

  // Collect equity curves normalized to % return
  const curves: Record<string, number[]> = {}
  for (const type of types) {
    curves[type] = history.map((h) => {
      const s = h.strategies.find((s) => s.type === type)
      return s ? ((s.portfolio.equity - 100000) / 100000) * 100 : 0
    })
  }

  const allValues = types.flatMap((t) => curves[t]!)
  const min = Math.min(...allValues, 0)
  const max = Math.max(...allValues, 0)
  const range = max - min || 1

  const W = 600
  const H = 100
  const pad = { t: 4, b: 4, l: 0, r: 0 }
  const cW = W - pad.l - pad.r
  const cH = H - pad.t - pad.b

  const zeroY = pad.t + cH - ((0 - min) / range) * cH

  const lines = types.map((type) => {
    const data = curves[type]!
    const pts = data.map((v, i) => {
      const x = pad.l + (i / (data.length - 1)) * cW
      const y = pad.t + cH - ((v - min) / range) * cH
      return `${x},${y}`
    }).join(' ')
    return { type, pts, color: STRATEGY_COLORS[type]! }
  })

  return (
    <div className="rounded-lg border border-border bg-bg-secondary/40 p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">Cumulative Returns</span>
        <div className="flex items-center gap-3">
          {types.map((t) => (
            <span key={t} className="flex items-center gap-1 text-[9px] font-mono text-text-muted">
              <span className="w-2.5 h-[2px] rounded-full inline-block" style={{ backgroundColor: STRATEGY_COLORS[t] }} />
              {STRATEGY_LABELS[t]}
            </span>
          ))}
        </div>
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="overflow-visible">
        {/* Zero line */}
        <line x1={pad.l} y1={zeroY} x2={W - pad.r} y2={zeroY} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4,4" />

        {/* Strategy lines */}
        {lines.map((line) => (
          <polyline
            key={line.type}
            points={line.pts}
            fill="none"
            stroke={line.color}
            strokeWidth={line.type === 'benchmark' ? '1' : '1.5'}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={line.type === 'benchmark' ? '0.4' : '0.8'}
            strokeDasharray={line.type === 'benchmark' ? '3,3' : undefined}
          />
        ))}
      </svg>
    </div>
  )
}
