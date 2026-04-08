import type { IndicatorSet } from '@/lib/market/types'
import clsx from 'clsx'

interface Props {
  indicators: IndicatorSet | null
}

function Gauge({ label, value, min, max }: { label: string; value: number; min: number; max: number }) {
  const pct = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
  const isPositive = value > (min + max) / 2

  return (
    <div>
      <div className="flex justify-between text-[8px] mb-0.5">
        <span className="text-text-muted">{label}</span>
        <span className={clsx('tabular-nums', isPositive ? 'text-success' : 'text-danger')}>{value.toFixed(4)}</span>
      </div>
      <div className="h-1 rounded-full bg-bg-tertiary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct}%`,
            backgroundColor: isPositive ? 'var(--color-success)' : 'var(--color-danger)',
            opacity: 0.5,
          }}
        />
      </div>
    </div>
  )
}

function EmptyGauge({ label }: { label: string }) {
  return (
    <div>
      <div className="flex justify-between text-[8px] mb-0.5">
        <span className="text-text-muted">{label}</span>
        <span className="tabular-nums text-text-muted">-</span>
      </div>
      <div className="h-1 rounded-full bg-bg-tertiary" />
    </div>
  )
}

export default function IndicatorPanel({ indicators }: Props) {
  return (
    <div className="rounded-lg border border-border bg-bg-secondary/30 p-3 h-full">
      <span className="text-[10px] text-text-muted block mb-2">INDICATORS</span>
      <div className="space-y-2">
        {indicators ? (
          <>
            <Gauge label="SMA Dist" value={indicators.smaDistance} min={-0.1} max={0.1} />
            <Gauge label="BB %B" value={indicators.bbp} min={0} max={1} />
            <Gauge label="MACD Hist" value={indicators.macdHist} min={-2} max={2} />
            <Gauge label="Stoch %K" value={indicators.stochK} min={0} max={1} />
            <Gauge label="ROC" value={indicators.roc} min={-0.1} max={0.1} />
          </>
        ) : (
          <>
            <EmptyGauge label="SMA Dist" />
            <EmptyGauge label="BB %B" />
            <EmptyGauge label="MACD Hist" />
            <EmptyGauge label="Stoch %K" />
            <EmptyGauge label="ROC" />
          </>
        )}
      </div>
    </div>
  )
}
