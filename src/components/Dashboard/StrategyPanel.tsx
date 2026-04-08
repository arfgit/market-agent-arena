import clsx from 'clsx'
import type { StrategyResult } from '@/lib/market/types'
import type { SimulationSnapshot } from '@/lib/market/simulate'

const TYPE_COLORS: Record<string, { border: string; glow: string; badge: string; bg: string }> = {
  manual: { border: 'border-violet-500/40', glow: 'shadow-[0_0_12px_rgba(139,92,246,0.1)]', badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30', bg: 'from-violet-500/5' },
  dtree: { border: 'border-emerald-500/40', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.1)]', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', bg: 'from-emerald-500/5' },
  forest: { border: 'border-sky-500/40', glow: 'shadow-[0_0_12px_rgba(14,165,233,0.1)]', badge: 'bg-sky-500/15 text-sky-400 border-sky-500/30', bg: 'from-sky-500/5' },
  qlearner: { border: 'border-amber-500/40', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.1)]', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', bg: 'from-amber-500/5' },
  benchmark: { border: 'border-border', glow: '', badge: 'bg-bg-tertiary text-text-muted border-border', bg: 'from-transparent' },
}

const TYPE_LABELS: Record<string, string> = {
  manual: 'Rule-Based',
  dtree: 'Supervised',
  forest: 'Ensemble',
  qlearner: 'Reinforcement',
  benchmark: 'Baseline',
}

const ACTION_COLORS: Record<string, string> = {
  BUY: 'text-success bg-success/10 border-success/20',
  SELL: 'text-danger bg-danger/10 border-danger/20',
  HOLD: 'text-text-muted bg-bg-tertiary border-border',
}

interface Props {
  strategy: StrategyResult
  history: SimulationSnapshot[]
}

export default function StrategyPanel({ strategy, history }: Props) {
  const colors = TYPE_COLORS[strategy.type] ?? TYPE_COLORS.benchmark!
  const mlLabel = TYPE_LABELS[strategy.type] ?? 'Unknown'
  const lastAction = strategy.actions[strategy.actions.length - 1] ?? 'HOLD'
  const explanation = strategy.explanation[strategy.explanation.length - 1] ?? ''

  // Mini equity curve from history
  const equityCurve = history.map((h) => {
    const s = h.strategies.find((s) => s.type === strategy.type)
    return s?.portfolio.equity ?? 100000
  })

  const miniW = 120
  const miniH = 28
  let miniLine = ''
  if (equityCurve.length > 1) {
    const eMin = Math.min(...equityCurve)
    const eMax = Math.max(...equityCurve)
    const eRange = eMax - eMin || 1
    miniLine = equityCurve.map((v, i) => {
      const x = (i / (equityCurve.length - 1)) * miniW
      const y = miniH - ((v - eMin) / eRange) * (miniH - 4) - 2
      return `${x},${y}`
    }).join(' ')
  }

  const p = strategy.portfolio
  const totalWL = p.wins + p.losses
  const winRate = totalWL > 0 ? (p.wins / totalWL * 100).toFixed(1) : '-'

  return (
    <div className={clsx(
      'rounded-lg border bg-bg-secondary/40 backdrop-blur-sm overflow-hidden flex flex-col',
      colors.border, colors.glow
    )}>
      {/* Gradient accent top */}
      <div className={clsx('h-[2px] bg-gradient-to-r', colors.bg, 'to-transparent')} />

      <div className="p-3 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs font-mono font-semibold text-text-primary leading-none">
              {strategy.name}
            </div>
            <span className={clsx('inline-block mt-1 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded border leading-none', colors.badge)}>
              {mlLabel}
            </span>
          </div>
          <span className={clsx(
            'text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border leading-none',
            ACTION_COLORS[lastAction]
          )}>
            {lastAction}
          </span>
        </div>

        {/* Return + equity curve */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className={clsx(
              'text-lg font-mono font-bold tabular-nums leading-none',
              strategy.totalReturn >= 0 ? 'text-success' : 'text-danger'
            )}>
              {strategy.totalReturn >= 0 ? '+' : ''}{strategy.totalReturn.toFixed(2)}%
            </div>
            <div className="text-[9px] font-mono text-text-muted mt-0.5 tabular-nums">
              ${p.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          {miniLine && (
            <svg width={miniW} height={miniH} viewBox={`0 0 ${miniW} ${miniH}`} className="overflow-visible shrink-0">
              <polyline
                points={miniLine}
                fill="none"
                stroke={strategy.totalReturn >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
              />
            </svg>
          )}
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[9px] mb-2">
          <div className="flex justify-between">
            <span className="text-text-muted uppercase tracking-wider">Sharpe</span>
            <span className={clsx('font-mono tabular-nums', strategy.sharpe > 0 ? 'text-success' : strategy.sharpe < 0 ? 'text-danger' : 'text-text-muted')}>
              {strategy.sharpe.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted uppercase tracking-wider">Win %</span>
            <span className="font-mono tabular-nums text-text-primary">{winRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted uppercase tracking-wider">Trades</span>
            <span className="font-mono tabular-nums text-text-primary">{p.trades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted uppercase tracking-wider">MDD</span>
            <span className={clsx('font-mono tabular-nums', p.maxDrawdown > 0.05 ? 'text-danger' : 'text-text-muted')}>
              {(p.maxDrawdown * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Explanation — this is the key differentiator */}
        <div className="mt-auto pt-2 border-t border-border/30">
          <div className="text-[8px] font-mono text-text-muted uppercase tracking-wider mb-0.5">Why this action</div>
          <div className="text-[9px] font-mono text-text-secondary leading-relaxed break-words">
            {explanation}
          </div>
        </div>
      </div>
    </div>
  )
}
