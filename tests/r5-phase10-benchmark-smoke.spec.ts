import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase10.mjs'

describe('Phase 10 benchmark smoke', () => {
  it('measures real pinned ApprovalService and bounded local product lanes', async () => {
    const output = await main({ smoke: true, writeArtifact: false })
    expect(output.run).toMatchObject({ mode: 'SMOKE', harnessPinned: 'ddefc45fbc7f8e46dd73185e68295696d1297887' })
    expect(output.realPinnedRuntime).toMatchObject({ evidenceClass: 'REAL_PINNED_RUNTIME', outcome: 'allowed-once', nativeAnswerer: 'one-per-iteration' })
    expect(output.local.distributions.shellAnalysis.summary.n).toBe(20)
    expect(output.local.scheduler).toMatchObject({ completed: true, timeoutMs: 5000, maxConcurrent: 2, maxPending: 8 })
    expect(output.external).toEqual({ providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0, harnessTrackedMutations: 0 })
  }, 600000)
})
