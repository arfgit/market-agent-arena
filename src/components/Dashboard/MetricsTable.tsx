import clsx from 'clsx'
import type { StrategyResult } from '@/lib/market/types'

const TYPE_COLORS: Record<string, string> = {
  manual: 'text-violet-400',
  dtree: 'text-emerald-400',
  forest: 'text-sky-400',
  qlearner: 'text-amber-400',
  benchmark: 'text-text-muted',
}

interface Props {
  strategies: StrategyResult[]
}

export default function MetricsTable({ strategies }: Props) {
  if (strategies.length === 0) return null

  // Sort by total return descending
  const sorted = [...strategies].sort((a, b) => b.totalReturn - a.totalReturn)

  return (
    <div className="rounded-lg border border-border bg-bg-secondary/40 p-3 sm:p-4">
      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">Performance Comparison</span>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] font-mono">
          <thead>
            <tr className="text-text-muted uppercase tracking-wider">
              <th className="text-left pb-1.5 pr-3">#</th>
              <th className="text-left pb-1.5 pr-3">Strategy</th>
              <th className="text-right pb-1.5 pr-3">Return</th>
              <th className="text-right pb-1.5 pr-3">Sharpe</th>
              <th className="text-right pb-1.5 pr-3">Win %</th>
              <th className="text-right pb-1.5 pr-3">Trades</th>
              <th className="text-right pb-1.5 pr-3">MDD</th>
              <th className="text-right pb-1.5">Equity</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => {
              const p = s.portfolio
              const totalWL = p.wins + p.losses
              const winRate = totalWL > 0 ? (p.wins / totalWL * 100) : 0

              return (
                <tr key={s.type} className="border-t border-border/30">
                  <td className="py-1.5 pr-3 text-text-muted tabular-nums">{i + 1}</td>
                  <td className={clsx('py-1.5 pr-3 font-semibold', TYPE_COLORS[s.type])}>
                    {s.name}
                  </td>
                  <td className={clsx('py-1.5 pr-3 text-right tabular-nums', s.totalReturn >= 0 ? 'text-success' : 'text-danger')}>
                    {s.totalReturn >= 0 ? '+' : ''}{s.totalReturn.toFixed(2)}%
                  </td>
                  <td className={clsx('py-1.5 pr-3 text-right tabular-nums', s.sharpe > 0 ? 'text-success' : s.sharpe < 0 ? 'text-danger' : 'text-text-muted')}>
                    {s.sharpe.toFixed(2)}
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-text-primary">
                    {winRate.toFixed(1)}%
                  </td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-text-primary">
                    {p.trades}
                  </td>
                  <td className={clsx('py-1.5 pr-3 text-right tabular-nums', p.maxDrawdown > 0.05 ? 'text-danger' : 'text-text-muted')}>
                    {(p.maxDrawdown * 100).toFixed(1)}%
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-text-primary">
                    ${p.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
