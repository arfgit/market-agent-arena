import type { IndicatorSet } from '@/lib/market/types'
import clsx from 'clsx'

interface Props {
  indicators: IndicatorSet | null
}

function Gauge({ label, value, min, max, color }: { label: string; value: number; min: number; max: number; color: string }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between text-[8px] font-mono">
        <span className="text-text-muted uppercase tracking-wider">{label}</span>
        <span className={clsx('tabular-nums', color)}>{value.toFixed(4)}</span>
      </div>
      <div className="h-1 rounded-full bg-bg-tertiary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, backgroundColor: `var(--color-${value > 0 ? 'success' : 'danger'})`, opacity: 0.7 }}
        />
      </div>
    </div>
  )
}

export default function IndicatorPanel({ indicators }: Props) {
  if (!indicators) return null

  return (
    <div className="rounded-lg border border-border bg-bg-secondary/40 p-3">
      <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">
        Live Indicators
      </span>
      <div className="space-y-1.5">
        <Gauge
          label="SMA Distance"
          value={indicators.smaDistance}
          min={-0.1}
          max={0.1}
          color={indicators.smaDistance < -0.02 ? 'text-danger' : indicators.smaDistance > 0.02 ? 'text-success' : 'text-text-muted'}
        />
        <Gauge
          label="Bollinger %B"
          value={indicators.bbp}
          min={0}
          max={1}
          color={indicators.bbp < 0.2 ? 'text-danger' : indicators.bbp > 0.8 ? 'text-success' : 'text-text-muted'}
        />
        <Gauge
          label="MACD Hist"
          value={indicators.macdHist}
          min={-2}
          max={2}
          color={indicators.macdHist > 0 ? 'text-success' : 'text-danger'}
        />
        <Gauge
          label="Stochastic %K"
          value={indicators.stochK}
          min={0}
          max={1}
          color={indicators.stochK < 0.2 ? 'text-danger' : indicators.stochK > 0.8 ? 'text-success' : 'text-text-muted'}
        />
        <Gauge
          label="Rate of Change"
          value={indicators.roc}
          min={-0.1}
          max={0.1}
          color={indicators.roc > 0 ? 'text-success' : 'text-danger'}
        />
      </div>
    </div>
  )
}
