import { afterEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { parseCorrectionHistoricalContextRead, parseCorrectionHistoricalContextRequest } from '../src/correction-historical-context-contract.ts'
import { handleCorrectionHistoricalContextRpc } from '../src/host/correction-historical-context-bridge.ts'
import { CorrectionHistoricalIdentityRegistry } from '../src/host/correction-historical-identity.ts'
import { LiveCorrectionRuntime, liveCorrectionFindingId } from '../src/host/live-correction.ts'
import type { FailureChainSummary } from '../src/host/retry-escalation.ts'
import type { ExecutionId } from '../src/host/correlation.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'
import { createQualifiedHistoryFixture, type QualifiedHistoryFixture } from './p14-2-historical-context-fixtures.ts'

const histories: QualifiedHistoryFixture[] = []
afterEach(async () => { await Promise.all(histories.splice(0).map(history => history.close())) })

function session(id: string): Session { return { id, header: { cwd: '/private/p14-4-workspace' } } as unknown as Session }
function execution(owner: Session, callId: string): ToolExecution {
  return { name: 'write', arguments: { file_path: '/private/p14-4-workspace/secret.txt', content: 'p14-4-raw-content-sentinel' },
    callId, rootCallId: callId, agent: { session: owner }, signal: new AbortController().signal, token: Symbol(callId) } as unknown as ToolExecution
}
function patternId(history: QualifiedHistoryFixture): string {
  const id = history.patterns.diagnostics.patternIds()[0]
  if (id === undefined || history.guidance.diagnostics.currentForPattern(id) === undefined) throw new Error('trusted fixture did not qualify Guidance')
  return id
}
function failure(executionId: ExecutionId, overrides: Partial<FailureChainSummary> = {}): FailureChainSummary {
  return Object.freeze({ executionId, status: 'READY', retryOf: 'ra-execution-p14-4-prior', retryCount: 1,
    recentFailureCount: 2, sameRootCause: true, permissionEscalation: false, truncated: false,
    reasonCodes: Object.freeze([]), recent: Object.freeze([]), ...overrides })
}
function mismatch(executionId: ExecutionId, observedAt = Date.now()): VerificationRecordV1 {
  return Object.freeze({ schemaVersion: 1, executionId, source: 'tool-contract', adapterId: 'tool.write.v1',
    status: 'MISMATCHED', semanticSuccess: false, evidenceQuality: 'medium', reasonCodes: Object.freeze(['POSTCONDITION_MISMATCH']),
    observedAt, durationMs: 1 })
}
function sessionStore(...owners: Session[]) { return { get: (id: string) => owners.find(owner => owner.id === id) } as never }

async function rpc(
  owner: Session,
  runtime: LiveCorrectionRuntime,
  identities: CorrectionHistoricalIdentityRegistry,
  history: QualifiedHistoryFixture,
  findingId: string,
  signal = new AbortController().signal,
  guidance = history.guidance.diagnostics,
) {
  return handleCorrectionHistoricalContextRpc(sessionStore(owner), runtime.diagnostics, identities, guidance,
    'risk-advisor/correction-historical-context', { sessionId: owner.id, findingId }, signal)
}

describe('Phase 14.4 Correction Historical Context C1–C12', () => {
  it('C4 preserves exact synchronous settlement order before both direct and deferred verifier observation', async () => {
    const source = await readFile(join(process.cwd(), 'src/index.ts'), 'utf8')
    const resultStart = source.indexOf('retire: (exec, result, index, executionId) => {')
    const failureSettlement = source.indexOf('failureChain.observeResult(exec, result)', resultStart)
    const associationSettlement = source.indexOf('correctionHistoricalIdentity.settle(exec.agent?.session, executionId)', resultStart)
    const f1Observation = source.indexOf('liveCorrection.observeSettledResult', resultStart)
    const verifierObservation = source.indexOf('verifier.observeResult(exec, result)', resultStart)
    expect(resultStart).toBeGreaterThanOrEqual(0)
    expect(failureSettlement).toBeGreaterThan(resultStart)
    expect(associationSettlement).toBeGreaterThan(failureSettlement)
    expect(f1Observation).toBeGreaterThan(associationSettlement)
    expect(verifierObservation).toBeGreaterThan(f1Observation)
    expect(source).toContain('correctionHistoricalIdentity.capture(session, executionId, runtimeRisk.capturedPreExecuteHistoricalPatternId(session, executionId))')
  })

  it('C3–C5 copies only trusted opaque identity, binds exact Session/Execution after settlement, and fails closed on repeats or capacity', async () => {
    const history = await createQualifiedHistoryFixture()
    histories.push(history)
    const id = patternId(history)
    let now = 100
    const registry = new CorrectionHistoricalIdentityRegistry({ clock: () => now })
    const owner = session('p14-4-registry-session')
    const other = session('p14-4-registry-other')
    const first = 'ra-execution-p14-4-first' as ExecutionId
    registry.capture(owner, first, id)
    expect(registry.currentForSettled(owner, first)).toBeUndefined()
    registry.settle(owner, first)
    expect(registry.currentForSettled(owner, first)).toBe(id)
    expect(registry.currentForSettled(other, first)).toBeUndefined()

    const repeated = 'ra-execution-p14-4-repeat' as ExecutionId
    registry.capture(owner, repeated, id)
    registry.capture(owner, repeated, id)
    registry.settle(owner, repeated)
    expect(registry.currentForSettled(owner, repeated)).toBeUndefined()
    const crossed = 'ra-execution-p14-4-cross' as ExecutionId
    registry.capture(owner, crossed, id)
    registry.capture(other, crossed, id)
    registry.settle(owner, crossed)
    expect(registry.currentForSettled(owner, crossed)).toBeUndefined()
    const unavailableDuplicate = 'ra-execution-p14-4-unavailable-duplicate' as ExecutionId
    registry.capture(owner, unavailableDuplicate, id)
    registry.capture(owner, unavailableDuplicate, undefined)
    registry.settle(owner, unavailableDuplicate)
    expect(registry.currentForSettled(owner, unavailableDuplicate)).toBeUndefined()

    now += 1
    registry.settle(owner, first)
    expect(registry.currentForSettled(owner, first)).toBeUndefined()

    const full = new CorrectionHistoricalIdentityRegistry({ clock: () => now })
    for (let index = 0; index < 512; index += 1) full.capture(owner, `ra-execution-p14-4-cap-${index}` as ExecutionId, id)
    full.capture(owner, 'ra-execution-p14-4-over-cap' as ExecutionId, id)
    full.settle(owner, 'ra-execution-p14-4-over-cap' as ExecutionId)
    expect(full.currentForSettled(owner, 'ra-execution-p14-4-over-cap' as ExecutionId)).toBeUndefined()
    full.settle(owner, 'ra-execution-p14-4-cap-0' as ExecutionId)
    full.capture(owner, 'ra-execution-p14-4-after-room' as ExecutionId, id)
    full.settle(owner, 'ra-execution-p14-4-after-room' as ExecutionId)
    expect(full.currentForSettled(owner, 'ra-execution-p14-4-after-room' as ExecutionId)).toBe(id)
    now += 5 * 60 * 1000
    expect(full.currentForSettled(owner, 'ra-execution-p14-4-after-room' as ExecutionId)).toBeUndefined()
    expect(JSON.stringify(registry)).not.toContain('p14-4-raw-content-sentinel')
    expect(JSON.stringify(registry)).not.toContain('/private/p14-4-workspace/secret.txt')
    registry.dispose(); full.dispose()
  })

  it('C1/C2/C6/C8 returns trusted context only for the newest real F1/F2 Finding and keeps both predicates unchanged', async () => {
    const history = await createQualifiedHistoryFixture()
    histories.push(history)
    const trustedPattern = patternId(history)
    let now = Date.now()
    const owner = session('p14-4-host-session')
    const live = new LiveCorrectionRuntime({ clock: () => now })
    const identity = new CorrectionHistoricalIdentityRegistry({ clock: () => now })
    const firstId = 'ra-execution-p14-4-host-f1-a' as ExecutionId
    identity.capture(owner, firstId, trustedPattern); identity.settle(owner, firstId)
    live.observeSettledResult(execution(owner, String(firstId)), firstId, failure(firstId))
    const firstFinding = live.diagnostics.forSession(owner).findings[0]!
    expect(firstFinding).toMatchObject({ kind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', diagnosis: 'REPEATED_SAME_SIGNATURE_FAILURE', advisoryCode: 'STOP_EXACT_RETRY_PATH_V1' })
    const result = await rpc(owner, live, identity, history, firstFinding.findingId)
    expect(result).toMatchObject({ ok: true, value: { kind: 'VIEW', sessionId: owner.id, findingId: firstFinding.findingId,
      findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', historical: { evidenceStrength: 'QUALIFIED_PATTERN', supportCount: 3, supportUtcDateCount: 3 } } })
    expect(JSON.stringify(result)).not.toContain(String(firstId))
    expect(JSON.stringify(result)).not.toContain('/private/p14-4-workspace/secret.txt')
    expect(JSON.stringify(result)).not.toContain('p14-4-raw-content-sentinel')

    now += 10
    const secondId = 'ra-execution-p14-4-host-f1-b' as ExecutionId
    identity.capture(owner, secondId, trustedPattern); identity.settle(owner, secondId)
    live.observeSettledResult(execution(owner, String(secondId)), secondId, failure(secondId))
    const newest = [...live.diagnostics.forSession(owner).findings].sort((a, b) => b.observedAt - a.observedAt || a.findingId.localeCompare(b.findingId))[0]!
    expect((await rpc(owner, live, identity, history, firstFinding.findingId)).value).toMatchObject({ kind: 'NOT_FOUND' })
    expect((await rpc(owner, live, identity, history, newest.findingId)).value).toMatchObject({ kind: 'VIEW', findingKind: newest.kind })

    const f2Id = 'ra-execution-p14-4-host-f2' as ExecutionId
    identity.capture(owner, f2Id, trustedPattern); identity.settle(owner, f2Id)
    live.observeSettledResult(execution(owner, String(f2Id)), f2Id, failure(f2Id, { retryCount: 0, recentFailureCount: 0, sameRootCause: false, retryOf: undefined }))
    live.observeVerification(mismatch(f2Id, now))
    const f2 = live.diagnostics.forSession(owner).findings.find(item => item.executionId === f2Id)!
    expect(f2).toMatchObject({ kind: 'POSTCONDITION_NOT_SATISFIED', diagnosis: 'VERIFIED_POSTCONDITION_MISMATCH', advisoryCode: 'INSPECT_UNSATISFIED_POSTCONDITION_V1' })
    expect((await rpc(owner, live, identity, history, f2.findingId)).value).toMatchObject({ kind: 'NOT_FOUND' })
    // A later F1 remains the topmost Finding, so the older F2 cannot request history.
    now += 10
    const laterF1 = 'ra-execution-p14-4-host-f1-later' as ExecutionId
    identity.capture(owner, laterF1, trustedPattern); identity.settle(owner, laterF1)
    live.observeSettledResult(execution(owner, String(laterF1)), laterF1, failure(laterF1))
    // A still newer F2 becomes eligible; no older Finding is enumerated by the browser.
    const f2Again = 'ra-execution-p14-4-host-f2-later' as ExecutionId
    identity.capture(owner, f2Again, trustedPattern); identity.settle(owner, f2Again)
    now += 10
    live.observeSettledResult(execution(owner, String(f2Again)), f2Again, failure(f2Again, { retryCount: 0, recentFailureCount: 0, sameRootCause: false, retryOf: undefined }))
    live.observeVerification(mismatch(f2Again, now))
    const f2Newest = live.diagnostics.forSession(owner).findings.find(item => item.executionId === f2Again)!
    expect((await rpc(owner, live, identity, history, f2Newest.findingId)).value).toMatchObject({ kind: 'VIEW', findingKind: 'POSTCONDITION_NOT_SATISFIED' })

    const other = session('p14-4-host-cross-session')
    expect((await rpc(other, live, identity, history, f2Newest.findingId)).value).toMatchObject({ kind: 'NOT_FOUND', sessionId: other.id })
    expect((await rpc(owner, live, identity, history, f2Newest.findingId, AbortSignal.abort())).ok).toBe(false)
    live.dispose(); identity.dispose()
  })

  it('C2/C7 hides expired, missing, revoked, or structurally mismatched history without changing the Finding', async () => {
    const history = await createQualifiedHistoryFixture()
    histories.push(history)
    const owner = session('p14-4-revocation-session')
    let now = Date.now()
    const live = new LiveCorrectionRuntime({ clock: () => now })
    const identity = new CorrectionHistoricalIdentityRegistry({ clock: () => now })
    const executionId = 'ra-execution-p14-4-revocation' as ExecutionId
    const validPattern = patternId(history)
    identity.capture(owner, executionId, validPattern); identity.settle(owner, executionId)
    live.observeSettledResult(execution(owner, String(executionId)), executionId, failure(executionId))
    const finding = live.diagnostics.forSession(owner).findings[0]!
    expect((await rpc(owner, live, identity, history, finding.findingId)).value).toMatchObject({ kind: 'VIEW' })

    const fakeRevision = { ...history.guidance.diagnostics.currentForPattern(validPattern)!, patternId: `ra-pattern-v1_${'f'.repeat(64)}` }
    const mismatchedGuidance = { ...history.guidance.diagnostics, currentForPattern: () => fakeRevision } as typeof history.guidance.diagnostics
    expect((await rpc(owner, live, identity, history, finding.findingId, new AbortController().signal, mismatchedGuidance)).value)
      .toMatchObject({ kind: 'UNAVAILABLE', reasonCodes: ['PROJECTION_UNAVAILABLE'] })

    const episode = history.episodes[3]!
    history.outcomes.observeVerification({ ...mismatch(episode.sourceExecutionId as ExecutionId), observedAt: episode.observedAt })
    await history.outcomes.drain(); await history.patterns.drain(); await history.guidance.drain()
    expect((await rpc(owner, live, identity, history, finding.findingId)).value).toMatchObject({ kind: 'NOT_FOUND' })
    expect(live.diagnostics.forSession(owner).findings[0]?.findingId).toBe(finding.findingId)

    now += 5 * 60 * 1000
    expect((await rpc(owner, live, identity, history, finding.findingId)).value).toMatchObject({ kind: 'NOT_FOUND' })
    live.dispose(); identity.dispose()
  })

  it('C8 enforces exact requests, bounded fixed response schema, and aborts before reading', async () => {
    const history = await createQualifiedHistoryFixture()
    histories.push(history)
    const owner = session('p14-4-contract-session')
    const live = new LiveCorrectionRuntime()
    const identity = new CorrectionHistoricalIdentityRegistry()
    expect(parseCorrectionHistoricalContextRequest({ sessionId: owner.id, findingId: `ra-correction-v1_${'a'.repeat(64)}` })).toBeDefined()
    expect(parseCorrectionHistoricalContextRequest({ sessionId: owner.id, findingId: `ra-correction-v1_${'a'.repeat(64)}`, executionId: 'secret' })).toBeUndefined()
    expect(parseCorrectionHistoricalContextRequest({ sessionId: owner.id, findingId: 'anything' })).toBeUndefined()
    const value = { schemaVersion: 1, kind: 'NOT_FOUND', sessionId: owner.id, findingId: `ra-correction-v1_${'a'.repeat(64)}` }
    expect(parseCorrectionHistoricalContextRead(value)).toMatchObject({ kind: 'NOT_FOUND' })
    expect(Object.isFrozen(parseCorrectionHistoricalContextRead(value))).toBe(true)
    expect(parseCorrectionHistoricalContextRead({ ...value, executionId: 'forbidden' })).toBeUndefined()
    expect((await handleCorrectionHistoricalContextRpc(sessionStore(owner), live.diagnostics, identity, history.guidance.diagnostics,
      'risk-advisor/correction-historical-context', value, AbortSignal.abort())).ok).toBe(false)
    live.dispose(); identity.dispose()
  })

  it('C7 revalidates current Finding and Guidance revision immediately before returning a VIEW', async () => {
    const history = await createQualifiedHistoryFixture()
    histories.push(history)
    const owner = session('p14-4-toctou-session')
    const live = new LiveCorrectionRuntime()
    const identity = new CorrectionHistoricalIdentityRegistry()
    const executionId = 'ra-execution-p14-4-toctou' as ExecutionId
    identity.capture(owner, executionId, patternId(history)); identity.settle(owner, executionId)
    live.observeSettledResult(execution(owner, String(executionId)), executionId, failure(executionId))
    const finding = live.diagnostics.forSession(owner).findings[0]!
    let reads = 0
    const guidance = { ...history.guidance.diagnostics, currentForPattern: (id: string) => {
      reads += 1
      return reads === 1 ? history.guidance.diagnostics.currentForPattern(id) : undefined
    } } as typeof history.guidance.diagnostics
    expect((await rpc(owner, live, identity, history, finding.findingId, new AbortController().signal, guidance)).value)
      .toMatchObject({ kind: 'NOT_FOUND' })
    expect(reads).toBeGreaterThanOrEqual(2)
    live.dispose(); identity.dispose()
  })
})

describe('Phase 14.4 sidecar lifecycle', () => {
  it('drops session references on dispose and clears the whole runtime generation', async () => {
    const history = await createQualifiedHistoryFixture()
    histories.push(history)
    const id = patternId(history)
    const registry = new CorrectionHistoricalIdentityRegistry()
    const owner = session('p14-4-dispose-session')
    const executionId = 'ra-execution-p14-4-dispose' as ExecutionId
    registry.capture(owner, executionId, id); registry.settle(owner, executionId)
    expect(registry.currentForSettled(owner, executionId)).toBe(id)
    registry.disposeSession(owner)
    expect(registry.currentForSettled(owner, executionId)).toBeUndefined()
    registry.dispose()
    registry.capture(owner, 'ra-execution-p14-4-after-dispose' as ExecutionId, id)
    expect(registry.currentForSettled(owner, 'ra-execution-p14-4-after-dispose' as ExecutionId)).toBeUndefined()
  })
})
