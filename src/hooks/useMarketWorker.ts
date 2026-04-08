import { useEffect, useRef, useState, useCallback } from 'react'
import type { SimulationSnapshot } from '@/lib/market/simulate'
import type { TickMessage, TrainMessage } from '@/workers/marketWorker'

export interface WorkerState {
  snapshot: SimulationSnapshot | null
  history: SimulationSnapshot[]
  totalTicks: number
  isRunning: boolean
  isTraining: boolean
  trainProgress: number
  isComplete: boolean
  generation: number
}

export function useMarketWorker() {
  const workerRef = useRef<Worker | null>(null)
  const historyRef = useRef<SimulationSnapshot[]>([])

  const [state, setState] = useState<WorkerState>({
    snapshot: null,
    history: [],
    totalTicks: 0,
    isRunning: false,
    isTraining: false,
    trainProgress: 0,
    isComplete: false,
    generation: 0,
  })

  const start = useCallback(() => {
    if (workerRef.current) return

    const worker = new Worker(
      new URL('../workers/marketWorker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent<TickMessage | TrainMessage>) => {
      if (e.data.type === 'training') {
        const msg = e.data as TrainMessage
        if (msg.progress === 0) {
          historyRef.current = []
        }
        setState((s) => ({
          ...s,
          isTraining: msg.progress < 1,
          trainProgress: msg.progress,
          isRunning: true,
          ...(msg.progress === 0 ? { history: [], snapshot: null, isComplete: false, generation: s.generation + 1 } : {}),
        }))
      } else if (e.data.type === 'tick') {
        const msg = e.data as TickMessage
        historyRef.current.push(msg.snapshot)
        setState((s) => ({
          ...s,
          snapshot: msg.snapshot,
          history: historyRef.current,
          totalTicks: msg.totalTicks,
          isRunning: true,
          isTraining: false,
          isComplete: msg.isComplete,
        }))
      }
    }

    worker.postMessage({ type: 'start', ticks: 250 })
    workerRef.current = worker
    setState((s) => ({ ...s, isRunning: true }))
  }, [])

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: 'pause' })
    setState((s) => ({ ...s, isRunning: false }))
  }, [])

  const resume = useCallback(() => {
    workerRef.current?.postMessage({ type: 'resume' })
    setState((s) => ({ ...s, isRunning: true }))
  }, [])

  const newMarket = useCallback(() => {
    workerRef.current?.postMessage({ type: 'newMarket' })
  }, [])

  useEffect(() => {
    start()
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [start])

  return { ...state, pause, resume, newMarket }
}
