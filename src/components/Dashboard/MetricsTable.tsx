import clsx from 'clsx'
import type { StrategyResult } from '@/lib/market/types'

const TYPE_COLORS: Record<string, string> = {
  manual: 'text-violet-400',
  dtree: 'text-emerald-400',
  forest: 'text-sky-400',
  qlearner: 'text-amber-400',
  benchmark: 'text-zinc-400',
}

const TYPE_ORDER = ['manual', 'dtree', 'forest', 'qlearner', 'benchmark']

interface Props {
  strategies: StrategyResult[]
}

export default function MetricsTable({ strategies }: Props) {
  if (strategies.length === 0) return null

  // Fixed row order — rank is displayed but rows don't jump
  const ordered = [...strategies].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))
  const ranked = [...strategies].sort((a, b) => b.totalReturn - a.totalReturn)
  const rankMap = new Map(ranked.map((s, i) => [s.type, i + 1]))

  return (
    <div className="p-3 sm:p-4 overflow-x-auto">
      <span className="text-[10px] text-text-muted tracking-wide block mb-2">PERFORMANCE</span>
      <table className="w-full text-[10px] min-w-[400px] table-fixed">
        <thead>
          <tr className="text-text-muted">
            <th className="text-left pb-1.5 pr-2 font-normal w-[24px]">#</th>
            <th className="text-left pb-1.5 pr-2 font-normal">Strategy</th>
            <th className="text-right pb-1.5 pr-2 font-normal w-[72px]">Return</th>
            <th className="text-right pb-1.5 pr-2 font-normal w-[52px]">Sharpe</th>
            <th className="text-right pb-1.5 pr-2 font-normal w-[48px]">Trades</th>
            <th className="text-right pb-1.5 pr-2 font-normal w-[48px]">MDD</th>
            <th className="text-right pb-1.5 font-normal w-[72px]">Equity</th>
          </tr>
        </thead>
        <tbody>
          {ordered.map((s) => {
            const p = s.portfolio
            const rank = rankMap.get(s.type) ?? '-'
            return (
              <tr key={s.type} className="border-t border-border/20">
                <td className="py-1 pr-2 text-text-muted tabular-nums">{rank}</td>
                <td className={clsx('py-1 pr-2 font-medium truncate', TYPE_COLORS[s.type])}>
                  {s.name}
                </td>
                <td className={clsx('py-1 pr-2 text-right tabular-nums', s.totalReturn >= 0 ? 'text-success' : 'text-danger')}>
                  {s.totalReturn >= 0 ? '+' : ''}{s.totalReturn.toFixed(2)}%
                </td>
                <td className={clsx('py-1 pr-2 text-right tabular-nums', s.sharpe > 0 ? 'text-success' : s.sharpe < 0 ? 'text-danger' : 'text-text-muted')}>
                  {s.sharpe.toFixed(2)}
                </td>
                <td className="py-1 pr-2 text-right tabular-nums">{p.trades}</td>
                <td className={clsx('py-1 pr-2 text-right tabular-nums', p.maxDrawdown > 0.05 ? 'text-danger' : 'text-text-muted')}>
                  {(p.maxDrawdown * 100).toFixed(1)}%
                </td>
                <td className="py-1 text-right tabular-nums">
                  ${p.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
