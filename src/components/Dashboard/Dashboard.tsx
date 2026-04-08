import { useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useMarketWorker } from '@/hooks/useMarketWorker'
import PriceChart from './PriceChart'
import StrategyPanel from './StrategyPanel'
import EquityCurves from './EquityCurves'
import MetricsTable from './MetricsTable'
import IndicatorPanel from './IndicatorPanel'

export default function Dashboard() {
  const { snapshot, history, isRunning, isTraining, isComplete, pause, resume, restart } = useMarketWorker()

  const handleToggle = useCallback(() => {
    if (isRunning) pause()
    else resume()
  }, [isRunning, pause, resume])

  const strategies = snapshot?.strategies ?? []

  const equityByType = useMemo(() => {
    const map: Record<string, number[]> = {}
    for (const h of history) {
      for (const s of h.strategies) {
        if (!map[s.type]) map[s.type] = []
        map[s.type]!.push(s.portfolio.equity)
      }
    }
    return map
  }, [history])

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="space-y-4"
    >
      {/* Status bar + controls */}
      <div className="flex items-center gap-2 h-8">
        {isTraining && (
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-[10px] text-accent">Training learners...</span>
          </div>
        )}
        {!isTraining && !isComplete && isRunning && (
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-text-muted">
              Running — tick {history.length} / {snapshot?.tick !== undefined ? history.length : '...'}
            </span>
          </div>
        )}
        {!isTraining && !isComplete && !isRunning && (
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-warning" />
            <span className="text-[10px] text-text-muted">Paused</span>
          </div>
        )}
        {isComplete && (
          <div className="flex items-center gap-2 mr-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-text-muted" />
            <span className="text-[10px] text-text-muted">
              Complete — {history.length} ticks out-of-sample
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          {!isComplete && (
            <button
              onClick={handleToggle}
              className="text-[10px] text-text-muted hover:text-accent px-2.5 py-1 rounded-md border border-border hover:border-accent/30"
            >
              {isRunning ? 'Pause' : 'Resume'}
            </button>
          )}
          <button
            onClick={restart}
            className="text-[10px] text-text-muted hover:text-accent px-2.5 py-1 rounded-md border border-border hover:border-accent/30"
          >
            Restart
          </button>
        </div>
      </div>

      {/* Price chart */}
      <PriceChart
        history={history}
        snapshot={snapshot}
        isRunning={isRunning}
        isTraining={isTraining}
      />

      {/* Strategy panels — always 5 slots */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {strategies.length > 0
          ? strategies.map((s) => (
              <StrategyPanel key={s.type} strategy={s} equityCurve={equityByType[s.type] ?? []} />
            ))
          : Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-lg border border-border bg-bg-secondary/30 h-[300px]" />
            ))
        }
      </div>

      {/* Indicators (mobile only) */}
      <div className="lg:hidden">
        <IndicatorPanel indicators={snapshot?.indicators ?? null} />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_180px] gap-3">
        <div className="rounded-lg border border-border bg-bg-secondary/30 min-h-[140px]">
          {history.length >= 2 ? (
            <EquityCurves history={history} />
          ) : (
            <div className="p-3 sm:p-4 h-full flex items-center justify-center">
              <span className="text-[10px] text-text-muted">Equity curves will appear here</span>
            </div>
          )}
        </div>
        <div className="rounded-lg border border-border bg-bg-secondary/30 min-h-[140px]">
          {strategies.length > 0 ? (
            <MetricsTable strategies={strategies} />
          ) : (
            <div className="p-3 sm:p-4 h-full flex items-center justify-center">
              <span className="text-[10px] text-text-muted">Metrics will appear here</span>
            </div>
          )}
        </div>
        <div className="hidden lg:block">
          <IndicatorPanel indicators={snapshot?.indicators ?? null} />
        </div>
      </div>
    </motion.div>
  )
}
