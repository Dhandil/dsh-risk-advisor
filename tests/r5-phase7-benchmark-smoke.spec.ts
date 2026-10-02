import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase7.mjs'

describe('Phase 7 local verifier benchmark smoke', () => {
  it('measures only implemented local paths', async () => {
    const output = await main({ smoke: true })
    expect(output.run).toMatchObject({ benchmark: 'R5_PHASE7_LOCAL_VERIFIER', labels: ['LOCAL_VERIFIER_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED'] })
    expect(output.scheduler.completed).toBe(output.run.samples)
    expect(output.scheduler.maxConcurrent).toBe(2)
    expect(output.scheduler.maxPending).toBe(8)
    expect(output.nonClaims).toEqual({ provider: 'PROVIDER_NOT_USED', network: 'NETWORK_NOT_USED', registry: 'NETWORK_NOT_USED' })
  }, 600000)
})
