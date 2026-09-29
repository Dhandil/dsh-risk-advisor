export function finiteSamples(values) {
  return values.filter(value => Number.isFinite(value)).map(Number)
}

export function nearestRank(values, quantile) {
  const samples = finiteSamples(values).sort((a, b) => a - b)
  if (samples.length === 0) return null
  if (!(quantile > 0 && quantile <= 1)) throw new RangeError('quantile must be in (0, 1]')
  const rank = Math.max(1, Math.ceil(quantile * samples.length))
  return samples[rank - 1]
}

export function summarize(values) {
  const samples = finiteSamples(values)
  if (samples.length === 0) {
    return Object.freeze({ n: 0, warmup: 0, min: null, mean: null, p50: null, p95: null, p99: null, max: null })
  }
  const total = samples.reduce((sum, value) => sum + value, 0)
  return Object.freeze({
    n: samples.length,
    warmup: 0,
    min: Math.min(...samples),
    mean: total / samples.length,
    p50: nearestRank(samples, 0.50),
    p95: nearestRank(samples, 0.95),
    p99: nearestRank(samples, 0.99),
    max: Math.max(...samples),
  })
}

export function pairedDelta(baseline, treatment) {
  if (baseline.length !== treatment.length) throw new Error('paired samples must have equal length')
  return treatment.map((value, index) => value - baseline[index])
}

export function roundSamples(values, digits = 4) {
  const scale = 10 ** digits
  return values.map(value => Math.round(value * scale) / scale)
}
