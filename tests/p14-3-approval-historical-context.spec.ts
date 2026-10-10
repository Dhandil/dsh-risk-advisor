import { platform as runtimePlatform } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { LlmAdapter, createUserMessage, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import type { ExecutionId } from '../src/host/correlation.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import { RuntimeRiskAwarenessRuntime } from '../src/host/runtime-risk-awareness.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import type { FoundationDiagnostics } from '../src/host/operation-foundation.ts'
import type { FailureChainDiagnostics, FailureChainSummary } from '../src/host/retry-escalation.ts'
import type { RuleDiagnostics, RuleEvaluation } from '../src/host/rule-engine.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'
import { handleRiskAdvisorRpc, type ConnectionRpcResultLike } from '../src/host/browser-bridge.ts'
import { parseApprovalHistoricalContextRead } from '../src/approval-historical-context-contract.ts'
import { createQualifiedHistoryFixture, type QualifiedHistoryFixture } from './p14-2-historical-context-fixtures.ts'
import { normalizeExperiencePlatform } from '../src/host/experience-schema.ts'

const histories: QualifiedHistoryFixture[] = []
afterEach(async () => { await Promise.all(histories.splice(0).map(history => history.close())) })

function session(id: string): Session { return { id, header: { cwd: '/private/p14-3-fixture' } } as unknown as Session }
function execution(owner: Session, callId: string): ToolExecution {
  return { name: 'write', arguments: { file_path: '/private/p14-3-fixture/file.txt', content: 'p14-3-raw-content-sentinel' }, callId, rootCallId: callId,
    agent: { session: owner }, signal: new AbortController().signal, token: Symbol(callId) } as unknown as ToolExecution
}
function rule(executionId: string): RuleEvaluation {
  return Object.freeze({ schemaVersion: 1, rulesetVersion: 'phase4-v1', executionId, status: 'READY', operationKind: 'filesystem-write',
    parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none', workspaceContained: 'unknown',
    sandboxCovered: 'unknown', reversible: 'unknown', failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0,
      sameRootCause: false, permissionEscalation: false, degraded: false }, findings: Object.freeze([]), reasonCodes: Object.freeze([]) }) as RuleEvaluation
}
function setup(options: ConstructorParameters<typeof ApprovalAssessmentCoordinator>[1] = {}) {
  let now = 100
  const evaluations = new Map<string, RuleEvaluation>()
  const expectedEffects = new ExpectedEffectRegistry({ clock: () => now })
  const foundation = { get: (executionId: string) => ({ executionId, status: 'CAPTURED', toolKind: 'filesystem-write', reasonCodes: [],
    boundary: { workspaceContained: 'unknown', targetScope: 'unknown', sandboxActive: 'unknown', sandboxCovered: 'unknown', rollbackAvailable: 'unknown', checkpointAvailable: 'unknown' } }) } as unknown as FoundationDiagnostics
  const rules = { get: (id: string) => evaluations.get(id)! } as RuleDiagnostics
  const failureChain = { get: (id: string) => ({ executionId: id, status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false,
    permissionEscalation: false, truncated: false, reasonCodes: Object.freeze([]), recent: Object.freeze([]) }) as FailureChainSummary } as FailureChainDiagnostics
  const ledger = { snapshot: (owner: Session) => ({ sessionId: owner.id, health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true,
    truncated: false, issues: [], executions: [], approvals: [] }) } as unknown as LedgerDiagnostics
  const runtime = new RuntimeRiskAwarenessRuntime(foundation, rules, failureChain, ledger, { expectedEffects, clock: () => now, schedule: () => () => undefined })
  const coordinator = new ApprovalAssessmentCoordinator(foundation, { rules, failureChain, ledger, runtimeRisk: runtime, clock: () => now, ...options })
  const index = new ActiveExecutionIndex()
  const capture = (owner: Session, callId: string) => {
    const exec = execution(owner, callId)
    const executionId = index.observePreExecute(exec)!
    evaluations.set(executionId, rule(executionId))
    expectedEffects.capture(exec, executionId)
    runtime.capturePreExecute(exec, executionId)
    return executionId
  }
  const ask = (owner: Session, approvalId: string, callId: string) => coordinator.observeSessionEvent(owner,
    { type: 'approval/asked', data: { id: approvalId, toolName: 'write', callId } } as unknown as SessionEvent, index)
  return { runtime, coordinator, index, capture, ask, close: async () => { await coordinator.dispose(); runtime.dispose(); expectedEffects.dispose() } }
}

function sessionsMap(...owners: Session[]) { return { get: (id: string) => owners.find(owner => owner.id === id) } as never }
async function read(env: ReturnType<typeof setup>, owners: Session[], owner: Session, callId: string, signal = new AbortController().signal): Promise<ConnectionRpcResultLike> {
  return handleRiskAdvisorRpc(sessionsMap(...owners), env.coordinator, 'approval-historical-context', { sessionId: owner.id, callId }, signal, env.runtime,
    histories[0]!.guidance.diagnostics)
}
function asked(env: ReturnType<typeof setup>, owner: Session, approvalId: string, callId: string) {
  expect(env.ask(owner, approvalId, callId)).toBe('RECORDED')
}

describe('Phase 14.3 native approval historical context A1–A12', () => {
  it('A1/A2/A4 resolves approval A against stable A1 while ordinary latest execution B is current', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    histories.push(history)
    const env = setup()
    const owner = session('p14-3-overlap-session')
    const executionA = env.capture(owner, 'p14-3-call-a')
    const rowA = env.runtime.query(owner)
    expect(rowA.kind).toBe('VIEW')
    env.capture(owner, 'p14-3-call-b')
    const rowB = env.runtime.query(owner)
    expect(rowB).toMatchObject({ kind: 'VIEW', view: { callId: 'p14-3-call-b' } })
    asked(env, owner, 'host-approval-a', 'p14-3-call-a')
    const latestRiskBefore = JSON.stringify(env.runtime.query(owner))
    const approvalBefore = JSON.stringify(env.coordinator.diagnostics.getForApproval(owner, 'host-approval-a'))
    const binding = env.coordinator.queryOpenApprovalHistoricalBinding(owner, 'p14-3-call-a')
    expect(binding).toMatchObject({ kind: 'VIEW', approvalId: 'host-approval-a', executionId: executionA })
    if (binding.kind !== 'VIEW') throw new Error('expected exact approval binding')
    const response = await read(env, [owner], owner, 'p14-3-call-a')
    expect(response).toMatchObject({ ok: true, value: { kind: 'VIEW', sessionId: owner.id, callId: 'p14-3-call-a', approvalId: 'host-approval-a', executionId: executionA } })
    expect(env.runtime.query(owner)).toMatchObject({ kind: 'VIEW', view: { callId: 'p14-3-call-b' } })
    expect(JSON.stringify(env.runtime.query(owner))).toBe(latestRiskBefore)
    expect(JSON.stringify(env.coordinator.diagnostics.getForApproval(owner, 'host-approval-a'))).toBe(approvalBefore)
    expect(env.runtime.currentApprovalHistoricalPatternId(owner, executionA, binding.baseAssessmentId)).toMatch(/^ra-pattern-v1_[a-f0-9]{64}$/)
    await env.close()
  })

  it('A2 binds the immutable A1 identity when a mock Fast Judge publishes a different latest revision', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    histories.push(history)
    const llmContext = new Context()
    await llmContext.plugin(LlmRuntime)
    llmContext.llm.registerAdapter(['mock'], new NativeApprovalHistoryJudgeFixture())
    await llmContext.plugin(SessionStore)
    const owner = llmContext.sessions.create('p14-3-a1-stability-session')
    owner.append('turn/start', { turn: 1 })
    const env = setup({ fastJudge: { enabled: true, timeoutMs: 1000, maxConcurrentJudges: 1, maxPendingJudges: 2, reviewer: { provider: 'mock', model: 'fixture' } } })
    env.coordinator.attachJudge(llmContext.llm)
    try {
      env.coordinator.observeSessionEvent(owner, { type: 'user/message', data: createUserMessage({ content: [{ type: 'text', text: 'Read a bounded fixture.' }], source: { kind: 'user' } }) } as never, env.index)
      const executionId = env.capture(owner, 'p14-3-a1-stability-call')
      asked(env, owner, 'p14-3-a1-stability-approval', 'p14-3-a1-stability-call')
      const initial = env.coordinator.queryOpenApprovalHistoricalBinding(owner, 'p14-3-a1-stability-call')
      if (initial.kind !== 'VIEW') throw new Error('expected the base A1 binding')
      let latest = env.coordinator.diagnostics.getLatestForApproval(owner, 'p14-3-a1-stability-approval')
      for (let attempt = 0; attempt < 100 && latest?.assessmentId === initial.baseAssessmentId; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 1))
        latest = env.coordinator.diagnostics.getLatestForApproval(owner, 'p14-3-a1-stability-approval')
      }
      expect(latest?.assessmentId).not.toBe(initial.baseAssessmentId)
      const response = await read(env, [owner], owner, 'p14-3-a1-stability-call')
      expect(response).toMatchObject({ ok: true, value: { kind: 'VIEW', approvalId: 'p14-3-a1-stability-approval', executionId, baseAssessmentId: initial.baseAssessmentId } })
      expect(env.coordinator.queryOpenApprovalHistoricalBinding(owner, 'p14-3-a1-stability-call')).toMatchObject(initial)
    } finally {
      await env.close()
      await llmContext.fiber.dispose()
    }
  })

  it('A2/A3/A4 never borrows across Session, duplicate approvals, fallback ownership, or a closed decision', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    histories.push(history)
    const env = setup()
    const first = session('p14-3-cross-session-a')
    const second = session('p14-3-cross-session-b')
    env.capture(first, 'same-call-id')
    env.capture(second, 'same-call-id')
    asked(env, first, 'approval-a', 'same-call-id')
    expect(await read(env, [first, second], first, 'same-call-id')).toMatchObject({ ok: true, value: { kind: 'VIEW', sessionId: first.id } })
    expect(await read(env, [second], second, 'same-call-id')).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND', sessionId: second.id } })
    asked(env, first, 'approval-duplicate', 'same-call-id')
    expect(await read(env, [first], first, 'same-call-id')).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })

    const legacy = session('p14-3-legacy-session')
    env.index.observePreExecute(execution(legacy, 'unindexed-call'))
    asked(env, legacy, 'legacy-approval', 'unindexed-call')
    expect(await read(env, [legacy], legacy, 'unindexed-call')).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })
    env.coordinator.observeSessionEvent(first, { type: 'approval/decided', data: { id: 'approval-a', outcome: 'rejected' } } as never, env.index)
    expect(await read(env, [first], first, 'same-call-id')).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })
    await env.close()
  })

  it('A5/A6 exact request and response parsing fail closed; session disposal, abort, and no-history remain optional', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    histories.push(history)
    const env = setup()
    const owner = session('p14-3-protocol-session')
    env.capture(owner, 'p14-3-protocol-call')
    asked(env, owner, 'p14-3-protocol-approval', 'p14-3-protocol-call')
    const view = await read(env, [owner], owner, 'p14-3-protocol-call')
    expect(view.ok).toBe(true)
    if (!view.ok) throw new Error('expected view')
    const parsed = parseApprovalHistoricalContextRead(view.value)
    expect(parsed?.kind).toBe('VIEW')
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(JSON.stringify(parsed)).not.toContain('p14-3-raw-content-sentinel')
    expect(JSON.stringify(parsed)).not.toContain('/private/p14-3-fixture/file.txt')
    expect(parseApprovalHistoricalContextRead({ ...view.value as object, localKey: 'approval:1' })).toBeUndefined()
    expect((await read(env, [owner], owner, 'p14-3-protocol-call', AbortSignal.abort())).ok).toBe(false)
    await history.guidance.detach()
    expect(await read(env, [owner], owner, 'p14-3-protocol-call')).toMatchObject({ ok: true, value: { kind: 'UNAVAILABLE', reasonCodes: ['GUIDANCE_UNAVAILABLE'] } })
    env.coordinator.observeSessionDisposed(owner)
    expect(await read(env, [owner], owner, 'p14-3-protocol-call')).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })
    await env.close()
  })

  it('A5 re-reads only active current Guidance and never shows suspended history', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    histories.push(history)
    const env = setup()
    const owner = session('p14-3-retraction-session')
    const executionId = env.capture(owner, 'p14-3-retraction-call')
    asked(env, owner, 'p14-3-retraction-approval', 'p14-3-retraction-call')
    expect(await read(env, [owner], owner, 'p14-3-retraction-call')).toMatchObject({ ok: true, value: { kind: 'VIEW' } })
    const episode = history.episodes[3]!
    history.outcomes.observeVerification({ schemaVersion: 1, executionId: episode.sourceExecutionId as ExecutionId, source: 'tool-contract', adapterId: 'tool.write.v1',
      status: 'MISMATCHED', semanticSuccess: false, evidenceQuality: 'medium', reasonCodes: ['POSTCONDITION_MISMATCH'], observedAt: episode.observedAt, durationMs: 1 })
    await history.outcomes.drain(); await history.patterns.drain()
    expect(await read(env, [owner], owner, 'p14-3-retraction-call')).toMatchObject({ ok: true, value: { kind: 'UNAVAILABLE' } })
    await history.guidance.drain()
    expect(await read(env, [owner], owner, 'p14-3-retraction-call')).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })
    expect(env.runtime.currentApprovalHistoricalPatternId(owner, executionId, env.coordinator.queryOpenApprovalHistoricalBinding(owner, 'p14-3-retraction-call').kind === 'VIEW'
      ? (env.coordinator.queryOpenApprovalHistoricalBinding(owner, 'p14-3-retraction-call') as { baseAssessmentId: string }).baseAssessmentId : '')).toBeDefined()
    await env.close()
  })
})

class NativeApprovalHistoryJudgeFixture extends LlmAdapter {
  override async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    const text = JSON.stringify({ schemaVersion: 1, results: [
      { dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'bounded fixture evidence', referencedFeatureIds: [] },
      { dimension: 'NECESSITY', verdict: 'LIKELY_NECESSARY', rationale: 'operation matches the stated fixture goal', referencedFeatureIds: [] },
    ] })
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}
