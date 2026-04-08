import { useCallback } from 'react'
import { motion } from 'framer-motion'
import { useMarketWorker } from '@/hooks/useMarketWorker'
import PriceChart from './PriceChart'
import StrategyPanel from './StrategyPanel'
import EquityCurves from './EquityCurves'
import MetricsTable from './MetricsTable'
import IndicatorPanel from './IndicatorPanel'

export default function Dashboard() {
  const { snapshot, history, isRunning, isTraining, trainProgress, generation, pause, resume, newMarket } = useMarketWorker()

  const handleToggle = useCallback(() => {
    if (isRunning) pause()
    else resume()
  }, [isRunning, pause, resume])

  const strategies = snapshot?.strategies ?? []

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="space-y-3"
    >
      {/* Controls */}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={newMarket}
          className="text-[10px] font-mono text-text-muted hover:text-accent px-2 py-1 rounded border border-border hover:border-accent/40 transition-colors"
        >
          New Market
        </button>
        <button
          onClick={handleToggle}
          className="text-[10px] font-mono text-text-muted hover:text-accent px-2 py-1 rounded border border-border hover:border-accent/40 transition-colors"
        >
          {isRunning ? 'Pause' : 'Resume'}
        </button>
        {isTraining && (
          <span className="text-[10px] font-mono text-accent animate-pulse">
            Training... {(trainProgress * 100).toFixed(0)}%
          </span>
        )}
      </div>

      {/* Row 1: Price chart full width */}
      <PriceChart
        history={history}
        snapshot={snapshot}
        isRunning={isRunning}
        isTraining={isTraining}
        generation={generation}
      />

      {/* Row 2: 5 strategy panels + indicator sidebar */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="grid grid-cols-5 gap-2">
          {strategies.map((s) => (
            <StrategyPanel key={s.type} strategy={s} history={history} />
          ))}
          {strategies.length === 0 && Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-bg-secondary/40 p-3 h-[260px] flex items-center justify-center">
              <span className="text-[10px] font-mono text-text-muted animate-pulse">Loading...</span>
            </div>
          ))}
        </div>
        <div className="w-[160px] hidden lg:block">
          <IndicatorPanel indicators={snapshot?.indicators ?? null} />
        </div>
      </div>

      {/* Row 3: Equity curves + metrics table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <EquityCurves history={history} />
        <MetricsTable strategies={strategies} />
      </div>
    </motion.div>
  )
}
