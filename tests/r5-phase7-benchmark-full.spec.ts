import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase7.mjs'

describe('Phase 7 local verifier benchmark full', () => {
  it('measures the bounded local verifier suite without external calls', async () => {
    const output = await main({ smoke: false })
    expect(output.run).toMatchObject({ benchmark: 'R5_PHASE7_LOCAL_VERIFIER', labels: ['LOCAL_VERIFIER_ONLY', 'NETWORK_NOT_USED', 'PROVIDER_NOT_USED'] })
    expect(output.direct.write).toHaveLength(output.run.samples)
    expect(output.direct.edit).toHaveLength(output.run.samples)
    expect(output.scheduler.completed).toBe(output.run.samples)
  }, 600000)
})
