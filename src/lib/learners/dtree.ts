import type { Action } from '../market/types'

/**
 * Decision Tree learner from ML4T DTLearner.py
 *
 * Builds a binary tree that splits on indicator features.
 * Split selection: feature with highest absolute correlation to target.
 * Split value: median of that feature in current subset.
 * Leaf: predicts median target value when samples <= leafSize or all same.
 *
 * Tree stored as flat array: [featureIdx, splitVal, leftOffset, rightOffset]
 * Leaf: featureIdx = -1, splitVal = prediction
 */

export interface TreeNode {
  feature: number   // -1 for leaf
  splitVal: number  // prediction if leaf
  left: number      // offset to left child
  right: number     // offset to right child
}

const FEATURE_NAMES = ['smaDistance', 'bbp', 'macdHist', 'stochK', 'roc'] as const
const LEAF_SIZE = 5

export class DecisionTree {
  tree: TreeNode[] = []
  trained = false

  train(X: number[][], y: number[]): void {
    this.tree = this.buildTree(X, y)
    this.trained = true
  }

  private buildTree(X: number[][], y: number[]): TreeNode[] {
    if (y.length <= LEAF_SIZE) {
      const median = this.median(y)
      return [{ feature: -1, splitVal: median, left: 0, right: 0 }]
    }

    const allSame = y.every((v) => v === y[0])
    if (allSame) {
      return [{ feature: -1, splitVal: y[0]!, left: 0, right: 0 }]
    }

    // Pick best feature by absolute correlation
    let bestFeature = 0
    let bestCorr = -1
    for (let f = 0; f < X[0]!.length; f++) {
      const col = X.map((row) => row[f]!)
      const corr = Math.abs(this.correlation(col, y))
      if (corr > bestCorr) {
        bestCorr = corr
        bestFeature = f
      }
    }

    const col = X.map((row) => row[bestFeature]!)
    const splitVal = this.median(col)

    // Partition
    const leftX: number[][] = [], leftY: number[] = []
    const rightX: number[][] = [], rightY: number[] = []
    for (let i = 0; i < X.length; i++) {
      if (X[i]![bestFeature]! <= splitVal) {
        leftX.push(X[i]!)
        leftY.push(y[i]!)
      } else {
        rightX.push(X[i]!)
        rightY.push(y[i]!)
      }
    }

    // If can't split, make leaf
    if (leftY.length === 0 || rightY.length === 0) {
      return [{ feature: -1, splitVal: this.median(y), left: 0, right: 0 }]
    }

    const leftTree = this.buildTree(leftX, leftY)
    const rightTree = this.buildTree(rightX, rightY)

    const root: TreeNode = {
      feature: bestFeature,
      splitVal,
      left: 1,
      right: 1 + leftTree.length,
    }

    return [root, ...leftTree, ...rightTree]
  }

  predict(x: number[]): number {
    if (!this.trained || this.tree.length === 0) return 0
    let idx = 0
    while (idx < this.tree.length) {
      const node = this.tree[idx]!
      if (node.feature === -1) return node.splitVal
      if (x[node.feature]! <= node.splitVal) idx += node.left
      else idx += node.right
    }
    return 0
  }

  /** Returns the path of feature splits used for the current prediction */
  getPath(x: number[]): { feature: string; splitVal: number; went: 'left' | 'right' }[] {
    const path: { feature: string; splitVal: number; went: 'left' | 'right' }[] = []
    if (!this.trained) return path
    let idx = 0
    while (idx < this.tree.length) {
      const node = this.tree[idx]!
      if (node.feature === -1) break
      const went = x[node.feature]! <= node.splitVal ? 'left' : 'right'
      path.push({ feature: FEATURE_NAMES[node.feature] ?? `f${node.feature}`, splitVal: node.splitVal, went })
      idx += went === 'left' ? node.left : node.right
    }
    return path
  }

  get depth(): number {
    if (this.tree.length === 0) return 0
    return this.measureDepth(0)
  }

  private measureDepth(idx: number): number {
    if (idx >= this.tree.length) return 0
    const node = this.tree[idx]!
    if (node.feature === -1) return 1
    return 1 + Math.max(this.measureDepth(idx + node.left), this.measureDepth(idx + node.right))
  }

  private median(arr: number[]): number {
    const s = [...arr].sort((a, b) => a - b)
    const mid = Math.floor(s.length / 2)
    return s.length % 2 !== 0 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
  }

  private correlation(x: number[], y: number[]): number {
    const n = x.length
    if (n < 2) return 0
    const mx = x.reduce((a, b) => a + b, 0) / n
    const my = y.reduce((a, b) => a + b, 0) / n
    let num = 0, dx = 0, dy = 0
    for (let i = 0; i < n; i++) {
      const xi = x[i]! - mx
      const yi = y[i]! - my
      num += xi * yi
      dx += xi * xi
      dy += yi * yi
    }
    const denom = Math.sqrt(dx * dy)
    return denom === 0 ? 0 : num / denom
  }
}

export function dtreeDecision(prediction: number): Action {
  if (prediction > 0.002) return 'BUY'
  if (prediction < -0.002) return 'SELL'
  return 'HOLD'
}

export function explainDTree(path: { feature: string; splitVal: number; went: 'left' | 'right' }[]): string {
  if (path.length === 0) return 'No tree path'
  return path.map((p) => `${p.feature} ${p.went === 'left' ? '<=' : '>'} ${p.splitVal.toFixed(4)}`).join(' -> ')
}
