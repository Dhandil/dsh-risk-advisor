import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { SecretRedactor } from '../src/host/redactor.ts'
import { DirectUserRing, ReviewerSeedStore, captureReviewerSeed } from '../src/host/reviewer-seed.ts'
import { projectJudgeFeatures, projectRiskFeatures, buildRiskContext, createDeterministicAssessment, type RiskEngineInput } from '../src/host/risk-engine.ts'
import { buildPhase5Context, type BuiltPhase5Context } from '../src/host/context-builder.ts'
import { executeFastJudge, parseFastJudgeCandidate, JudgeScheduler, normalizeFastJudgeConfig, requestedJudgeDimensions, resolveReviewerRoute } from '../src/host/fast-judge.ts'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'
import type { RuleEvaluation, RuleFinding } from '../src/host/rule-engine.ts'
import type { FailureChainSummary } from '../src/host/retry-escalation.ts'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'

function fakeSession(id = 'p5-repair-session'): Session { return { id } as unknown as Session }

function fakeExecution(name: string, args: unknown): ToolExecution {
  const session = fakeSession()
  return { name, arguments: args, callId: 'repair-call', token: Symbol('repair'), signal: new AbortController().signal, agent: { session } as unknown as Agent } as ToolExecution
}

function evaluation(overrides: Partial<RuleEvaluation> = {}): RuleEvaluation {
  return {
    schemaVersion: 1,
    rulesetVersion: 'phase4-v1',
    executionId: 'repair-execution',
    status: 'READY',
    operationKind: 'filesystem-read',
    parserConfidence: 'high',
    mutating: false,
    externalEffect: false,
    networkEffect: 'none',
    workspaceContained: 'unknown',
    sandboxCovered: 'unknown',
    reversible: 'unknown',
    failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, degraded: false },
    findings: [],
    reasonCodes: [],
    ...overrides,
  }
}

function failure(overrides: Partial<FailureChainSummary> = {}): FailureChainSummary {
  return { executionId: 'repair-execution', status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, truncated: false, recent: [], ...overrides }
}

function contextInput(overrides: Partial<RiskEngineInput> = {}): RiskEngineInput {
  return {
    executionId: 'repair-execution',
    seed: undefined,
    ruleEvaluation: evaluation(),
    failureSummary: failure(),
    foundation: undefined,
    directUser: { messages: ['read the fixture'], historyOmitted: false, degraded: false, userChars: 17 },
    ledger: { health: 'HEALTHY', sourceComplete: true, truncated: false, issueCodes: [] },
    ...overrides,
  }
}

function finding(id: string, category: RuleFinding['category'], severity: RuleFinding['severity'] = 'high'): RuleFinding {
  return { id, category, severity, summary: `static ${id}`, hard: true }
}

describe('Phase 5 F1 reviewer seed and redaction repair', () => {
  it('never invokes command, path, or query accessors and rejects unknown aliases', () => {
    const commandArgs: Record<string, unknown> = {}
    Object.defineProperty(commandArgs, 'command', { get: () => { throw new Error('command getter invoked') } })
    const pathArgs: Record<string, unknown> = {}
    Object.defineProperty(pathArgs, 'file_path', { get: () => { throw new Error('path getter invoked') } })
    const queries = [] as unknown[]
    Object.defineProperty(queries, '0', { get: () => { throw new Error('query getter invoked') } })
    const queryArgs: Record<string, unknown> = {}
    Object.defineProperty(queryArgs, 'queries', { value: queries })

    expect(() => captureReviewerSeed('repair-command', fakeExecution('bash', commandArgs), evaluation({ operationKind: 'shell' }))).not.toThrow()
    expect(() => captureReviewerSeed('repair-path', fakeExecution('read', pathArgs), evaluation())).not.toThrow()
    expect(() => captureReviewerSeed('repair-query', fakeExecution('web_search', queryArgs), evaluation({ operationKind: 'network-read', externalEffect: true, networkEffect: 'read' }))).not.toThrow()
    for (const [name, args, kind] of [['command', { command: 'do-not-retain' }, 'unknown'], ['fetch', { url: 'https://secret.example' }, 'network-read'], ['read_file', { file_path: 'secret.txt' }, 'filesystem-read'] as const]) {
      const captured = captureReviewerSeed(`repair-${name}`, fakeExecution(name, args), evaluation({ operationKind: kind }))
      expect(captured.seed.operationText).toBeUndefined()
      expect(captured.seed.resourceHints).toEqual([])
    }
  })

  it('uses only exact closed adapters and excludes write/edit content and justification', () => {
    const bash = captureReviewerSeed('repair-bash', fakeExecution('bash', { command: 'echo token=secret', workdir: 'D:/workspace' }), evaluation({ operationKind: 'shell', mutating: 'unknown', externalEffect: 'unknown', networkEffect: 'unknown' }))
    expect(bash.seed.operationText).toContain('[REDACTED]')
    expect(bash.seed.resourceHints).toEqual(['D:/workspace'])
    const pwsh = captureReviewerSeed('repair-pwsh', fakeExecution('pwsh', { command: 'Get-Item safe.txt' }), evaluation({ operationKind: 'shell', mutating: 'unknown', externalEffect: 'unknown', networkEffect: 'unknown' }))
    expect(pwsh.seed.operationText).toBe('Get-Item safe.txt')
    for (const name of ['write', 'edit'] as const) {
      const captured = captureReviewerSeed(`repair-${name}`, fakeExecution(name, { file_path: 'safe.txt', content: 'private body', old_string: 'private old', new_string: 'private new', justification: 'private reason' }), evaluation({ operationKind: name === 'write' ? 'filesystem-write' : 'filesystem-edit', mutating: true }))
      expect(captured.seed.resourceHints).toEqual(['safe.txt'])
      expect(captured.seed.operationText).toBeUndefined()
      expect(JSON.stringify(captured.seed)).not.toContain('private')
    }
  })

  it('fails closed for malformed credential URLs and user-message secrets', () => {
    const redactor = new SecretRedactor()
    expect(() => redactor.redact('https://user:password@bad[host/path?token=secret')).toThrow()
    const captured = captureReviewerSeed('repair-url', fakeExecution('web_fetch', { url: 'https://user:password@bad[host/path?token=secret' }), evaluation({ operationKind: 'network-read', externalEffect: true, networkEffect: 'read' }))
    expect(captured.redactionFailed).toBe(true)
    expect(JSON.stringify(captured.seed)).not.toContain('password')
    const ring = new DirectUserRing()
    const session = fakeSession('repair-user-session')
    const event = { type: 'user/message', data: { content: [{ type: 'text', text: 'token=secret' }], source: { kind: 'user' } } } as unknown as SessionEvent
    ring.observe(session, event)
    expect(ring.snapshot(session).messages[0]).not.toContain('secret')
    for (let index = 0; index < 6; index += 1) {
      ring.observe(session, { type: 'user/message', data: { content: [{ type: 'text', text: `message-${index}` }], source: { kind: 'user' } } } as unknown as SessionEvent)
    }
    expect(ring.snapshot(session).messages).toHaveLength(4)
    expect(ring.snapshot(session).historyOmitted).toBe(true)
    ring.disposeSession(session)
    expect(ring.snapshot(session).messages).toEqual([])
  })

  it('accepts only direct-user text and marks omitted history after eviction or character truncation', () => {
    const ring = new DirectUserRing()
    const session = fakeSession('repair-ring-session')
    for (const kind of ['assistant', 'system', 'tool', 'plugin']) {
      ring.observe(session, { type: 'user/message', data: { content: [{ type: 'text', text: `${kind}-must-not-enter` }], source: { kind } } } as unknown as SessionEvent)
    }
    ring.observe(session, { type: 'user/message', data: { content: [{ type: 'text', text: 'direct-user-only' }], source: { kind: 'user' } } } as unknown as SessionEvent)
    expect(ring.snapshot(session).messages).toEqual(['direct-user-only'])
    for (let index = 0; index < 4; index += 1) {
      ring.observe(session, { type: 'user/message', data: { content: [{ type: 'text', text: 'x'.repeat(1900) }], source: { kind: 'user' } } } as unknown as SessionEvent)
    }
    const snapshot = ring.snapshot(session)
    expect(snapshot.messages).toHaveLength(4)
    expect(snapshot.userChars).toBeLessThanOrEqual(8000)
    expect(snapshot.historyOmitted).toBe(true)
    expect(JSON.stringify(snapshot)).not.toContain('assistant-must-not-enter')
    const longSession = fakeSession('repair-ring-long-session')
    ring.observe(longSession, { type: 'user/message', data: { content: [{ type: 'text', text: 'y'.repeat(9000) }], source: { kind: 'user' } } } as unknown as SessionEvent)
    expect(ring.snapshot(longSession).historyOmitted).toBe(true)
  })

  it('bounds seed storage by TTL and capacity', () => {
    let now = 0
    const store = new ReviewerSeedStore(() => now)
    const exec = fakeExecution('read', { file_path: 'safe.txt' })
    store.capture('repair-ttl', exec, evaluation())
    expect(store.get('repair-ttl')).toBeDefined()
    now = 10 * 60 * 1000
    expect(store.get('repair-ttl')).toBeUndefined()
    now = 0
    for (let index = 0; index < 257; index += 1) {
      store.capture(`repair-capacity-${index}`, fakeExecution('read', { file_path: `safe-${index}.txt` }), evaluation({ executionId: `repair-capacity-${index}` }))
    }
    expect(store.get('repair-capacity-0')).toBeUndefined()
    expect(store.get('repair-capacity-256')).toBeDefined()
  })
})

describe('Phase 5 F2 deterministic features and provenance repair', () => {
  it('keeps positive-proof mappings exact and unknown-tool execution unknown', () => {
    const permissionFinding = projectRiskFeatures(contextInput({ ruleEvaluation: evaluation({ findings: [finding('PERMISSION_DANGER_FULL_ACCESS', 'permission')], requestedPermission: 'danger-full-access' }) }))
    expect(permissionFinding.features.find(item => item.id === 'operation.changesPermissions')?.value).toBe(false)
    expect(permissionFinding.features.find(item => item.id === 'authorization.grantSource')?.value).toBe('none')
    const destructive = projectRiskFeatures(contextInput({ ruleEvaluation: evaluation({ operationKind: 'shell', mutating: true, externalEffect: true, networkEffect: 'unknown', findings: [finding('DESTRUCTIVE_FORCE_PUSH', 'destructive')] }) }))
    expect(destructive.features.find(item => item.id === 'operation.deletesState')?.value).toBe('unknown')
    const deletion = projectRiskFeatures(contextInput({ ruleEvaluation: evaluation({ operationKind: 'shell', mutating: true, externalEffect: true, networkEffect: 'unknown', findings: [finding('DESTRUCTIVE_RECURSIVE_DELETE', 'destructive')] }) }))
    expect(deletion.features.find(item => item.id === 'operation.deletesState')?.value).toBe(true)
    const location = projectRiskFeatures(contextInput({ ruleEvaluation: evaluation({ operationKind: 'filesystem-write', mutating: true, findings: [finding('SYSTEM_LOCATION_MUTATION', 'system-change')] }) }))
    expect(location.features.find(item => item.id === 'operation.changesConfiguration')?.value).toBe('unknown')
    const registry = projectRiskFeatures(contextInput({ ruleEvaluation: evaluation({ operationKind: 'filesystem-write', mutating: true, findings: [finding('SYSTEM_REGISTRY_MUTATION', 'system-change')] }) }))
    expect(registry.features.find(item => item.id === 'operation.changesConfiguration')?.value).toBe(true)
    expect(projectRiskFeatures(contextInput({ ruleEvaluation: evaluation({ operationKind: 'unknown', mutating: 'unknown' }) })).features.find(item => item.id === 'operation.executesCode')?.value).toBe('unknown')
    expect(projectRiskFeatures(contextInput({ ruleEvaluation: evaluation({ operationKind: 'filesystem-read', mutating: false }) })).features.find(item => item.id === 'operation.executesCode')?.value).toBe(false)
  })

  it('maps every finding to retained features and preserves failure/escalation flags', () => {
    const findings = [
      finding('DESTRUCTIVE_RECURSIVE_DELETE', 'destructive'), finding('SYSTEM_SERVICE_MUTATION', 'system-change'), finding('CREDENTIAL_RESOURCE_ACCESS', 'credential'), finding('NETWORK_EXTERNAL_WRITE', 'network'), finding('INSTALL_PACKAGE_MUTATION', 'install', 'medium'), finding('REVERSIBILITY_EVIDENCE_UNAVAILABLE', 'reversibility', 'medium'), finding('PERMISSION_ESCALATION_RETRY', 'permission'), finding('SHELL_SEMANTICS_AMBIGUOUS', 'shell-ambiguity', 'medium'), finding('UNKNOWN_TOOL', 'unknown-tool', 'medium'),
    ]
    const input = contextInput({ ruleEvaluation: evaluation({ operationKind: 'shell', mutating: true, externalEffect: true, networkEffect: 'write', findings }), failureSummary: failure({ retryCount: 2, recentFailureCount: 2, permissionEscalation: true }) })
    const context = buildRiskContext(input)
    const featureIds = new Set(context.features.features.map(item => item.id))
    const assessment = createDeterministicAssessment(context, 'repair-assessment', 1)
    for (const item of assessment.findings) for (const featureId of item.basisFeatureIds) expect(featureIds.has(featureId)).toBe(true)
    expect(assessment.aggregate.policyFlags).toMatchObject({ privilegeEscalation: true, repeatedFailure: true, repeatedEscalation: true })
  })

  it('qualifies positive-proof false placeholders as unknown in Judge-facing facts', () => {
    const features = projectRiskFeatures(contextInput()).features
    const projected = projectJudgeFeatures({ schemaVersion: 1, features })
    for (const id of ['scope.outsideWorkspace', 'scope.systemScope', 'recovery.checkpointAvailable', 'recovery.rollbackMechanismKnown']) {
      expect(projected.find(item => item.id === id)).toMatchObject({ value: 'unknown', qualification: 'NOT_PROVEN' })
    }
  })
})

describe('Phase 5 F4 strict parser and F5 scheduler proof', () => {
  const requested = ['AUTHORIZATION'] as const
  const features = new Set(['authorization.goalKnown'])
  const valid = (result = '{"dimension":"AUTHORIZATION","verdict":"UNKNOWN","rationale":"safe","referencedFeatureIds":[]}') => `{"schemaVersion":1,"results":[${result}]}`

  it('rejects duplicate keys at every candidate object level without false positives in strings', () => {
    expect(() => parseFastJudgeCandidate('{"schemaVersion":1,"results":[],"results":[]}', requested, features)).toThrow()
    expect(() => parseFastJudgeCandidate(valid('{"dimension":"AUTHORIZATION","verdict":"UNKNOWN","verdict":"UNKNOWN","rationale":"safe","referencedFeatureIds":[]}'), requested, features)).toThrow()
    expect(() => parseFastJudgeCandidate(valid('{"dimension":"AUTHORIZATION","verdict":"UNKNOWN","rationale":"safe","referencedFeatureIds":[],"proposedFacts":[{"statement":"x","statement":"y","status":"HYPOTHESIS"}]}'), requested, features)).toThrow()
    expect(() => parseFastJudgeCandidate('{"schemaVersion":1,"results":[{"dimension":"AUTHORIZATION","verdict":"UNKNOWN","rationale":"safe","referencedFeatureIds":[]}],"suggestedAlternatives":[{"title":"x","title":"y","description":"z"}]}', requested, features)).toThrow()
    expect(parseFastJudgeCandidate(valid('{"dimension":"AUTHORIZATION","verdict":"UNKNOWN","rationale":"text contains \\"verdict\\": \\"UNKNOWN\\"","referencedFeatureIds":[]}'), requested, features)).toBeDefined()
    expect(() => parseFastJudgeCandidate(valid('{"dimension":"AUTHORIZATION","verdict":"UNKNOWN","rationale":"safe","referencedFeatureIds":[],"proposedFacts":[{"statement":"x","status":"HYPOTHESIS"},{"statement":"y","status":"HYPOTHESIS"}]}'), requested, features)).not.toThrow()
    expect(() => parseFastJudgeCandidate(valid('{"dimension":"AUTHORIZATION","dimension":"AUTHORIZATION","verdict":"UNKNOWN","rationale":"safe","referencedFeatureIds":[]}'), requested, features)).toThrow()
  })

  it('rechecks post-redaction field limits and retains strict existing bounds', () => {
    const nearLimit = `${'x'.repeat(1140)} https://u:p@example.test/?token=x`
    expect(() => parseFastJudgeCandidate(valid(`{"dimension":"AUTHORIZATION","verdict":"UNKNOWN","rationale":${JSON.stringify(nearLimit)},"referencedFeatureIds":[]}`), requested, features)).toThrow()
    expect(() => parseFastJudgeCandidate('```json\n' + valid() + '\n```', requested, features)).toThrow()
    expect(() => parseFastJudgeCandidate(valid('{"dimension":"RISK","verdict":"UNKNOWN","rationale":"x","referencedFeatureIds":[]}'), requested, features)).toThrow()
  })

  it('enforces scheduler concurrency, saturation, duplicate keys, queued cancellation, and drain', async () => {
    const scheduler = new JudgeScheduler(1, 1)
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    let active = 0
    let maximum = 0
    const run = async (signal: AbortSignal) => {
      active += 1
      maximum = Math.max(maximum, active)
      await gate
      active -= 1
      return { ok: !signal.aborted } as const
    }
    const first = scheduler.enqueue('first', run)
    const second = scheduler.enqueue('second', run)
    await expect(scheduler.enqueue('third', run)).resolves.toMatchObject({ ok: false, failure: 'JUDGE_QUEUE_SATURATED' })
    await expect(scheduler.enqueue('first', run)).resolves.toMatchObject({ ok: false, failure: 'JUDGE_SUPERSEDED' })
    scheduler.cancel('second')
    await expect(second).resolves.toMatchObject({ ok: false, failure: 'JUDGE_NATIVE_DECISION' })
    release()
    await expect(first).resolves.toMatchObject({ ok: true })
    expect(maximum).toBe(1)
    await scheduler.dispose()
  })

  it('keeps disabled defaults bounded and rejects partial reviewer configuration', () => {
    expect(normalizeFastJudgeConfig(undefined)).toMatchObject({ enabled: false, maxTokens: 512 })
    expect(() => normalizeFastJudgeConfig({ enabled: true, timeoutMs: 10, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: 'mock' } })).toThrow()
  })

  it('enforces exact route priority, no-route failure, eligibility, and EvidenceQuality exclusion', () => {
    const sessionRoute = { requestHeader: () => ({ config: { provider: 'session-provider', model: 'session-model' } }) } as unknown as Session
    const sessionConfig = normalizeFastJudgeConfig({ enabled: true, timeoutMs: 10, maxConcurrentJudges: 1, maxPendingJudges: 1 })
    expect(resolveReviewerRoute(sessionConfig, sessionRoute)).toEqual({ provider: 'session-provider', model: 'session-model' })
    const dedicated = normalizeFastJudgeConfig({ enabled: true, timeoutMs: 10, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: 'dedicated', model: 'dedicated-model' } })
    expect(resolveReviewerRoute(dedicated, sessionRoute)).toEqual({ provider: 'dedicated', model: 'dedicated-model' })
    expect(resolveReviewerRoute(sessionConfig, fakeSession())).toBeUndefined()
    const noEligible = buildPhase5Context({ session: fakeSession('no-eligible'), executionId: 'no-eligible', seed: undefined, ruleEvaluation: evaluation({ operationKind: 'unknown', mutating: 'unknown' }), failureSummary: failure(), userRing: new DirectUserRing(), ledger: undefined })
    const eligible = buildPhase5Context({ session: fakeSession('eligible'), executionId: 'eligible', seed: undefined, ruleEvaluation: evaluation({ operationKind: 'filesystem-read' }), failureSummary: failure(), userRing: new DirectUserRing(), ledger: undefined })
    expect(requestedJudgeDimensions(noEligible)).toEqual([])
    expect(requestedJudgeDimensions(eligible)).not.toContain('EVIDENCE_QUALITY' as never)
  })

  it('rejects non-text/error streams and preserves HYPOTHESIS-only model data', async () => {
    const context = buildPhase5Context({ session: fakeSession('stream-context'), executionId: 'stream-context', seed: undefined, ruleEvaluation: evaluation({ operationKind: 'filesystem-read' }), failureSummary: failure(), userRing: new DirectUserRing(), ledger: undefined })
    const config = normalizeFastJudgeConfig({ enabled: true, timeoutMs: 50, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: 'mock', model: 'model' } })
    const run = async (chunks: readonly StreamChunk[]) => executeFastJudge({ stream: async function* () { yield* chunks } }, { provider: 'mock', model: 'model' }, context, ['AUTHORIZATION'], config, new AbortController().signal)
    const toolChunks: StreamChunk[] = [
      { type: 'block-start', index: 0, blockType: 'tool-call' },
      { type: 'tool-call-delta', index: 0, id: 'tool-call' as never, name: 'x', argumentsDelta: '{}' },
      { type: 'block-end', index: 0, block: { type: 'tool-call', id: 'tool-call' as never, name: 'x', arguments: '{}' } },
      { type: 'finish', reason: { kind: 'stop' } },
    ]
    expect(await run(toolChunks)).toMatchObject({ ok: false, failure: 'JUDGE_INVALID_OUTPUT' })
    expect(await run([{ type: 'finish', reason: { kind: 'error', failure: { code: 'MOCK', message: 'mock failure' } } }])).toMatchObject({ ok: false, failure: 'JUDGE_STREAM_ERROR' })
    const validText = JSON.stringify({ schemaVersion: 1, results: [{ dimension: 'AUTHORIZATION', verdict: 'UNKNOWN', rationale: 'safe', referencedFeatureIds: [], proposedFacts: [{ statement: 'unverified', status: 'HYPOTHESIS' }] }], suggestedAlternatives: [{ title: 'alternative', description: 'bounded' }] })
    const validChunks: StreamChunk[] = [{ type: 'block-start', index: 0, blockType: 'text' }, { type: 'text-delta', index: 0, text: validText }, { type: 'block-end', index: 0, block: { type: 'text', text: validText } }, { type: 'finish', reason: { kind: 'stop' } }]
    const result = await run(validChunks)
    expect(result.ok).toBe(true)
    expect(result.candidate?.results[0]?.proposedFacts[0]?.status).toBe('HYPOTHESIS')
    expect(result.candidate?.suggestedAlternatives).toEqual([{ title: 'alternative', description: 'bounded' }])
  })
})
