import { describe, expect, it } from 'vitest'
import { main } from '../benchmarks/r5-phase9.mjs'

describe('Phase 9 local Deep Judge benchmark smoke', () => {
  it('traverses structural reviewer, scheduler, A4 candidate validation, and V4 locally', async () => {
    const output = await main({ smoke: true })
    expect(output.run).toMatchObject({ benchmark: 'R5_PHASE9_LOCAL_DEEP_JUDGE', realProductExecution: true, labels: ['LOCAL_REVIEWER_ONLY', 'EXTERNAL_PROVIDER_NOT_USED', 'NETWORK_NOT_USED', 'REGISTRY_NOT_USED', 'GIT_REMOTE_NOT_USED'] })
    expect(output.trigger).toMatchObject({ executed: true, a4CandidateValidated: true, alternativeVerification: 'UNVERIFIED', nonCompletedRejected: true, productPath: { materialEvidenceRequired: true, deepTriggered: true, a4SupersedesA3: true, evidencePreserved: true, requestIsolation: true, promptWireShape: true, payloadOverlayMatches: true, disposalCount: 1, browserStage: 'complete' } })
    expect(output.request).toMatchObject({ maxDepth: 1, allow: [], hasSchema: true, signal: true, prompt: [{ type: 'text', text: '{"bounded":true}' }], promptWireShape: true, schemaErrors: [] })
    expect(output.lifecycle.runDisposals).toBe(1)
    expect(output.lifecycle.browserStage).toBe('deep')
    expect(output.saturation.saturated).toBeGreaterThan(0)
    expect(output.timeoutOwnership).toMatchObject({ logicalTimeout: 'DEEP_JUDGE_TIMEOUT', heldSlot: true, queuedBeforeDrain: true, queuedAfterDrain: true, lateDisposed: 1 })
    expect(output.external).toEqual({ providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0 })
  }, 600000)
})
