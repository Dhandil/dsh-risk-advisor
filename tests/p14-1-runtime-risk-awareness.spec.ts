import { describe, expect, it, vi } from 'vitest'
import { performance } from 'node:perf_hooks'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ExecutionId } from '../src/host/correlation.ts'
import { RuntimeRiskAwarenessRuntime } from '../src/host/runtime-risk-awareness.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import { handleRiskAdvisorRpc } from '../src/host/browser-bridge.ts'
import type { FailureChainDiagnostics, FailureChainSummary } from '../src/host/retry-escalation.ts'
import type { FoundationDiagnostics } from '../src/host/operation-foundation.ts'
import type { RuleDiagnostics, RuleEvaluation } from '../src/host/rule-engine.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'
import { parseRuntimeRiskAwarenessRead } from '../src/bridge-contract.ts'

function setupRuntime(options: ConstructorParameters<typeof RuntimeRiskAwarenessRuntime>[4] = {}) {
  let now = 100
  const callbacks = new Set<() => void>()
  const scheduled: (() => void)[] = []
  const ruleByExecution = new Map<string, RuleEvaluation>()
  const foundation = {
    get: (executionId: string) => ({
      executionId,
      status: 'CAPTURED',
      toolKind: 'filesystem-write',
      reasonCodes: [],
      boundary: { workspaceContained: 'unknown', targetScope: 'unknown', sandboxActive: 'unknown', sandboxCovered: 'unknown', rollbackAvailable: 'unknown', checkpointAvailable: 'unknown' },
    }),
  } as unknown as FoundationDiagnostics
  const rules = { get: (id: string) => ruleByExecution.get(id)! } as RuleDiagnostics
  const failureChain = { get: (id: string) => failureSummary(id) } as FailureChainDiagnostics
  const ledger = {
    snapshot: (session: Session) => ({ sessionId: session.id, health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }),
  } as unknown as LedgerDiagnostics
  const runtime = new RuntimeRiskAwarenessRuntime(foundation, rules, failureChain, ledger, {
    clock: () => now,
    schedule: options.schedule ?? (callback => {
      scheduled.push(callback)
      callbacks.add(callback)
      return () => { callbacks.delete(callback) }
    }),
    ...options,
  })
  return {
    runtime,
    foundation,
    rules,
    failureChain,
    ledger,
    scheduled,
    queued: () => callbacks.size,
    setNow: (value: number) => { now = value },
    addEvaluation: (id: string, evaluation = ruleEvaluation(id)) => { ruleByExecution.set(id, evaluation) },
  }
}

function ruleEvaluation(executionId: string): RuleEvaluation {
  return Object.freeze({
    schemaVersion: 1,
    rulesetVersion: 'phase4-v1',
    executionId,
    status: 'READY',
    operationKind: 'filesystem-write',
    parserConfidence: 'high',
    mutating: true,
    externalEffect: false,
    networkEffect: 'none',
    workspaceContained: 'unknown',
    sandboxCovered: 'unknown',
    reversible: 'unknown',
    failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, degraded: false },
    findings: Object.freeze([]),
    reasonCodes: Object.freeze([]),
  }) as RuleEvaluation
}

function failureSummary(executionId: string): FailureChainSummary {
  return Object.freeze({ executionId, status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, truncated: false, reasonCodes: Object.freeze([]), recent: Object.freeze([]) })
}

function session(id: string): Session { return { id, header: { cwd: '/private/session-root' } } as unknown as Session }

function execution(owner: Session, executionId: string, callId = `call-${executionId}`): ToolExecution {
  return {
    callId,
    rootCallId: callId,
    name: 'write',
    arguments: { file_path: '/private/runtime-risk-sentinel/path', content: 'runtime-risk-raw-content-sentinel' },
    agent: { session: owner },
    signal: new AbortController().signal,
    token: Symbol(executionId),
  } as unknown as ToolExecution
}

describe('Phase 14.1 shared runtime-risk base', () => {
  it('captures one exact Session/ExecutionId, defers scoring, and transfers the same A1 to approval once', () => {
    const fixture = setupRuntime()
    const owner = session('runtime-risk-session-a')
    const exec = execution(owner, 'ra-execution-single-flight')
    fixture.addEvaluation('ra-execution-single-flight')
    fixture.runtime.capturePreExecute(exec, 'ra-execution-single-flight')
    fixture.runtime.capturePreExecute(exec, 'ra-execution-single-flight')

    expect(fixture.queued()).toBe(1)
    expect(fixture.runtime.query(owner)).toMatchObject({ kind: 'VIEW', view: { status: 'PENDING', stage: 'CAPTURED' } })
    const captured = fixture.scheduled[0]!
    const approval = fixture.runtime.claimForApproval(owner, 'ra-execution-single-flight')
    expect(approval.kind).toBe('READY')
    if (approval.kind !== 'READY') throw new Error('expected the frozen shared assessment')
    expect(approval.assessment.assessmentId).toBe(approval.assessmentId)
    expect(fixture.queued()).toBe(0)
    expect(fixture.runtime.query(owner)).toEqual({ kind: 'NOT_FOUND' })

    captured()
    const repeated = fixture.runtime.claimForApproval(owner, 'ra-execution-single-flight')
    expect(repeated.kind).toBe('READY')
    if (repeated.kind === 'READY') expect(repeated.assessment).toBe(approval.assessment)
    fixture.runtime.releaseApproval(owner, 'ra-execution-single-flight')
    expect(fixture.runtime.claimForApproval(owner, 'ra-execution-single-flight')).toEqual({ kind: 'ABSENT' })
    fixture.runtime.dispose()
  })

  it('keeps two distinct Session identities separate even when an ExecutionId is repeated', () => {
    const fixture = setupRuntime()
    const first = session('same-session-id')
    const second = session('same-session-id')
    const executionId = 'ra-execution-cross-session'
    fixture.addEvaluation(executionId)
    fixture.runtime.capturePreExecute(execution(first, executionId), executionId)
    fixture.runtime.capturePreExecute(execution(second, executionId), executionId)
    const firstBase = fixture.runtime.claimForApproval(first, executionId)
    const secondBase = fixture.runtime.claimForApproval(second, executionId)
    expect(firstBase.kind).toBe('READY')
    expect(secondBase.kind).toBe('READY')
    if (firstBase.kind === 'READY' && secondBase.kind === 'READY') {
      expect(firstBase.assessmentId).not.toBe(secondBase.assessmentId)
      expect(firstBase.context.snapshot.executionId).toBe(secondBase.context.snapshot.executionId)
    }
    fixture.runtime.dispose()
  })

  it('keeps same-call concurrent executions distinct when the earlier execution is approval-owned', () => {
    const fixture = setupRuntime()
    const owner = session('runtime-risk-same-call')
    const sharedCallId = 'runtime-risk-same-call-id'
    const firstId = 'ra-execution-same-call-first'
    const secondId = 'ra-execution-same-call-second'
    fixture.addEvaluation(firstId)
    fixture.addEvaluation(secondId)
    fixture.runtime.capturePreExecute(execution(owner, firstId, sharedCallId), firstId)
    const first = fixture.runtime.claimForApproval(owner, firstId)
    fixture.runtime.capturePreExecute(execution(owner, secondId, sharedCallId), secondId)
    const second = fixture.runtime.claimForApproval(owner, secondId)
    expect(first.kind).toBe('READY')
    expect(second.kind).toBe('READY')
    if (first.kind === 'READY' && second.kind === 'READY') expect(first.assessmentId).not.toBe(second.assessmentId)
    fixture.runtime.dispose()
  })

  it('attaches approval/asked to the captured A1 ID, synchronously finishing it before its deferred job', async () => {
    const fixture = setupRuntime()
    const owner = session('runtime-risk-approval-reuse')
    const executionId = 'ra-execution-approval-reuse'
    const callId = `call-${executionId}`
    fixture.addEvaluation(executionId)
    fixture.runtime.capturePreExecute(execution(owner, executionId, callId), executionId)
    const capturedBaseId = (fixture.runtime.query(owner) as { readonly kind: 'VIEW'; readonly view: { readonly assessmentId: string } }).view.assessmentId
    const coordinator = new ApprovalAssessmentCoordinator(fixture.foundation, {
      rules: fixture.rules,
      failureChain: fixture.failureChain,
      ledger: fixture.ledger,
      runtimeRisk: fixture.runtime,
    })
    const index = { lookup: () => ({ status: 'FOUND', executionId }) } as never
    const asked = {
      type: 'approval/asked',
      data: { id: 'runtime-risk-approval-id', toolName: 'write', callId },
    } as never

    expect(coordinator.observeSessionEvent(owner, asked, index)).toBe('RECORDED')
    const assessment = coordinator.diagnostics.getForApproval(owner, 'runtime-risk-approval-id')
    expect(assessment.assessment?.assessmentId).toBe(capturedBaseId)
    expect(assessment.latestAssessmentId).toBe(capturedBaseId)
    expect(fixture.queued()).toBe(0)
    expect(fixture.runtime.query(owner)).toEqual({ kind: 'NOT_FOUND' })
    fixture.scheduled[0]!()
    expect(coordinator.diagnostics.getForApproval(owner, 'runtime-risk-approval-id').assessment?.assessmentId).toBe(capturedBaseId)

    coordinator.observeSessionEvent(owner, { type: 'approval/decided', data: { id: 'runtime-risk-approval-id', outcome: 'allowed-once' } } as never, index)
    expect(fixture.runtime.claimForApproval(owner, executionId)).toEqual({ kind: 'ABSENT' })
    await coordinator.dispose()
    fixture.runtime.dispose()
  })

  it('reuses an already deferred-scored A1 and keeps tools/result from changing its verdict', async () => {
    const fixture = setupRuntime()
    const owner = session('runtime-risk-already-scored')
    const executionId = 'ra-execution-already-scored'
    const callId = `call-${executionId}`
    const exec = execution(owner, executionId, callId)
    fixture.addEvaluation(executionId)
    fixture.runtime.capturePreExecute(exec, executionId)
    const captured = fixture.runtime.query(owner)
    expect(captured.kind).toBe('VIEW')
    if (captured.kind !== 'VIEW') throw new Error('expected a captured base')
    fixture.scheduled[0]!()
    const scored = fixture.runtime.query(owner)
    expect(scored.kind).toBe('VIEW')
    if (scored.kind !== 'VIEW') throw new Error('expected a scored base')
    expect(scored.view.assessmentId).toBe(captured.view.assessmentId)

    const coordinator = new ApprovalAssessmentCoordinator(fixture.foundation, {
      rules: fixture.rules,
      failureChain: fixture.failureChain,
      ledger: fixture.ledger,
      runtimeRisk: fixture.runtime,
    })
    const index = { lookup: () => ({ status: 'FOUND', executionId }) } as never
    expect(coordinator.observeSessionEvent(owner, {
      type: 'approval/asked', data: { id: 'runtime-risk-already-scored-approval', toolName: 'write', callId },
    } as never, index)).toBe('RECORDED')
    expect(coordinator.diagnostics.getForApproval(owner, 'runtime-risk-already-scored-approval').assessment?.assessmentId)
      .toBe(captured.view.assessmentId)

    const assessmentBeforeResult = (fixture.runtime.query(owner) as { readonly kind: 'NOT_FOUND' }).kind
    expect(assessmentBeforeResult).toBe('NOT_FOUND')
    fixture.runtime.observeResult({ ...exec, result: 'result-private-sentinel' } as unknown as ToolExecution, executionId)
    expect(coordinator.diagnostics.getForApproval(owner, 'runtime-risk-already-scored-approval').assessment?.assessmentId)
      .toBe(captured.view.assessmentId)
    coordinator.observeSessionEvent(owner, {
      type: 'approval/decided', data: { id: 'runtime-risk-already-scored-approval', outcome: 'rejected' },
    } as never, index)
    await coordinator.dispose()
    fixture.runtime.dispose()
  })

  it('degrades and scrubs a snapshot that exceeds the 24,000-character retained-context bound', () => {
    const fixture = setupRuntime()
    const owner = session('runtime-risk-context-cap')
    const executionId = 'ra-execution-context-cap'
    const oversizedFindings = Object.freeze(Array.from({ length: 32 }, (_, index) => Object.freeze({
      id: `P14_CONTEXT_CAP_${index}`,
      severity: 'medium' as const,
      category: 'reversibility' as const,
      summary: 'bounded-finding-sentinel-'.repeat(80),
      hard: false,
    })))
    fixture.addEvaluation(executionId, Object.freeze({ ...ruleEvaluation(executionId), findings: oversizedFindings }) as RuleEvaluation)
    fixture.runtime.capturePreExecute(execution(owner, executionId), executionId)
    expect(fixture.runtime.query(owner)).toMatchObject({ kind: 'VIEW', view: { status: 'DEGRADED', stage: 'COMPLETE', reasonCodes: ['CONTEXT_DEGRADED'] } })
    fixture.runtime.dispose()
  })

  it('transfers once to the existing ten-minute Native Approval lifetime', () => {
    const fixture = setupRuntime()
    const owner = session('runtime-risk-approval-ttl')
    const executionId = 'ra-execution-approval-ttl'
    fixture.addEvaluation(executionId)
    fixture.runtime.capturePreExecute(execution(owner, executionId), executionId)
    fixture.setNow(9 * 60 * 1000 + 100)
    expect(fixture.runtime.claimForApproval(owner, executionId).kind).toBe('READY')

    fixture.setNow(19 * 60 * 1000 + 99)
    expect(fixture.runtime.claimForApproval(owner, executionId).kind).toBe('READY')
    fixture.setNow(19 * 60 * 1000 + 101)
    expect(fixture.runtime.query(owner)).toEqual({ kind: 'NOT_FOUND' })
    expect(fixture.runtime.claimForApproval(owner, executionId)).toEqual({ kind: 'ABSENT' })
    fixture.runtime.dispose()
  })

  it('does not fabricate an approval base after bounded queue overflow and expires a non-approval row 30 seconds after result', () => {
    const overflow = setupRuntime({ maxQueued: 0 })
    const overflowSession = session('runtime-risk-overflow')
    const overflowExec = execution(overflowSession, 'ra-execution-overflow')
    overflow.addEvaluation('ra-execution-overflow')
    overflow.runtime.capturePreExecute(overflowExec, 'ra-execution-overflow')
    expect(overflow.runtime.claimForApproval(overflowSession, 'ra-execution-overflow')).toMatchObject({ kind: 'UNAVAILABLE', reasonCodes: ['CAPACITY_EXCEEDED'] })
    overflow.runtime.dispose()

    const fixture = setupRuntime()
    const owner = session('runtime-risk-settled')
    const exec = execution(owner, 'ra-execution-settled')
    fixture.addEvaluation('ra-execution-settled')
    fixture.runtime.capturePreExecute(exec, 'ra-execution-settled')
    fixture.scheduled[0]!()
    const beforeResult = fixture.runtime.query(owner)
    expect(beforeResult).toMatchObject({ kind: 'VIEW', view: { status: 'DEGRADED' } })
    fixture.runtime.observeResult(exec, 'ra-execution-settled')
    expect(fixture.runtime.query(owner)).toMatchObject({ kind: 'VIEW', view: { status: 'DEGRADED' } })
    fixture.setNow(30_101)
    expect(fixture.runtime.query(owner)).toEqual({ kind: 'NOT_FOUND' })
    fixture.runtime.dispose()
  })

  it('enforces the frozen 64-job queue and 256-record bounds without evicting pending work', () => {
    const queueFixture = setupRuntime({ maxQueued: 64 })
    const sessions: Session[] = []
    for (let index = 0; index < 65; index += 1) {
      const owner = session(`runtime-risk-queue-${index}`)
      const executionId = `ra-execution-queue-${index}`
      sessions.push(owner)
      queueFixture.addEvaluation(executionId)
      queueFixture.runtime.capturePreExecute(execution(owner, executionId), executionId)
    }
    expect(queueFixture.queued()).toBe(64)
    expect(queueFixture.runtime.query(sessions[64]!)).toMatchObject({ kind: 'VIEW', view: { status: 'DEGRADED', reasonCodes: ['CAPACITY_EXCEEDED'] } })
    queueFixture.runtime.dispose()
    expect(queueFixture.queued()).toBe(0)

    const capFixture = setupRuntime({ maxRecords: 1 })
    const active = session('runtime-risk-record-cap-active')
    const overflow = session('runtime-risk-record-cap-overflow')
    capFixture.addEvaluation('ra-execution-record-cap-active')
    capFixture.addEvaluation('ra-execution-record-cap-overflow')
    capFixture.runtime.capturePreExecute(execution(active, 'ra-execution-record-cap-active'), 'ra-execution-record-cap-active')
    capFixture.runtime.claimForApproval(active, 'ra-execution-record-cap-active')
    capFixture.runtime.capturePreExecute(execution(overflow, 'ra-execution-record-cap-overflow'), 'ra-execution-record-cap-overflow')
    expect(capFixture.runtime.claimForApproval(overflow, 'ra-execution-record-cap-overflow')).toMatchObject({ kind: 'UNAVAILABLE', reasonCodes: ['CAPACITY_EXCEEDED'] })
    expect(capFixture.runtime.query(active)).toEqual({ kind: 'NOT_FOUND' })
    capFixture.runtime.dispose()

    const pendingFixture = setupRuntime({ maxRecords: 1 })
    const pendingSession = session('runtime-risk-record-cap-pending-scorer')
    const nextSession = session('runtime-risk-record-cap-next-session')
    const pendingExecutionId = 'ra-execution-record-cap-pending-scorer'
    const pendingExec = execution(pendingSession, pendingExecutionId)
    pendingFixture.addEvaluation(pendingExecutionId)
    pendingFixture.addEvaluation('ra-execution-record-cap-next-session')
    pendingFixture.runtime.capturePreExecute(pendingExec, pendingExecutionId)
    pendingFixture.runtime.observeResult(pendingExec, pendingExecutionId)
    pendingFixture.runtime.capturePreExecute(execution(nextSession, 'ra-execution-record-cap-next-session'), 'ra-execution-record-cap-next-session')
    expect(pendingFixture.runtime.query(pendingSession)).toMatchObject({ kind: 'VIEW', view: { status: 'PENDING', stage: 'CAPTURED' } })
    expect(pendingFixture.runtime.query(nextSession)).toMatchObject({ kind: 'UNAVAILABLE', reasonCodes: ['CAPACITY_EXCEEDED'] })
    pendingFixture.setNow(10 * 60 * 1000 + 100)
    expect(pendingFixture.runtime.query(nextSession)).toEqual({ kind: 'NOT_FOUND' })
    pendingFixture.runtime.dispose()
  })

  it('serves only the requested Session with sanitized DTOs and exact versioned failure states', async () => {
    const fixture = setupRuntime()
    const owner = session('runtime-risk-bridge-session')
    const executionId = 'ra-execution-private-sentinel'
    fixture.addEvaluation(executionId)
    const exec = execution(owner, executionId, 'runtime-risk-call-opaque')
    fixture.runtime.capturePreExecute(exec, executionId)
    fixture.scheduled[0]!()
    const sessions = { get: (id: string) => id === owner.id ? owner : undefined } as never
    const coordinator = {} as ApprovalAssessmentCoordinator
    const signal = new AbortController().signal
    const response = await handleRiskAdvisorRpc(sessions, coordinator, 'runtime-risk', { sessionId: owner.id }, signal, fixture.runtime)
    expect(response.ok).toBe(true)
    if (!response.ok) throw new Error('expected read-only runtime response')
    const parsed = parseRuntimeRiskAwarenessRead(response.value)
    expect(parsed).toMatchObject({ kind: 'VIEW', sessionId: owner.id, callId: 'runtime-risk-call-opaque', timing: 'PRE_EXECUTION_EVIDENCE', status: 'DEGRADED' })
    const serialized = JSON.stringify(parsed)
    expect(serialized).not.toContain('runtime-risk-raw-content-sentinel')
    expect(serialized).not.toContain('/private/runtime-risk-sentinel/path')
    expect(parseRuntimeRiskAwarenessRead({ ...parsed, extra: 'rejected' })).toBeUndefined()

    const notFound = await handleRiskAdvisorRpc(sessions, coordinator, 'runtime-risk', { sessionId: 'other-live-session' }, signal, fixture.runtime)
    expect(notFound.ok && parseRuntimeRiskAwarenessRead(notFound.value)).toEqual({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId: 'other-live-session' })
    const malformed = await handleRiskAdvisorRpc(sessions, coordinator, 'runtime-risk', { sessionId: owner.id, extra: true }, signal, fixture.runtime)
    expect(malformed).toMatchObject({ ok: false, error: { code: 'risk-advisor/bad-request' } })
    const oversizedId = await handleRiskAdvisorRpc(sessions, coordinator, 'runtime-risk', { sessionId: 'x'.repeat(257) }, signal, fixture.runtime)
    expect(oversizedId).toMatchObject({ ok: false, error: { code: 'risk-advisor/bad-request' } })

    const current = fixture.runtime.query(owner)
    if (current.kind !== 'VIEW' || current.assessment === undefined) throw new Error('expected a bounded runtime assessment')
    const oversizedAssessment = {
      ...current.assessment,
      findings: Object.freeze(Array.from({ length: 32 }, (_, index) => Object.freeze({
        findingId: `p14-oversize-${index}`,
        code: 'OVERSIZE_FINDING',
        title: 'title'.repeat(32),
        detail: 'detail'.repeat(160),
        dimension: 'RISK' as const,
        severity: 'WARNING' as const,
        strength: 'DETERMINISTIC' as const,
        basisFeatureIds: Object.freeze([]),
        basisEventIds: Object.freeze([]),
      }))),
    }
    const oversizedRuntime = { query: () => ({ ...current, assessment: oversizedAssessment }) } as unknown as RuntimeRiskAwarenessRuntime
    const bounded = await handleRiskAdvisorRpc(sessions, coordinator, 'runtime-risk', { sessionId: owner.id }, signal, oversizedRuntime)
    expect(bounded.ok && parseRuntimeRiskAwarenessRead(bounded.value)).toMatchObject({ kind: 'VIEW', status: 'DEGRADED', stage: 'COMPLETE', reasonCodes: ['CONTEXT_DEGRADED'] })
    expect(JSON.stringify(bounded).length).toBeLessThanOrEqual(24_000)
    expect(JSON.stringify(bounded)).not.toContain('detail'.repeat(160))
    const cancelled = new AbortController(); cancelled.abort()
    expect(await handleRiskAdvisorRpc(sessions, coordinator, 'runtime-risk', { sessionId: owner.id }, cancelled.signal, fixture.runtime)).toMatchObject({ ok: false, error: { code: 'risk-advisor/cancelled' } })
    fixture.runtime.dispose()
  })

  it('remains advisory when deferred scheduling throws', () => {
    const scheduler = vi.fn(() => { throw new Error('scheduler failure') })
    const fixture = setupRuntime({ schedule: scheduler })
    const owner = session('runtime-risk-scheduler-failure')
    const exec = execution(owner, 'ra-execution-scheduler-failure')
    fixture.addEvaluation('ra-execution-scheduler-failure')
    expect(() => fixture.runtime.capturePreExecute(exec, 'ra-execution-scheduler-failure')).not.toThrow()
    expect(fixture.runtime.query(owner)).toMatchObject({ kind: 'VIEW', view: { status: 'DEGRADED', reasonCodes: ['ASSESSMENT_UNAVAILABLE'] } })
    fixture.runtime.dispose()
  })

  it('meets the bounded capture and deferred scoring budgets with 32 findings', () => {
    const fixture = setupRuntime()
    const owner = session('runtime-risk-performance')
    const captureMs: number[] = []
    const scoreMs: number[] = []
    const findings = Object.freeze(Array.from({ length: 32 }, (_, index) => Object.freeze({
      id: `P14_PERF_${index}`,
      severity: 'medium' as const,
      category: 'reversibility' as const,
      summary: 'Bounded synthetic deterministic finding.',
      hard: false,
    })))

    for (let index = 0; index < 160; index += 1) {
      const executionId = `ra-execution-performance-${index}`
      const evaluation = Object.freeze({ ...ruleEvaluation(executionId), findings }) as RuleEvaluation
      fixture.addEvaluation(executionId, evaluation)
      const exec = execution(owner, executionId)
      const captureStarted = performance.now()
      fixture.runtime.capturePreExecute(exec, executionId)
      captureMs.push(performance.now() - captureStarted)
      const deferred = fixture.scheduled.at(-1)
      expect(deferred).toBeDefined()
      const scoreStarted = performance.now()
      deferred?.()
      scoreMs.push(performance.now() - scoreStarted)
    }

    const percentile = (samples: readonly number[], fraction: number) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * fraction) - 1] ?? Infinity
    expect(percentile(captureMs, 0.95)).toBeLessThanOrEqual(1)
    expect(percentile(captureMs, 0.99)).toBeLessThanOrEqual(2)
    expect(percentile(scoreMs, 0.95)).toBeLessThanOrEqual(5)
    fixture.runtime.dispose()
  })
})
