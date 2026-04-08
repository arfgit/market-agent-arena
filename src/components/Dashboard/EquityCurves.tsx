import { useMemo } from 'react'
import type { SimulationSnapshot } from '@/lib/market/simulate'

const STRATEGY_COLORS: Record<string, string> = {
  manual: '#8b5cf6',
  dtree: '#10b981',
  forest: '#0ea5e9',
  qlearner: '#f59e0b',
  benchmark: '#71717a',
}

const STRATEGY_LABELS: Record<string, string> = {
  manual: 'Manual',
  dtree: 'DTree',
  forest: 'Forest',
  qlearner: 'QLearner',
  benchmark: 'Buy&Hold',
}

const TYPES = ['manual', 'dtree', 'forest', 'qlearner', 'benchmark'] as const

interface Props {
  history: SimulationSnapshot[]
}

export default function EquityCurves({ history }: Props) {
  const chartData = useMemo(() => {
    if (history.length < 2) return null

    const curves: Record<string, number[]> = {}
    for (const type of TYPES) {
      curves[type] = history.map((h) => {
        const s = h.strategies.find((s) => s.type === type)
        return s ? ((s.portfolio.equity - 100000) / 100000) * 100 : 0
      })
    }

    let min = 0, max = 0
    for (const type of TYPES) {
      for (const v of curves[type]!) {
        if (v < min) min = v
        if (v > max) max = v
      }
    }
    const range = max - min || 1

    const W = 600, H = 100
    const pad = { t: 4, b: 4 }
    const cW = W
    const cH = H - pad.t - pad.b
    const zeroY = pad.t + cH - ((0 - min) / range) * cH

    const lines = TYPES.map((type) => {
      const data = curves[type]!
      const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * cW
        const y = pad.t + cH - ((v - min) / range) * cH
        return `${x},${y}`
      }).join(' ')
      return { type, pts, color: STRATEGY_COLORS[type]! }
    })

    return { lines, zeroY, W, H }
  }, [history])

  if (!chartData) return null

  return (
    <div className="p-3 sm:p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <span className="text-[10px] text-text-muted tracking-wide">CUMULATIVE RETURNS</span>
        <div className="flex items-center gap-2 flex-wrap">
          {TYPES.map((t) => (
            <span key={t} className="flex items-center gap-1 text-[8px] text-text-muted">
              <span className="w-2 h-[2px] rounded-full inline-block" style={{ backgroundColor: STRATEGY_COLORS[t] }} />
              {STRATEGY_LABELS[t]}
            </span>
          ))}
        </div>
      </div>

      <svg width="100%" height={chartData.H} viewBox={`0 0 ${chartData.W} ${chartData.H}`} preserveAspectRatio="none" className="overflow-visible">
        <line x1={0} y1={chartData.zeroY} x2={chartData.W} y2={chartData.zeroY} stroke="var(--color-border)" strokeWidth="0.5" strokeDasharray="4,4" />
        {chartData.lines.map((line) => (
          <polyline
            key={line.type}
            points={line.pts}
            fill="none"
            stroke={line.color}
            strokeWidth={line.type === 'benchmark' ? '1' : '1.5'}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={line.type === 'benchmark' ? '0.35' : '0.75'}
            strokeDasharray={line.type === 'benchmark' ? '3,3' : undefined}
          />
        ))}
      </svg>
    </div>
  )
}
