import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase5.mjs'

describe('Phase 5 R5 follow-up smoke', () => {
  it('measures implemented local paths and preserves Native Approval parity', async () => {
    const output = await main({ smoke: true })
    expect(output.run.benchmark).toBe('R5_PHASE5_FOLLOW_UP')
    expect(output.localPaths.labels).toMatchObject({ evidence: 'LOCAL_MOCK_ONLY', providerLatency: 'REAL_PROVIDER_NOT_RUN' })
    expect(output.nativeApproval).toMatchObject({ outcome: 'allowed-once', answerers: 1 })
  }, 600000)
})
