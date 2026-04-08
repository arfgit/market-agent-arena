import type { Tick, Regime } from './types'

const REGIMES: Regime[] = ['bull', 'bear', 'sideways', 'volatile']

function gaussian(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const DRIFT: Record<Regime, number> = { bull: 0.0012, bear: -0.0012, sideways: 0, volatile: 0 }
const VOL: Record<Regime, number> = { bull: 0.011, bear: 0.013, sideways: 0.005, volatile: 0.024 }

export function generateMarket(ticks: number, seed?: number): Tick[] {
  if (seed !== undefined) {
    // Simple deterministic seeding via mixing
    let s = seed
    const rng = () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647 }
    Math.random = rng as () => number
  }

  const out: Tick[] = []
  let price = 100
  let regime: Regime = REGIMES[Math.floor(Math.random() * 4)]!
  let age = 0
  const dur = 30 + Math.floor(Math.random() * 30)

  for (let t = 0; t < ticks; t++) {
    age++
    if (age > dur) {
      const next = REGIMES.filter((r) => r !== regime)
      regime = next[Math.floor(Math.random() * next.length)]!
      age = 0
    }

    const ret = DRIFT[regime] + VOL[regime] * gaussian()
    price = Math.max(1, price * (1 + ret))
    out.push({ t, price, regime })
  }

  // Restore Math.random if we replaced it
  if (seed !== undefined) {
    Math.random = globalThis.Math.random
  }

  return out
}
