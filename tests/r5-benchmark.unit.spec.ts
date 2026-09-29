import { describe, expect, it } from 'vitest'
import { nearestRank, pairedDelta, summarize } from '../benchmarks/r5-stats.mjs'

describe('T05 bounded benchmark statistics', () => {
  it('uses documented nearest-rank P50/P95/P99 and MAX', () => {
    const values = [1, 2, 3, 4]
    expect(nearestRank(values, 0.5)).toBe(2)
    expect(nearestRank(values, 0.95)).toBe(4)
    expect(nearestRank(values, 0.99)).toBe(4)
    expect(summarize(values)).toMatchObject({ n: 4, min: 1, mean: 2.5, p50: 2, p95: 4, p99: 4, max: 4 })
  })

  it('keeps paired signed deltas, including negative values', () => {
    expect(pairedDelta([10, 20, 30], [8, 25, 30])).toEqual([-2, 5, 0])
    expect(summarize([-2, 5, 0])).toMatchObject({ n: 3, min: -2, mean: 1, p50: 0, p95: 5, p99: 5, max: 5 })
  })

  it('does not manufacture a percentile from an empty distribution', () => {
    expect(summarize([])).toMatchObject({ n: 0, p50: null, p95: null, p99: null, max: null })
  })
})
