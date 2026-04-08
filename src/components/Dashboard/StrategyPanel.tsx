import { useMemo } from 'react'
import clsx from 'clsx'
import type { StrategyResult } from '@/lib/market/types'

const TYPE_COLORS: Record<string, { border: string; badge: string; accent: string }> = {
  manual: { border: 'border-violet-500/30', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/25', accent: 'violet' },
  dtree: { border: 'border-emerald-500/30', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', accent: 'emerald' },
  forest: { border: 'border-sky-500/30', badge: 'bg-sky-500/10 text-sky-400 border-sky-500/25', accent: 'sky' },
  qlearner: { border: 'border-amber-500/30', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/25', accent: 'amber' },
  benchmark: { border: 'border-zinc-600/30', badge: 'bg-zinc-700/20 text-zinc-400 border-zinc-600/25', accent: 'zinc' },
}

const TYPE_LABELS: Record<string, string> = {
  manual: 'Rule-Based',
  dtree: 'Supervised',
  forest: 'Ensemble',
  qlearner: 'Reinforcement',
  benchmark: 'Baseline',
}

const ACTION_COLORS: Record<string, string> = {
  BUY: 'text-success',
  SELL: 'text-danger',
  HOLD: 'text-text-muted',
}

interface Props {
  strategy: StrategyResult
  equityCurve: number[]
}

export default function StrategyPanel({ strategy, equityCurve }: Props) {
  const colors = TYPE_COLORS[strategy.type] ?? TYPE_COLORS.benchmark!
  const mlLabel = TYPE_LABELS[strategy.type] ?? ''
  const lastAction = strategy.actions[strategy.actions.length - 1] ?? 'HOLD'
  const explanation = strategy.explanation[strategy.explanation.length - 1] ?? ''

  const miniLine = useMemo(() => {
    if (equityCurve.length < 2) return ''
    const W = 100, H = 24
    let eMin = equityCurve[0]!, eMax = equityCurve[0]!
    for (const v of equityCurve) { if (v < eMin) eMin = v; if (v > eMax) eMax = v }
    const eRange = eMax - eMin || 1
    return equityCurve.map((v, i) => {
      const x = (i / (equityCurve.length - 1)) * W
      const y = H - ((v - eMin) / eRange) * (H - 4) - 2
      return `${x},${y}`
    }).join(' ')
  }, [equityCurve])

  const p = strategy.portfolio
  const totalWL = p.wins + p.losses
  const winRate = totalWL > 0 ? (p.wins / totalWL * 100).toFixed(1) : '-'

  return (
    <div className={clsx(
      'rounded-lg border bg-bg-secondary/30 overflow-hidden flex flex-col min-h-[280px]',
      colors.border
    )}>
      <div className="p-3 flex-1 flex flex-col">
        {/* Header — fixed height */}
        <div className="flex items-start justify-between mb-3 h-9">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-text-primary leading-tight truncate">
              {strategy.name}
            </div>
            <span className={clsx('inline-block mt-1 text-[8px] font-medium px-1.5 py-0.5 rounded border leading-none tracking-wide', colors.badge)}>
              {mlLabel}
            </span>
          </div>
          <span className={clsx('text-[10px] font-semibold shrink-0', ACTION_COLORS[lastAction])}>
            {lastAction}
          </span>
        </div>

        {/* Return — fixed height */}
        <div className="flex items-center justify-between mb-3 h-10">
          <div>
            <div className={clsx(
              'text-base font-semibold tabular-nums leading-none',
              strategy.totalReturn >= 0 ? 'text-success' : 'text-danger'
            )}>
              {strategy.totalReturn >= 0 ? '+' : ''}{strategy.totalReturn.toFixed(2)}%
            </div>
            <div className="text-[9px] text-text-muted mt-1 tabular-nums">
              ${p.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <svg width={100} height={24} viewBox="0 0 100 24" className="overflow-visible shrink-0">
            {miniLine && (
              <polyline
                points={miniLine}
                fill="none"
                stroke={strategy.totalReturn >= 0 ? 'var(--color-success)' : 'var(--color-danger)'}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.6"
              />
            )}
          </svg>
        </div>

        {/* Metrics — fixed height */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] mb-3 h-[52px]">
          <div className="flex justify-between">
            <span className="text-text-muted">Sharpe</span>
            <span className={clsx('tabular-nums', strategy.sharpe > 0 ? 'text-success' : strategy.sharpe < 0 ? 'text-danger' : 'text-text-muted')}>
              {strategy.sharpe.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Win %</span>
            <span className="tabular-nums">{winRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Trades</span>
            <span className="tabular-nums">{p.trades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">MDD</span>
            <span className={clsx('tabular-nums', p.maxDrawdown > 0.05 ? 'text-danger' : 'text-text-muted')}>
              {(p.maxDrawdown * 100).toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Explanation — fixed height, scrollable */}
        <div className="mt-auto pt-2 border-t border-border/20">
          <div className="text-[8px] text-text-muted mb-0.5">Why</div>
          <div className="text-[9px] text-text-secondary leading-relaxed h-[48px] overflow-y-auto break-words scrollbar-none">
            {explanation}
          </div>
        </div>
      </div>
    </div>
  )
}
