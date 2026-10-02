import { describe, expect, it, vi } from 'vitest'
import type { BrowserBridgeClientResult, RiskAdvisorBridgeViewV2 } from '../src/bridge-contract.ts'
import { NOT_FOUND_GRACE_MS, POLL_INTERVAL_MS, PresentationStore } from '../src/client/presentation-store.ts'
import type { RiskAdvisorBridgeClient } from '../src/client/assessment-bridge.ts'

function view(stage: 'fast' | 'complete', assessmentId = 'assessment-1'): RiskAdvisorBridgeViewV2 {
  const operation = { schemaVersion: 1 as const, kind: 'filesystem-read' as const, toolName: 'read', title: 'Read a file', summary: 'Read the requested target.', resources: [], parserConfidence: 'high' as const, mutating: false as const, externalEffect: false as const, networkEffect: 'none' as const, workspaceContained: 'unknown' as const, sandboxCovered: 'unknown' as const, reversible: 'unknown' as const }
  const dimension = { verdict: 'UNKNOWN', source: 'RULE' as const, evidenceQuality: 'MEDIUM' as const, reasons: [] }
  const assessment = { schemaVersion: 1 as const, assessmentId, status: 'PARTIAL' as const, dimensions: { risk: dimension, authorization: dimension, necessity: dimension, privilege: dimension, alternatives: dimension, evidenceQuality: dimension }, aggregate: { recommendation: 'NEED_MORE_INFORMATION' as const, hazardLevel: 'UNKNOWN' as const, attention: 'ELEVATED' as const, primaryReasonCodes: [] }, findings: [], uncertainties: [], alternatives: [], evidence: { ledgerHealth: 'HEALTHY' as const }, judgeAssisted: false }
  return Object.freeze({ schemaVersion: 2 as const, sessionId: 'session', callId: 'call', assessmentId, association: 'BOUND' as const, status: 'ready' as const, stage, operation, assessment, failureContext: { schemaVersion: 1 as const, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown' as const, permissionEscalation: 'unknown' as const, truncated: false }, reasonCodes: [], updatedAt: 1 })
}

function bridgeWith(queue: BrowserBridgeClientResult[]): RiskAdvisorBridgeClient {
  return { active: vi.fn(async () => queue.shift() ?? { kind: 'NOT_FOUND' }), assessment: vi.fn(async () => ({ kind: 'NOT_FOUND' as const })) }
}

describe('Phase 6 session/call presentation store', () => {
  it('keeps NOT_FOUND in grace then becomes unavailable after 3000ms', async () => {
    vi.useFakeTimers()
    let now = 0
    const bridge = bridgeWith([{ kind: 'NOT_FOUND' }, { kind: 'NOT_FOUND' }, { kind: 'NOT_FOUND' }, { kind: 'NOT_FOUND' }])
    const store = new PresentationStore(bridge, 'session', 'call', undefined, { now: () => now })
    store.start()
    await vi.runOnlyPendingTimersAsync()
    expect(store.getSnapshot().status).toBe('ANALYZING')
    for (let i = 0; i < 3; i += 1) { now += POLL_INTERVAL_MS; await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS) }
    expect(now).toBe(NOT_FOUND_GRACE_MS)
    expect(store.getSnapshot()).toMatchObject({ status: 'UNAVAILABLE', reason: 'NO_ACTIVE_EXECUTION' })
    store.dispose()
    vi.useRealTimers()
  })

  it('polls fast A1 and publishes A2, then stops on complete', async () => {
    vi.useFakeTimers()
    const bridge = bridgeWith([{ kind: 'VIEW', view: view('fast', 'a1') }, { kind: 'VIEW', view: view('complete', 'a2') }])
    const store = new PresentationStore(bridge, 'session', 'call')
    store.start()
    await Promise.resolve()
    await Promise.resolve()
    expect(store.getSnapshot().view?.assessmentId).toBe('a1')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    await Promise.resolve()
    expect(store.getSnapshot().view?.assessmentId).toBe('a2')
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS * 2)
    expect(bridge.active).toHaveBeenCalledTimes(2)
    store.dispose()
    vi.useRealTimers()
  })

  it('fences stale responses across a connection generation reset', async () => {
    const pending: Array<(value: BrowserBridgeClientResult) => void> = []
    const bridge: RiskAdvisorBridgeClient = { active: vi.fn(() => new Promise(resolve => pending.push(resolve))), assessment: vi.fn(async () => ({ kind: 'NOT_FOUND' as const })) }
    let reset: (() => void) | undefined
    let generation = 1
    const connection = { rpc: { call: vi.fn() }, generation: { getSnapshot: () => generation, subscribe: (listener: () => void) => { reset = listener; return () => {} } } }
    const store = new PresentationStore(bridge, 'session', 'call', connection)
    store.start()
    generation = 2
    reset!()
    await Promise.resolve()
    pending[0]!({ kind: 'VIEW', view: view('complete', 'stale') })
    await Promise.resolve()
    pending[1]!({ kind: 'VIEW', view: view('complete', 'fresh') })
    await Promise.resolve()
    expect(store.getSnapshot().view?.assessmentId).toBe('fresh')
    store.dispose()
  })
})
