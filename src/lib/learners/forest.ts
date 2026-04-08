import type { Action } from '../market/types'
import { DecisionTree, dtreeDecision } from './dtree'

/**
 * Random Forest / BagLearner from ML4T BagLearner.py + RTLearner.py
 *
 * Creates multiple decision trees, each trained on a bootstrap sample.
 * Predictions are averaged across all trees (bagging reduces variance).
 */

export class RandomForest {
  private trees: DecisionTree[] = []
  private numBags: number
  trained = false

  constructor(numBags: number = 10) {
    this.numBags = numBags
  }

  train(X: number[][], y: number[]): void {
    this.trees = []
    const n = X.length

    for (let b = 0; b < this.numBags; b++) {
      // Bootstrap sample
      const bagX: number[][] = []
      const bagY: number[] = []
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * n)
        bagX.push(X[idx]!)
        bagY.push(y[idx]!)
      }

      const tree = new DecisionTree()
      tree.train(bagX, bagY)
      this.trees.push(tree)
    }
    this.trained = true
  }

  predict(x: number[]): number {
    if (!this.trained || this.trees.length === 0) return 0
    const preds = this.trees.map((t) => t.predict(x))
    return preds.reduce((a, b) => a + b, 0) / preds.length
  }

  /** Get individual tree predictions for visualization (tree voting) */
  getVotes(x: number[]): { prediction: number; action: Action }[] {
    return this.trees.map((t) => {
      const pred = t.predict(x)
      return { prediction: pred, action: dtreeDecision(pred) }
    })
  }

  get numTrees(): number {
    return this.trees.length
  }
}

export function forestDecision(prediction: number): Action {
  return dtreeDecision(prediction)
}

export function explainForest(votes: { prediction: number; action: Action }[]): string {
  const buys = votes.filter((v) => v.action === 'BUY').length
  const sells = votes.filter((v) => v.action === 'SELL').length
  const holds = votes.filter((v) => v.action === 'HOLD').length
  return `Trees vote: ${buys} BUY, ${sells} SELL, ${holds} HOLD`
}
