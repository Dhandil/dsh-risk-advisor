import { platform as runtimePlatform } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { parseHistoricalContextRead } from '../src/historical-context-contract.ts'
import { RuntimeRiskAwarenessRuntime } from '../src/host/runtime-risk-awareness.ts'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import type { ExecutionId } from '../src/host/correlation.ts'
import type { FailureChainDiagnostics, FailureChainSummary } from '../src/host/retry-escalation.ts'
import type { FoundationDiagnostics } from '../src/host/operation-foundation.ts'
import type { RuleDiagnostics, RuleEvaluation } from '../src/host/rule-engine.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'
import type { ExperienceEpisodeV1 } from '../src/host/experience-schema.ts'
import { normalizeExperiencePlatform, normalizeExperienceToolName } from '../src/host/experience-schema.ts'
import { patternIdentityFor, patternIdentityForOperation } from '../src/host/pattern-schema.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'
import { handleRiskAdvisorRpc } from '../src/host/browser-bridge.ts'
import type { ConnectionRpcResultLike } from '../src/host/browser-bridge.ts'
import { createQualifiedHistoryFixture, type QualifiedHistoryFixture } from './p14-2-historical-context-fixtures.ts'

const fixtures: QualifiedHistoryFixture[] = []
afterEach(async () => { await Promise.all(fixtures.splice(0).map(fixture => fixture.close())) })

function setupRuntime() {
  let now = 100
  const byExecution = new Map<string, RuleEvaluation>()
  const expectedEffects = new ExpectedEffectRegistry({ clock: () => now })
  const foundation = {
    get: (executionId: string) => ({
      executionId,
      status: 'CAPTURED',
      toolKind: 'filesystem-write',
      reasonCodes: [],
      boundary: { workspaceContained: 'unknown', targetScope: 'unknown', sandboxActive: 'unknown', sandboxCovered: 'unknown', rollbackAvailable: 'unknown', checkpointAvailable: 'unknown' },
    }),
  } as unknown as FoundationDiagnostics
  const rules = { get: (id: string) => byExecution.get(id)! } as RuleDiagnostics
  const failureChain = { get: (id: string) => summary(id) } as FailureChainDiagnostics
  const ledger = {
    snapshot: (session: Session) => ({ sessionId: session.id, health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }),
  } as unknown as LedgerDiagnostics
  const runtime = new RuntimeRiskAwarenessRuntime(foundation, rules, failureChain, ledger, {
    expectedEffects,
    clock: () => now,
    schedule: () => () => undefined,
  })
  return {
    runtime,
    expectedEffects,
    addRule: (id: string, value = rule(id)) => { byExecution.set(id, value) },
    setNow: (value: number) => { now = value },
  }
}

function rule(executionId: string, overrides: Partial<RuleEvaluation> = {}): RuleEvaluation {
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
    ...overrides,
  }) as RuleEvaluation
}

function summary(executionId: string): FailureChainSummary {
  return Object.freeze({ executionId, status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, truncated: false, reasonCodes: Object.freeze([]), recent: Object.freeze([]) })
}

function session(id: string): Session { return { id, header: { cwd: '/private/p14-2-test-root' } } as unknown as Session }

function writeExecution(owner: Session, executionId: string, callId = `p14-2-call-${executionId}`): ToolExecution {
  return {
    name: 'write',
    arguments: { file_path: '/private/p14-2-test-root/source.txt', content: 'p14-2-private-content-sentinel' },
    callId,
    rootCallId: callId,
    agent: { session: owner },
    signal: new AbortController().signal,
    token: Symbol(executionId),
  } as unknown as ToolExecution
}

function episode(overrides: Partial<ExperienceEpisodeV1> = {}): ExperienceEpisodeV1 {
  const sourceExecutionId = 'ra-execution-p14-2-identity'
  return {
    schemaVersion: 1,
    episodeId: `ra-episode-v1_${'a'.repeat(64)}`,
    sourceExecutionId,
    observedAt: 1,
    runtime: { platform: 'darwin' },
    operation: { toolName: 'write', kind: 'filesystem-write', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none' },
    approval: { observed: false },
    terminal: { isError: false },
    retry: { status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false },
    provenance: { source: 'LIVE_TOOLS_RESULT', ruleStatus: 'READY', reasonCodes: [] },
    ...overrides,
  } as ExperienceEpisodeV1
}

function proof(
  source: VerificationRecordV1['source'],
  adapterId: VerificationRecordV1['adapterId'],
) {
  return { source, adapterId, status: 'MATCHED', semanticSuccess: true, evidenceQuality: 'medium' }
}

function patternId(fixture: QualifiedHistoryFixture): string {
  const id = fixture.patterns.diagnostics.patternIds()[0]
  if (id === undefined) throw new Error('expected validated Pattern')
  return id
}

async function historicalRead(
  runtime: ReturnType<typeof setupRuntime>['runtime'],
  fixture: QualifiedHistoryFixture,
  owner: Session,
  payload: unknown,
): Promise<ConnectionRpcResultLike> {
  const sessions = { get: (id: string) => id === owner.id ? owner : undefined } as never
  return handleRiskAdvisorRpc(sessions, {} as never, 'historical-context', payload, new AbortController().signal, runtime, fixture.guidance.diagnostics)
}

describe('Phase 14.2 verified historical context H1–H10', () => {
  it('H1 shares the exact frozen Pattern identity across all adapters, permissions, and Host platforms', () => {
    const pairs = [
      ['tool-contract', 'tool.write.v1'], ['tool-contract', 'tool.edit.v1'],
      ['known-adapter', 'shell.mkdir.v1'], ['known-adapter', 'shell.copy-file.v1'],
      ['known-adapter', 'git.branch-switch.v1'], ['known-adapter', 'package.node-resolve.v1'],
    ] as const
    const platforms = ['darwin', 'win32', 'linux', 'other'] as const
    const permissions = [undefined, 'workspace-write', 'danger-full-access'] as const
    for (const [source, adapterId] of pairs) for (const platform of platforms) for (const permission of permissions) {
      const value = episode({
        runtime: { platform },
        operation: { ...episode().operation, ...(permission === undefined ? {} : { requestedPermission: permission }) },
      })
      const evidence = proof(source, adapterId)
      const expected = patternIdentityFor(value, evidence as never)
      const actual = patternIdentityForOperation({
        platform: value.runtime.platform,
        toolName: value.operation.toolName,
        kind: value.operation.kind,
        parserConfidence: value.operation.parserConfidence,
        mutating: value.operation.mutating,
        externalEffect: value.operation.externalEffect,
        networkEffect: value.operation.networkEffect,
        ...(value.operation.requestedPermission === undefined ? {} : { requestedPermission: value.operation.requestedPermission }),
      }, evidence as never)
      expect(actual).toBe(expected)
    }
    const base = episode()
    const matched = patternIdentityFor(base, proof('tool-contract', 'tool.write.v1') as never)
    expect(matched).toBeDefined()
    expect(patternIdentityForOperation({ platform: 'darwin', toolName: 'write', kind: 'filesystem-write', parserConfidence: 'low', mutating: true, externalEffect: false, networkEffect: 'none' }, proof('tool-contract', 'tool.write.v1') as never)).toBeUndefined()
    expect(patternIdentityForOperation({ platform: 'darwin', toolName: 'write', kind: 'unknown', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none' }, proof('tool-contract', 'tool.write.v1') as never)).toBeUndefined()
    expect(patternIdentityForOperation({ platform: 'darwin', toolName: 'write', kind: 'filesystem-write', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none' }, proof('tool-contract', 'shell.mkdir.v1') as never)).toBeUndefined()
    expect(patternIdentityForOperation({ platform: 'darwin', toolName: 'write', kind: 'filesystem-write', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none' }, proof('known-adapter', 'shell.remove.v1' as never) as never)).toBeUndefined()
    expect(patternIdentityForOperation({ platform: 'darwin', toolName: 'different-tool', kind: 'filesystem-write', parserConfidence: 'high', mutating: true, externalEffect: false, networkEffect: 'none' }, proof('tool-contract', 'tool.write.v1') as never)).not.toBe(matched)
  })

  it('H1/H2 peeks only the exact live ExpectedEffect identity and leaves its payload available to the verifier', () => {
    const owner = session('p14-2-peek-session')
    const executionId = 'ra-execution-p14-2-peek' as ExecutionId
    const exec = writeExecution(owner, executionId)
    const registry = new ExpectedEffectRegistry()
    registry.capture(exec, executionId)
    expect(registry.peekIdentity(exec, executionId, owner)).toEqual({ source: 'tool-contract', adapterId: 'tool.write.v1' })
    expect(registry.peekIdentity(exec, executionId, session('p14-2-other-session'))).toBeUndefined()
    expect(registry.peekIdentity(exec, 'ra-execution-p14-2-other' as ExecutionId, owner)).toBeUndefined()
    const consumed = registry.take(exec)
    expect(consumed).toMatchObject({ source: 'tool-contract', adapterId: 'tool.write.v1' })
    expect(JSON.stringify(registry.peekIdentity(exec, executionId, owner))).not.toContain('p14-2-private-content-sentinel')
    registry.dispose()
  })

  it('H1 pre-execution projection matches every supported ExpectedEffect adapter without retaining its payload', () => {
    const env = setupRuntime()
    const owner = session('p14-2-adapter-parity-session')
    const cases = [
      { name: 'write', args: { file_path: '/tmp/a.txt', content: 'secret' }, source: 'tool-contract', adapterId: 'tool.write.v1' },
      { name: 'edit', args: { file_path: '/tmp/a.txt', old_string: 'old', new_string: 'new' }, source: 'tool-contract', adapterId: 'tool.edit.v1' },
      { name: 'bash', args: { command: 'mkdir -p out' }, source: 'known-adapter', adapterId: 'shell.mkdir.v1' },
      { name: 'bash', args: { command: 'cp source.txt dest.txt' }, source: 'known-adapter', adapterId: 'shell.copy-file.v1' },
      { name: 'bash', args: { command: 'git switch main' }, source: 'known-adapter', adapterId: 'git.branch-switch.v1' },
      { name: 'bash', args: { command: 'npm install @example/safe-package' }, source: 'known-adapter', adapterId: 'package.node-resolve.v1' },
    ] as const
    for (const [index, item] of cases.entries()) {
      const executionId = `ra-execution-p14-2-adapter-${index}` as ExecutionId
      const callId = `p14-2-adapter-call-${index}`
      const exec = { ...writeExecution(owner, executionId, callId), name: item.name, arguments: item.args } as unknown as ToolExecution
      env.addRule(executionId)
      env.expectedEffects.capture(exec, executionId)
      const identity = env.expectedEffects.peekIdentity(exec, executionId, owner)
      expect(identity).toEqual({ source: item.source, adapterId: item.adapterId })
      env.runtime.capturePreExecute(exec, executionId)
      const query = env.runtime.query(owner)
      if (query.kind !== 'VIEW') throw new Error('expected current ordinary row')
      const actual = env.runtime.currentHistoricalPatternId(owner, executionId, query.view.assessmentId)
      const sourceEpisode = episode({
        runtime: { platform: normalizeExperiencePlatform(runtimePlatform()) },
        operation: { ...episode().operation, toolName: normalizeExperienceToolName(item.name) },
      })
      const expected = patternIdentityFor(sourceEpisode, proof(item.source, item.adapterId) as never)
      expect(actual).toBe(expected)
      expect(JSON.stringify(identity)).not.toContain('/tmp/a.txt')
      expect(JSON.stringify(identity)).not.toContain('secret')
    }
    env.runtime.dispose()
  })

  it('H2 suppresses unsupported Effects, non-READY Rules, and ineligible typed facts at capture', () => {
    const env = setupRuntime()
    const owner = session('p14-2-ineligible-session')
    const cases = [
      { id: 'no-effect', effect: false, overrides: {} },
      { id: 'degraded-rule', effect: true, overrides: { status: 'DEGRADED' } },
      { id: 'low-parser', effect: true, overrides: { parserConfidence: 'low' } },
      { id: 'unknown-kind', effect: true, overrides: { operationKind: 'unknown' } },
      { id: 'unknown-network', effect: true, overrides: { networkEffect: 'unknown' } },
      { id: 'unknown-mutating', effect: true, overrides: { mutating: 'unknown' } },
      { id: 'wrong-rule-id', effect: true, overrides: { executionId: 'ra-execution-some-other-row' } },
    ] as const
    for (const item of cases) {
      const id = `ra-execution-p14-2-${item.id}` as ExecutionId
      const exec = writeExecution(owner, id)
      env.addRule(id, rule(id, item.overrides))
      if (item.effect) env.expectedEffects.capture(exec, id)
      env.runtime.capturePreExecute(exec, id)
      const query = env.runtime.query(owner)
      if (query.kind !== 'VIEW') throw new Error('expected ordinary record')
      expect(env.runtime.currentHistoricalPatternId(owner, id, query.view.assessmentId)).toBeUndefined()
    }
    env.runtime.dispose()
  })

  it('H3/H7 returns only the current qualified Guidance projection and excludes Tool input', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    fixtures.push(history)
    const expectedPattern = patternIdentityFor(history.episodes[0]!, proof('tool-contract', 'tool.write.v1') as never)
    expect(expectedPattern).toBe(patternId(history))
    const active = history.guidance.diagnostics.currentForPattern(expectedPattern!)!
    expect(active).toMatchObject({ state: 'ACTIVE', patternState: 'QUALIFIED', evidenceStrength: 'QUALIFIED_PATTERN', supportCount: 3, supportUtcDateCount: 3 })

    const env = setupRuntime()
    const owner = session('p14-2-live-session')
    const executionId = 'ra-execution-p14-2-live' as ExecutionId
    const exec = writeExecution(owner, executionId)
    env.addRule(executionId)
    env.expectedEffects.capture(exec, executionId)
    env.runtime.capturePreExecute(exec, executionId)
    const riskBefore = JSON.stringify(env.runtime.query(owner))
    const patternBytes = JSON.stringify(history.patterns.diagnostics.revisions(expectedPattern!))
    const guidanceBytes = JSON.stringify(history.guidance.diagnostics.revisions(active.guidanceId))
    const episodeBytes = JSON.stringify(history.episodes)
    const outcomeCount = history.outcomes.diagnostics.revisionCount()
    const row = env.runtime.query(owner)
    expect(row.kind).toBe('VIEW')
    if (row.kind !== 'VIEW') throw new Error('expected current ordinary row')
    const response = await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId, assessmentId: row.view.assessmentId })
    expect(response.ok).toBe(true)
    if (!response.ok) throw new Error('expected a read-only historical response')
    const parsed = parseHistoricalContextRead(response.value)
    expect(parsed).toMatchObject({
      kind: 'VIEW', sessionId: owner.id, executionId, assessmentId: row.view.assessmentId,
      historical: {
        guidanceId: active.guidanceId,
        guidanceRevisionId: active.revisionId,
        patternId: expectedPattern,
        patternRevisionId: active.patternRevisionId,
        patternProvenanceDigest: active.patternProvenanceDigest,
        title: 'Verified historical pattern',
        observation: 'A qualified verified-success pattern covers 3 distinct Episodes across 3 UTC dates.',
      },
    })
    expect(Object.isFrozen(parsed)).toBe(true)
    const bytes = JSON.stringify(response.value)
    expect(bytes).not.toContain('p14-2-private-content-sentinel')
    expect(bytes).not.toContain('/private/p14-2-test-root/source.txt')
    expect(bytes).not.toContain(history.episodes[0]!.episodeId)
    expect(bytes).not.toContain(history.episodes[0]!.sourceExecutionId)
    expect(parseHistoricalContextRead({ ...response.value as object, extra: true })).toBeUndefined()
    expect(JSON.stringify(env.runtime.query(owner))).toBe(riskBefore)
    expect(JSON.stringify(history.patterns.diagnostics.revisions(expectedPattern!))).toBe(patternBytes)
    expect(JSON.stringify(history.guidance.diagnostics.revisions(active.guidanceId))).toBe(guidanceBytes)
    expect(JSON.stringify(history.episodes)).toBe(episodeBytes)
    expect(history.outcomes.diagnostics.revisionCount()).toBe(outcomeCount)
    env.runtime.dispose()
  })

  it('H2/H5 returns NOT_FOUND for unsupported, non-ready, older, cross-Session, stale, or approval-owned rows', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    fixtures.push(history)
    const env = setupRuntime()
    const owner = session('p14-2-race-session')
    const executionA = 'ra-execution-p14-2-a' as ExecutionId
    const execA = writeExecution(owner, executionA)
    env.addRule(executionA)
    env.expectedEffects.capture(execA, executionA)
    env.runtime.capturePreExecute(execA, executionA)
    const first = env.runtime.query(owner)
    if (first.kind !== 'VIEW') throw new Error('expected first row')
    env.addRule('ra-execution-p14-2-no-effect')
    env.runtime.capturePreExecute(writeExecution(owner, 'ra-execution-p14-2-no-effect' as ExecutionId), 'ra-execution-p14-2-no-effect' as ExecutionId)
    expect(await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId: executionA, assessmentId: first.view.assessmentId })).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })

    const crossSession = session('p14-2-race-other-session')
    const crossId = 'ra-execution-p14-2-cross' as ExecutionId
    const crossExec = writeExecution(crossSession, crossId)
    env.addRule(crossId)
    env.expectedEffects.capture(crossExec, crossId)
    env.runtime.capturePreExecute(crossExec, crossId)
    const crossRow = env.runtime.query(crossSession)
    if (crossRow.kind !== 'VIEW') throw new Error('expected cross Session row')
    const crossSessions = { get: (id: string) => id === crossSession.id ? crossSession : id === owner.id ? owner : undefined } as never
    const crossRead = await handleRiskAdvisorRpc(crossSessions, {} as never, 'historical-context', { sessionId: crossSession.id, executionId: crossId, assessmentId: crossRow.view.assessmentId }, new AbortController().signal, env.runtime, history.guidance.diagnostics)
    expect(crossRead).toMatchObject({ ok: true, value: { kind: 'VIEW', sessionId: crossSession.id } })

    env.runtime.claimForApproval(crossSession, crossId)
    const claimed = await handleRiskAdvisorRpc(crossSessions, {} as never, 'historical-context', { sessionId: crossSession.id, executionId: crossId, assessmentId: crossRow.view.assessmentId }, new AbortController().signal, env.runtime, history.guidance.diagnostics)
    expect(claimed).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })
    env.runtime.dispose()
  })

  it('H4/H9 suppresses history during source retraction or absence without affecting Experience bytes', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    fixtures.push(history)
    const env = setupRuntime()
    const owner = session('p14-2-retraction-session')
    const executionId = 'ra-execution-p14-2-retract' as ExecutionId
    const exec = writeExecution(owner, executionId)
    env.addRule(executionId)
    env.expectedEffects.capture(exec, executionId)
    env.runtime.capturePreExecute(exec, executionId)
    const row = env.runtime.query(owner)
    if (row.kind !== 'VIEW') throw new Error('expected current row')
    const before = JSON.stringify(history.guidance.diagnostics.revisions(history.guidance.diagnostics.guidanceIds()[0]!))
    history.outcomes.observeVerification({
      schemaVersion: 1,
      executionId: history.episodes[3]!.sourceExecutionId as ExecutionId,
      source: 'tool-contract', adapterId: 'tool.write.v1', status: 'MISMATCHED', semanticSuccess: false,
      evidenceQuality: 'medium', reasonCodes: ['POSTCONDITION_MISMATCH'], observedAt: history.episodes[3]!.observedAt, durationMs: 1,
    })
    await history.outcomes.drain(); await history.patterns.drain()
    const duringLag = await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId, assessmentId: row.view.assessmentId })
    expect(duringLag).toMatchObject({ ok: true, value: { kind: 'UNAVAILABLE' } })
    await history.guidance.drain()
    const afterWithdrawal = await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId, assessmentId: row.view.assessmentId })
    expect(afterWithdrawal).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })
    expect(history.guidance.diagnostics.currentForPattern(patternId(history))).toBeUndefined()
    const after = JSON.stringify(history.guidance.diagnostics.revisions(history.guidance.diagnostics.guidanceIds()[0]!))
    expect(after).not.toBe(before)
    const unavailable = await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId, assessmentId: row.view.assessmentId })
    expect(unavailable.ok).toBe(true)
    await history.guidance.detach()
    const detached = await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId, assessmentId: row.view.assessmentId })
    expect(detached).toMatchObject({ ok: true, value: { kind: 'UNAVAILABLE', reasonCodes: ['GUIDANCE_UNAVAILABLE'] } })
    env.runtime.dispose()
  })

  it('H5 rejects malformed exact-key RPCs and suppresses expired or unavailable runtime rows', async () => {
    const history = await createQualifiedHistoryFixture({ platform: normalizeExperiencePlatform(runtimePlatform()) })
    fixtures.push(history)
    const env = setupRuntime()
    const owner = session('p14-2-malformed-session')
    const executionId = 'ra-execution-p14-2-malformed' as ExecutionId
    const exec = writeExecution(owner, executionId)
    env.addRule(executionId)
    env.expectedEffects.capture(exec, executionId)
    env.runtime.capturePreExecute(exec, executionId)
    const row = env.runtime.query(owner)
    if (row.kind !== 'VIEW') throw new Error('expected current row')
    expect(await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId, assessmentId: row.view.assessmentId, patternId: patternId(history) })).toMatchObject({ ok: false, error: { code: 'risk-advisor/bad-request' } })
    expect(await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId: 'x'.repeat(257), assessmentId: row.view.assessmentId })).toMatchObject({ ok: false, error: { code: 'risk-advisor/bad-request' } })
    env.setNow(100 + 10 * 60 * 1000 + 1)
    expect(await historicalRead(env.runtime, history, owner, { sessionId: owner.id, executionId, assessmentId: row.view.assessmentId })).toMatchObject({ ok: true, value: { kind: 'NOT_FOUND' } })
    env.runtime.dispose()
  })
})
