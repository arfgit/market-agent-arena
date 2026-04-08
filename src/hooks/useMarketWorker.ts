import { useEffect, useRef, useState, useCallback } from 'react'
import type { SimulationSnapshot } from '@/lib/market/simulate'
import type { TickMessage, TrainMessage } from '@/workers/marketWorker'

export interface WorkerState {
  snapshot: SimulationSnapshot | null
  history: SimulationSnapshot[]
  totalTicks: number
  isRunning: boolean
  isTraining: boolean
  isComplete: boolean
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
    isComplete: false,
  })

  const launch = useCallback(() => {
    // Terminate existing worker if any
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }

    historyRef.current = []

    const worker = new Worker(
      new URL('../workers/marketWorker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent<TickMessage | TrainMessage>) => {
      if (e.data.type === 'training') {
        const msg = e.data as TrainMessage
        if (msg.progress === 0) {
          historyRef.current = []
          setState((s) => ({
            ...s,
            isTraining: true,
            isRunning: true,
            isComplete: false,
          }))
        } else if (msg.progress >= 1) {
          setState((s) => ({ ...s, isTraining: false }))
        }
      } else if (e.data.type === 'tick') {
        const msg = e.data as TickMessage
        historyRef.current.push(msg.snapshot)
        const historySnapshot = historyRef.current.slice()
        setState((s) => ({
          ...s,
          snapshot: msg.snapshot,
          history: historySnapshot,
          totalTicks: msg.totalTicks,
          isRunning: true,
          isTraining: false,
          isComplete: msg.isComplete,
        }))
      }
    }

    worker.postMessage({ type: 'start', ticks: 500 })
    workerRef.current = worker
    setState({
      snapshot: null,
      history: [],
      totalTicks: 0,
      isRunning: true,
      isTraining: true,
      isComplete: false,
    })
  }, [])

  const pause = useCallback(() => {
    workerRef.current?.postMessage({ type: 'pause' })
    setState((s) => ({ ...s, isRunning: false }))
  }, [])

  const resume = useCallback(() => {
    workerRef.current?.postMessage({ type: 'resume' })
    setState((s) => ({ ...s, isRunning: true }))
  }, [])

  const restart = useCallback(() => {
    launch()
  }, [launch])

  useEffect(() => {
    launch()
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [launch])

  return { ...state, pause, resume, restart }
}
