import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase5.mjs'

describe('Phase 5 R5 follow-up full local run', () => {
  it('keeps provider latency and production policy explicitly unmeasured', async () => {
    const output = await main({ smoke: false })
    expect(output.run.mode).toBe('FULL')
    expect(output.localPaths.contextMs.length).toBe(32)
    expect(output.nonClaims).toEqual({ realProviderP50P95P99: 'REAL_PROVIDER_NOT_RUN', productionTimeoutConcurrencyPolicy: 'PRODUCTION_POLICY_UNDETERMINED' })
  }, 1800000)
})
