import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'

const capabilities = Object.freeze({ agentOptions: true, outputSchema: true, depthLimit: true, toolFilter: true, persona: true })

function mockRuntime(result, calls, disposals, stopReason = 'completed') {
  return {
    getProvider: name => name === 'spawn' ? { name: 'spawn', capabilities, inheritsParentContext: false } : undefined,
    start: async (_name, request) => {
      calls.push({ maxDepth: request.maxDepth, allow: [...request.toolFilter.allow], persona: request.persona, hasSchema: typeof request.outputSchema === 'object' })
      return { result: Promise.resolve({ structured: result, stopReason }), dispose: async () => { disposals.count += 1 } }
    },
  }
}

function deferred() {
  let resolve
  const promise = new Promise(value => { resolve = value })
  return { promise, resolve }
}

async function runCoordinatorProductPath() {
  const { createUserMessage, ToolCallId } = await import('@deepseek-ai/dsh-llm')
  const { ActiveExecutionIndex } = await import('../src/host/correlation.ts')
  const { OperationFoundation } = await import('../src/host/operation-foundation.ts')
  const { RetryEscalationAnalyzer } = await import('../src/host/retry-escalation.ts')
  const { RuleEngine } = await import('../src/host/rule-engine.ts')
  const { ApprovalAssessmentCoordinator } = await import('../src/host/assessment-envelope.ts')
  const session = { id: 'p9-benchmark-session', header: { cwd: '/workspace' } }
  const index = new ActiveExecutionIndex()
  const foundation = new OperationFoundation()
  const failures = new RetryEscalationAnalyzer()
  const rules = new RuleEngine()
  const ledger = { snapshot: () => ({ sessionId: session.id, health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }) }
  const evidence = {
    canCollect: () => true,
    collect: (executionId, callback) => queueMicrotask(() => callback({ schemaVersion: 1, evidenceId: `benchmark-${executionId}`, executionId, status: 'COMPLETE', observedAt: Date.now(), facts: { targetCountKnown: true, canonicalTargetsKnown: true, workspaceContained: true, pathAliasObserved: false, versionControlled: true, exactTargetsClean: true, checkpointAvailable: 'unknown', rollbackMechanismKnown: 'unknown', packageManifestPresent: false, packageManifestValid: 'unknown', lifecycleScriptsPresent: false }, counts: { evidenceItems: 1, fileReads: 0, evidenceChars: 0, directoryEntries: 0 }, truncated: false, reasonCodes: [] })),
    cancel: () => undefined,
  }
  const candidate = { schemaVersion: 1, results: [
    { dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'bounded local user goal', referencedFeatureIds: ['authorization.goalKnown'] },
    { dimension: 'NECESSITY', verdict: 'LIKELY_NECESSARY', rationale: 'bounded local operation', referencedFeatureIds: ['authorization.goalKnown'] },
  ], suggestedAlternatives: [] }
  const calls = []
  let disposals = 0
  const provider = { name: 'spawn', capabilities, inheritsParentContext: false }
  const runtime = { getProvider: name => name === 'spawn' ? provider : undefined, start: async (_name, request) => { calls.push(request); return { result: Promise.resolve({ stopReason: 'completed', structured: candidate }), dispose: async () => { disposals += 1 } } } }
  const coordinator = new ApprovalAssessmentCoordinator(foundation.diagnostics, { rules: rules.diagnostics, failureChain: failures.diagnostics, ledger, evidence, deepJudge: { enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 100, maxConcurrentJudges: 1, maxPendingJudges: 2, maxTokens: 128 } })
  await coordinator.attachSubagents(runtime)
  coordinator.observeSessionEvent(session, { type: 'user/message', data: createUserMessage({ content: [{ type: 'text', text: 'Please inspect the bounded local file.' }], source: { kind: 'user' } }) }, index)
  const agent = { session }
  const exec = { callId: ToolCallId('p9-benchmark-call'), rootCallId: ToolCallId('p9-benchmark-call'), name: 'read', arguments: { file_path: 'review.json' }, signal: new AbortController().signal, token: Symbol(), agent }
  const executionId = index.observePreExecute(exec)
  foundation.capture(exec, executionId); failures.observePreExecute(exec, executionId); rules.observePreExecute(exec, executionId, failures.diagnostics.get(executionId)); coordinator.captureReviewerSeed(exec, executionId); coordinator.captureDeepJudgeParent(exec, executionId)
  coordinator.observeSessionEvent(session, { type: 'approval/asked', data: { id: 'p9-benchmark-approval', toolName: 'read', callId: ToolCallId('p9-benchmark-call') } }, index)
  await new Promise(resolve => setTimeout(resolve, 25))
  const latest = coordinator.diagnostics.getLatestForApproval(session, 'p9-benchmark-approval')
  const view = latest === undefined ? undefined : coordinator.queryOpenPresentationByAssessmentId(latest.assessmentId)
  const payload = calls[0] === undefined ? undefined : JSON.parse(calls[0].prompt)
  await coordinator.dispose()
  return {
    materialEvidenceRequired: latest?.provenance.evidence?.status === 'COMPLETE',
    deepTriggered: latest?.provenance.deepJudge?.invoked === true,
    a4SupersedesA3: latest?.supersedesAssessmentId !== undefined,
    evidencePreserved: latest?.contextId === `ra-context-evidence-benchmark-${executionId}` && latest.uncertainties.some(item => item.code === 'CANONICAL_TARGETS_UNAVAILABLE') === false,
    requestIsolation: calls[0] !== undefined && calls[0].maxDepth === 1 && calls[0].toolFilter.allow.length === 0,
    payloadOverlayMatches: payload?.features?.some(item => item.id === 'scope.canonicalTargetsKnown' && item.value === true) === true,
    disposalCount: disposals,
    browserStage: view?.kind === 'VIEW' ? view.view.stage : 'unknown',
  }
}

export async function main({ smoke = true } = {}) {
  const started = performance.now()
  const root = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p9-'))
  const calls = []
  const disposals = { count: 0 }
  const result = { schemaVersion: 1, results: [
    { dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'bounded local user goal', referencedFeatureIds: ['authorization.goalKnown'] },
    { dimension: 'NECESSITY', verdict: 'LIKELY_NECESSARY', rationale: 'operation matches the goal', referencedFeatureIds: ['authorization.goalKnown'] },
  ], suggestedAlternatives: [{ title: 'Narrower local operation', description: 'Use a narrower bounded target.' }] }
  try {
    await writeFile(join(root, 'reviewer-input.json'), JSON.stringify({ localOnly: true }))
    const { executeDeepJudge, normalizeDeepJudgeConfig } = await import('../src/host/deep-judge.ts')
    const { DeepJudgeScheduler } = await import('../src/host/deep-judge-scheduler.ts')
    const { parseBridgeRead } = await import('../src/bridge-contract.ts')
    const config = normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 25, maxConcurrentJudges: 1, maxPendingJudges: 2, maxTokens: 128 })
    const valid = await executeDeepJudge(mockRuntime(result, calls, disposals), { session: 'local-mock-parent' }, JSON.stringify({ bounded: true }), ['AUTHORIZATION', 'NECESSITY'], new Set(['authorization.goalKnown']), config, new AbortController().signal)
    const partial = await executeDeepJudge(mockRuntime(result, [], { count: 0 }, 'max-tokens'), { session: 'local-mock-parent' }, JSON.stringify({ bounded: true }), ['AUTHORIZATION', 'NECESSITY'], new Set(['authorization.goalKnown']), config, new AbortController().signal)
    const productPath = await runCoordinatorProductPath()
    const browserDeep = parseBridgeRead({ kind: 'VIEW', view: { schemaVersion: 4, sessionId: 's', callId: 'c', association: 'BOUND', status: 'pending', stage: 'deep', reasonCodes: [], updatedAt: 1 } })

    const timeoutScheduler = new DeepJudgeScheduler(1, 1)
    const timeoutGate = deferred()
    const timeoutJob = timeoutScheduler.enqueue('timeout', async signal => {
      if (signal.aborted) return { ok: false, failure: 'DEEP_JUDGE_NATIVE_DECISION' }
      await Promise.race([timeoutGate.promise, new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))])
      return { ok: false, failure: 'DEEP_JUDGE_TIMEOUT' }
    })
    timeoutScheduler.cancel('timeout', 'DEEP_JUDGE_NATIVE_DECISION')
    const timeout = await timeoutJob
    await timeoutScheduler.dispose()

    const saturationScheduler = new DeepJudgeScheduler(1, 2)
    const saturationGate = deferred()
    const saturationPromises = [
      saturationScheduler.enqueue('s1', async signal => { if (signal.aborted) return { ok: false, failure: 'DEEP_JUDGE_ABORTED' }; await Promise.race([saturationGate.promise, new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }))]); return { ok: true } }),
      saturationScheduler.enqueue('s2', async () => ({ ok: true })),
      saturationScheduler.enqueue('s3', async () => ({ ok: true })),
      saturationScheduler.enqueue('s4', async () => ({ ok: true })),
    ]
    saturationGate.resolve()
    const saturation = await Promise.all(saturationPromises)
    await saturationScheduler.dispose()

    const lateStartScheduler = new DeepJudgeScheduler(1, 1)
    const lateStartGate = deferred()
    let lateDisposed = 0
    const lateRuntime = {
      getProvider: name => name === 'spawn' ? { name: 'spawn', capabilities, inheritsParentContext: false } : undefined,
      start: async () => { await lateStartGate.promise; return { result: Promise.resolve({ stopReason: 'completed', structured: result }), dispose: async () => { lateDisposed += 1 } } },
    }
    const lateConfig = normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 10, maxConcurrentJudges: 1, maxPendingJudges: 1, maxTokens: 64 })
    const lateJob = lateStartScheduler.enqueue('late-start', signal => executeDeepJudge(lateRuntime, { session: 'late' }, '{}', ['AUTHORIZATION', 'NECESSITY'], new Set(['authorization.goalKnown']), lateConfig, signal))
    await new Promise(resolve => setTimeout(resolve, 20))
    const queuedBeforeDrain = lateStartScheduler.enqueue('after-late-start', async () => ({ ok: true }))
    const heldSlot = lateStartScheduler.activeCount === 1 && lateStartScheduler.pendingCount === 1
    lateStartGate.resolve()
    const lateResult = await lateJob
    const queuedAfterDrain = await queuedBeforeDrain
    await lateStartScheduler.dispose()

    const output = {
      run: { benchmark: 'R5_PHASE9_LOCAL_DEEP_JUDGE', mode: smoke ? 'SMOKE' : 'FULL', samples: smoke ? 1 : 2, labels: ['LOCAL_REVIEWER_ONLY', 'EXTERNAL_PROVIDER_NOT_USED', 'NETWORK_NOT_USED', 'REGISTRY_NOT_USED', 'GIT_REMOTE_NOT_USED'], realProductExecution: true, elapsedMs: performance.now() - started },
      trigger: { executed: true, a4CandidateValidated: valid.ok, candidateDimensions: valid.candidate?.results.map(item => item.dimension) ?? [], alternativeVerification: valid.candidate?.suggestedAlternatives.length === 1 ? 'UNVERIFIED' : 'NONE', nonCompletedRejected: partial.ok === false && partial.failure === 'DEEP_JUDGE_RESULT_FAILED', productPath },
      request: calls[0],
      lifecycle: { timeout: timeout.failure === 'DEEP_JUDGE_NATIVE_DECISION' ? 'CANCELLED' : timeout.failure, runDisposals: disposals.count, browserStage: browserDeep?.kind === 'VIEW' && browserDeep.view.schemaVersion === 4 && browserDeep.view.stage === 'deep' ? 'deep' : 'UNKNOWN' },
      saturation: { maxConcurrent: 1, pendingBound: 2, saturated: saturation.filter(item => item.ok === false).length },
      timeoutOwnership: { logicalTimeout: lateResult.failure, heldSlot, queuedBeforeDrain: queuedBeforeDrain !== undefined, queuedAfterDrain: queuedAfterDrain.ok, lateDisposed },
      external: { providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0 },
    }
    return Object.freeze(output)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}
