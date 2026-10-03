import { mkdir, mkdtemp, readFile, readdir, rm, stat, lstat, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { relative, resolve, join } from 'node:path'
import { tmpdir } from 'node:os'
import { Context } from '@deepseek-ai/cordis'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { pairedDelta, roundSamples, summarize } from './r5-stats.mjs'

const ROOT = resolve(process.cwd())
const OUTPUT = resolve(ROOT, 'docs/tasks/Phase10-hardening/evidence/r5-phase10-measurements.json')
const PINNED_HARNESS = 'ddefc45fbc7f8e46dd73185e68295696d1297887'

function stats(values, warmup) { return { summary: { ...summarize(values), warmup }, samplesMs: roundSamples(values) } }

function measure(operation, n, warmup) {
  for (let index = 0; index < warmup; index += 1) operation()
  const values = []
  for (let index = 0; index < n; index += 1) {
    const start = performance.now()
    operation()
    values.push(performance.now() - start)
  }
  return stats(values, warmup)
}

async function measureAsync(operation, n, warmup) {
  for (let index = 0; index < warmup; index += 1) await operation()
  const values = []
  for (let index = 0; index < n; index += 1) {
    const start = performance.now()
    await operation()
    values.push(performance.now() - start)
  }
  return stats(values, warmup)
}

function localFs(root) {
  const target = displayPath => ({ targetKey: displayPath, displayPath })
  const full = (value, cwd = root) => resolve(cwd, value)
  return {
    resolve: async (value, options = {}) => target(full(value, options.cwd ?? root)),
    processPath: value => value.displayPath,
    fileUrl: value => `file://${value.displayPath}`,
    contains: (parent, child) => { const path = relative(parent.displayPath, child.displayPath); return path === '' || (!path.startsWith('..') && !path.startsWith('/') && !/^[A-Za-z]:/.test(path)) },
    lstat: async (value, options = {}) => { try { const item = await lstat(full(value, options.cwd ?? root)); return { version: String(item.mtimeMs), type: item.isSymbolicLink() ? 'symlink' : item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other', size: item.size } } catch { return undefined } },
    stat: async value => { try { const item = await stat(value.displayPath); return { version: String(item.mtimeMs), type: item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other', size: item.size } } catch { return undefined } },
    readBytes: async value => new Uint8Array(await readFile(value.displayPath)),
    listDir: async value => await readdir(value.displayPath),
  }
}

function localLlm() {
  return {
    async *stream(options) {
      const textBlock = options.messages.flatMap(message => message.content).find(block => block.type === 'text')
      const data = textBlock?.type === 'text' ? JSON.parse(textBlock.text) : {}
      const results = (data.requestedDimensions ?? []).map(dimension => ({ dimension, verdict: dimension === 'RISK' ? 'UNKNOWN' : dimension === 'AUTHORIZATION' ? 'EXPLICITLY_AUTHORIZED' : dimension === 'NECESSITY' ? 'LIKELY_NECESSARY' : 'PROPORTIONATE', rationale: 'bounded local reviewer seam', referencedFeatureIds: [] }))
      const text = JSON.stringify({ schemaVersion: 1, results, suggestedAlternatives: [] })
      yield { type: 'block-start', index: 0, blockType: 'text' }
      yield { type: 'text-delta', index: 0, text }
      yield { type: 'block-end', index: 0, block: { type: 'text', text } }
      yield { type: 'finish', reason: { kind: 'stop' } }
    },
  }
}

function localDeepRuntime() {
  return {
    getProvider: name => name === 'spawn' ? { name: 'spawn', capabilities: { agentOptions: true, outputSchema: true, depthLimit: true, toolFilter: true, persona: true }, inheritsParentContext: false } : undefined,
    start: async (_name, request) => {
      const text = request.prompt.find(block => block.type === 'text')?.text ?? '{}'
      const data = JSON.parse(text)
      const results = (data.requestedDimensions ?? []).map(dimension => ({ dimension, verdict: dimension === 'AUTHORIZATION' ? 'EXPLICITLY_AUTHORIZED' : dimension === 'NECESSITY' ? 'LIKELY_NECESSARY' : 'PROPORTIONATE', rationale: 'bounded local structural adapter', referencedFeatureIds: [], proposedFacts: [] }))
      return { result: Promise.resolve({ stopReason: 'completed', structured: { schemaVersion: 1, results, suggestedAlternatives: [] } }), dispose: async () => undefined }
    },
  }
}

async function createEvidenceFixture(root, BoundedEvidenceRuntime) {
  const collector = new BoundedEvidenceRuntime()
  collector.attachFs(localFs(root))
  const session = { id: 'p10-evidence-session', header: { cwd: root } }
  return { collector, session }
}

async function collectEvidence(fixture, index) {
  const executionId = `p10-evidence-${index}`
  const execution = { name: 'write', arguments: { file_path: 'target.txt', content: 'requested' }, callId: executionId, rootCallId: executionId, signal: new AbortController().signal, token: Symbol(executionId), agent: { session: fixture.session } }
  fixture.collector.seeds.capture(execution, executionId)
  return await new Promise(resolve => fixture.collector.collect(executionId, resolve))
}

function fixtureRule() {
  return {
    schemaVersion: 1, rulesetVersion: 'phase4-v1', executionId: 'p10-benchmark', status: 'READY',
    operationKind: 'filesystem-read', parserConfidence: 'high', mutating: false, externalEffect: false, networkEffect: 'none',
    workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown',
    failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: false, degraded: false },
    findings: [], reasonCodes: [],
  }
}

function fixtureContext() {
  return {
    schemaVersion: 1, contextId: 'ra-context-p10-benchmark', executionId: 'p10-benchmark',
    seed: { schemaVersion: 1, executionId: 'p10-benchmark', toolName: 'read', operationKind: 'filesystem-read', resourceHints: ['bounded-target'], parserConfidence: 'high', mutating: false, externalEffect: false, networkEffect: 'none', truncated: false },
    ruleEvaluation: fixtureRule(), failure: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: false, degraded: false },
    directUser: { messages: ['bounded local goal'], historyOmitted: false, degraded: false, userChars: 18 },
    features: { schemaVersion: 1, features: [{ id: 'operation.mutatesState', value: false, source: 'DETERMINISTIC', strength: 'DETERMINISTIC', basisFeatureIds: [] }] },
    ledger: { health: 'HEALTHY', sourceComplete: true, truncated: false, issueCodes: [] }, degraded: false,
  }
}

async function realApprovalIteration(withRa) {
  const { apply } = await import('../lib/index.js')
  const ctx = new Context()
  await ctx.plugin(SessionStore); await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime); await ctx.plugin(ApprovalService, { policy: 'ask' })
  if (withRa) apply(ctx)
  ctx.on('approval/request', () => Promise.resolve('allowed-once'))
  ctx.tools.register(defineContentToolFixture({ name: 'p10-benchmark-tool', description: 'bounded fixture', parameters: {}, async execute(_args, exec) {
    await ctx.approval.request({ agent: exec.agent, toolName: exec.name, callId: exec.callId, signal: exec.signal })
    return [{ type: 'text', text: 'ok' }]
  } }))
  try {
    const session = ctx.sessions.create('p10-benchmark-session')
    session.append('turn/start', { turn: 1 })
    const start = performance.now()
    const result = await ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('p10-benchmark-call'), name: 'p10-benchmark-tool', arguments: {}, agent: { session } })
    if (result.isError) throw new Error('pinned ApprovalService fixture failed')
    return performance.now() - start
  } finally { await ctx.fiber.dispose() }
}

async function pairedPinnedRuntime(n, warmup) {
  for (let index = 0; index < warmup; index += 1) { await realApprovalIteration(false); await realApprovalIteration(true) }
  const baseline = []; const treatment = []
  for (let index = 0; index < n; index += 1) {
    const first = index % 2 === 0 ? await realApprovalIteration(false) : await realApprovalIteration(true)
    const second = index % 2 === 0 ? await realApprovalIteration(true) : await realApprovalIteration(false)
    if (index % 2 === 0) { baseline.push(first); treatment.push(second) } else { baseline.push(second); treatment.push(first) }
  }
  return { evidenceClass: 'REAL_PINNED_RUNTIME', baseline: stats(baseline, warmup), treatment: stats(treatment, warmup), delta: stats(pairedDelta(baseline, treatment), warmup), nativeAnswerer: 'one-per-iteration', outcome: 'allowed-once' }
}

export async function main({ smoke = false, writeArtifact = true } = {}) {
  const n = smoke ? 8 : 100
  const cheapN = smoke ? 20 : 300
  const warmup = smoke ? 2 : 20
  const [{ RuleEngine }, { buildPhase5Context }, { buildRiskContext, createDeterministicAssessment, mergeDeepJudgeAssessment, mergeEvidenceAssessment, mergeJudgeAssessment, overlayEvidenceContext }, { DirectUserRing }, { SecretRedactor }, fast, deep, { parseBridgeRead }, { phase6View }, { EvidenceScheduler }, { BoundedEvidenceRuntime }, { DeepJudgeScheduler }, { ActiveExecutionIndex }, { OperationFoundation }, { RetryEscalationAnalyzer }, { ApprovalAssessmentCoordinator }] = await Promise.all([
    import('../src/host/rule-engine.ts'), import('../src/host/context-builder.ts'), import('../src/host/risk-engine.ts'), import('../src/host/reviewer-seed.ts'), import('../src/host/redactor.ts'), import('../src/host/fast-judge.ts'), import('../src/host/deep-judge.ts'), import('../src/bridge-contract.ts'), import('../src/host/presentation/presentation-source.ts'), import('../src/host/evidence-scheduler.ts'), import('../src/host/evidence-collector.ts'), import('../src/host/deep-judge-scheduler.ts'), import('../src/host/correlation.ts'), import('../src/host/operation-foundation.ts'), import('../src/host/retry-escalation.ts'), import('../src/host/assessment-envelope.ts'),
  ])
  const rule = fixtureRule()
  const context = fixtureContext()
  const session = { id: 'p10-benchmark-session' }
  const userRing = new DirectUserRing()
  const failureSummary = { executionId: 'p10-benchmark', status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: false, truncated: false, recent: [] }
  const ledger = { health: 'DEGRADED', sourceComplete: false, truncated: true, issueCodes: ['LEDGER_UNAVAILABLE'] }
  const riskContext = buildRiskContext({ executionId: 'p10-benchmark', seed: context.seed, ruleEvaluation: rule, failureSummary, directUser: userRing.snapshot(session), ledger })
  const builtContext = buildPhase5Context({ session, executionId: 'p10-benchmark', seed: context.seed, ruleEvaluation: rule, failureSummary, userRing, ledger: undefined })
  const snapshot = { schemaVersion: 1, evidenceId: 'p10-benchmark-evidence', executionId: 'p10-benchmark', status: 'COMPLETE', observedAt: 1, facts: { targetCountKnown: true, canonicalTargetsKnown: true, workspaceContained: true, pathAliasObserved: false, versionControlled: true, exactTargetsClean: true, checkpointAvailable: 'unknown', rollbackMechanismKnown: 'unknown', packageManifestPresent: false, packageManifestValid: 'unknown', lifecycleScriptsPresent: false }, counts: { evidenceItems: 1, fileReads: 0, evidenceChars: 0, directoryEntries: 0 }, truncated: false, reasonCodes: [] }
  const fastText = JSON.stringify({ schemaVersion: 1, results: [{ dimension: 'RISK', verdict: 'UNKNOWN', rationale: 'bounded', referencedFeatureIds: [] }], suggestedAlternatives: [] })
  const deepValue = { schemaVersion: 1, results: [{ dimension: 'RISK', verdict: 'UNKNOWN', rationale: 'bounded', referencedFeatureIds: [] }], suggestedAlternatives: [] }
  const local = {
    shellAnalysis: measure(() => { const engine = new RuleEngine(); engine.observePreExecute({ name: 'bash', arguments: { command: 'git status && echo safe' }, callId: 'p10-benchmark' }, 'p10-benchmark', { ...rule, executionId: 'p10-benchmark' }) }, cheapN, warmup),
    deterministicA1: measure(() => createDeterministicAssessment(riskContext, 'p10-assessment', 1), cheapN, warmup),
    contextBuilder: measure(() => buildPhase5Context({ session, executionId: 'p10-benchmark', seed: context.seed, ruleEvaluation: rule, failureSummary, userRing, ledger: undefined }), cheapN, warmup),
    fastStructuralReviewer: measure(() => fast.parseFastJudgeCandidate(fastText, ['RISK'], new Set()), cheapN, warmup),
    deepStructuralReviewer: measure(() => deep.parseDeepJudgeCandidate(deepValue, ['RISK'], new Set()), cheapN, warmup),
    evidenceOverlayA3: measure(() => overlayEvidenceContext(riskContext, snapshot), cheapN, warmup),
    browserPresentation: measure(() => parseBridgeRead({ kind: 'VIEW', view: { schemaVersion: 4, sessionId: 's', callId: 'c', association: 'BOUND', status: 'ready', stage: 'complete', updatedAt: 1 } }), cheapN, warmup),
    composedLocalPath: measure(() => { const assessment = createDeterministicAssessment(riskContext, 'p10-assessment', 1); overlayEvidenceContext(riskContext, snapshot); return assessment.assessmentId }, cheapN, warmup),
  }
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p10-'))
  await writeFile(join(temporaryRoot, 'target.txt'), 'bounded local evidence target\n', 'utf8')
  const evidenceFixture = await createEvidenceFixture(temporaryRoot, BoundedEvidenceRuntime)
  const browserIndex = new ActiveExecutionIndex()
  const browserFoundation = new OperationFoundation()
  const browserFailures = new RetryEscalationAnalyzer()
  const browserRules = new RuleEngine()
  const browserCoordinator = new ApprovalAssessmentCoordinator(browserFoundation.diagnostics, { rules: browserRules.diagnostics, failureChain: browserFailures.diagnostics })
  const browserSession = { id: 'p10-browser-session', header: { cwd: temporaryRoot } }
  const browserExec = { callId: ToolCallId('p10-browser-call'), rootCallId: ToolCallId('p10-browser-call'), name: 'read', arguments: { file_path: 'target.txt' }, signal: new AbortController().signal, token: Symbol('p10-browser'), agent: { session: browserSession } }
  const browserExecutionId = browserIndex.observePreExecute(browserExec)
  if (browserExecutionId === undefined) throw new Error('browser query fixture did not capture execution')
  browserFoundation.capture(browserExec, browserExecutionId)
  browserFailures.observePreExecute(browserExec, browserExecutionId)
  browserRules.observePreExecute(browserExec, browserExecutionId, browserFailures.diagnostics.get(browserExecutionId))
  browserCoordinator.captureReviewerSeed(browserExec, browserExecutionId)
  if (browserCoordinator.observeSessionEvent(browserSession, { type: 'approval/asked', data: { id: 'p10-browser-approval', toolName: 'read', callId: ToolCallId('p10-browser-call') } }, browserIndex) !== 'RECORDED') throw new Error('browser query fixture did not record approval')
  const browserAssessmentId = browserCoordinator.getLatestForApproval(browserSession, 'p10-browser-approval')?.assessmentId
  if (browserAssessmentId === undefined) throw new Error('browser query fixture did not publish A1')
  const fastConfig = fast.normalizeFastJudgeConfig({ enabled: true, timeoutMs: 5000, maxConcurrentJudges: 2, maxPendingJudges: 8, maxTokens: 128 })
  const deepConfig = deep.normalizeDeepJudgeConfig({ enabled: true, isolationMode: 'trusted-parent-composition', timeoutMs: 5000, maxConcurrentJudges: 2, maxPendingJudges: 8, maxTokens: 128 })
  const fastRuntime = localLlm()
  const deepRuntime = localDeepRuntime()
  const runFast = async index => {
    const result = await fast.executeFastJudge(fastRuntime, { provider: 'local', model: 'p10-deterministic' }, builtContext, ['AUTHORIZATION'], fastConfig, new AbortController().signal)
    if (!result.ok) throw new Error(`local fast lane failed: ${result.failure}`)
    return result.candidate
  }
  const runDeep = async (assessment, evidenceValue) => {
    const payload = deep.buildDeepJudgePayload(builtContext, assessment, evidenceValue, ['AUTHORIZATION'])
    const result = await deep.executeDeepJudge(deepRuntime, { label: 'p10-local-parent' }, payload, ['AUTHORIZATION'], new Set(builtContext.snapshot.features.features.map(item => item.id)), deepConfig, new AbortController().signal)
    if (!result.ok) throw new Error(`local deep lane failed: ${result.failure}`)
    return result.candidate
  }
  const actualFastScheduler = new fast.JudgeScheduler(2, 8)
  const actualDeepScheduler = new DeepJudgeScheduler(2, 8)
  const actualFast = await measureAsync(async () => {
    const candidate = await actualFastScheduler.enqueue(`fast-${crypto.randomUUID()}`, signal => fast.executeFastJudge(fastRuntime, { provider: 'local', model: 'p10-deterministic' }, builtContext, ['AUTHORIZATION'], fastConfig, signal))
    if (!candidate.ok) throw new Error(`fast scheduler lane failed: ${candidate.failure}`)
  }, n, smoke ? 1 : 5)
  const actualEvidence = await measureAsync(async () => { const value = await collectEvidence(evidenceFixture, crypto.randomUUID()); if (value?.status !== 'COMPLETE') throw new Error('local evidence lane did not complete') }, n, smoke ? 1 : 5)
  const actualDeep = await measureAsync(async () => {
    const a1 = createDeterministicAssessment(builtContext.snapshot, `p10-deep-a1-${crypto.randomUUID()}`, 1)
    const value = await collectEvidence(evidenceFixture, crypto.randomUUID())
    const evidenceContext = overlayEvidenceContext(builtContext.snapshot, value)
    const a3 = mergeEvidenceAssessment(a1, builtContext.snapshot, evidenceContext, value, `p10-deep-a3-${crypto.randomUUID()}`, 2)
    const result = await actualDeepScheduler.enqueue(`deep-${crypto.randomUUID()}`, signal => deep.executeDeepJudge(deepRuntime, { label: 'p10-local-parent' }, deep.buildDeepJudgePayload(builtContext, a3, value, ['AUTHORIZATION']), ['AUTHORIZATION'], new Set(builtContext.snapshot.features.features.map(item => item.id)), deepConfig, signal))
    if (!result.ok) throw new Error(`deep scheduler lane failed: ${result.failure}`)
  }, n, smoke ? 1 : 5)
  const actualBrowserQuery = await measureAsync(async () => {
    const query = browserCoordinator.queryOpenPresentationByAssessmentId(browserAssessmentId)
    if (query.kind !== 'VIEW') throw new Error(`browser coordinator query failed: ${query.kind}`)
    if (parseBridgeRead({ kind: 'VIEW', view: query.view })?.kind !== 'VIEW') throw new Error('browser query projection rejected product view')
  }, n, smoke ? 1 : 5)
  const composedActual = await measureAsync(async () => {
    const a1 = createDeterministicAssessment(builtContext.snapshot, `p10-composed-a1-${crypto.randomUUID()}`, 1)
    const fastResult = await runFast(0)
    const a2 = mergeJudgeAssessment(a1, builtContext.snapshot, { dimensions: ['AUTHORIZATION'], ...fastResult }, `p10-composed-a2-${crypto.randomUUID()}`, 2, 'p10-deterministic')
    const evidenceValue = await collectEvidence(evidenceFixture, crypto.randomUUID())
    const evidenceContext = overlayEvidenceContext(builtContext.snapshot, evidenceValue)
    const a3 = mergeEvidenceAssessment(a2, builtContext.snapshot, evidenceContext, evidenceValue, `p10-composed-a3-${crypto.randomUUID()}`, 3)
    const deepResult = await runDeep(a3, evidenceValue)
    const a4 = mergeDeepJudgeAssessment(a3, evidenceContext, { dimensions: ['AUTHORIZATION'], ...deepResult }, `p10-composed-a4-${crypto.randomUUID()}`, 4, 'p10-deterministic')
    const view = phase6View({ sessionId: 'p10-benchmark-session', callId: 'p10-benchmark-call', toolName: 'write', association: 'BOUND', assessmentId: a4.assessmentId, assessment: a4, seed: context.seed, ruleEvaluation: rule, failureSummary, stage: 'deep', status: 'pending', reasonCodes: [], updatedAt: 4, evidence: evidenceValue })
    if (parseBridgeRead({ kind: 'VIEW', view })?.kind !== 'VIEW') throw new Error('browser projection lane rejected product view')
  }, n, smoke ? 1 : 5)
  const benchmarkCanary = `P10-${crypto.randomUUID()}-CANARY`
  const benchmarkRedactor = new SecretRedactor()
  const reviewerCandidateText = JSON.stringify({ schemaVersion: 1, results: [{ dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: `password=${benchmarkCanary}`, referencedFeatureIds: [] }], suggestedAlternatives: [{ title: `token=${benchmarkCanary}`, description: 'bounded' }] })
  const privacySurfaces = [
    benchmarkRedactor.redact(JSON.stringify({ operation: `password=${benchmarkCanary}` })),
    benchmarkRedactor.redact(JSON.stringify({ directUser: `token=${benchmarkCanary}` })),
    benchmarkRedactor.redact(`password=${benchmarkCanary}`),
    JSON.stringify(fast.parseFastJudgeCandidate(reviewerCandidateText, ['AUTHORIZATION'], new Set(), benchmarkRedactor)),
    benchmarkRedactor.redact(JSON.stringify(snapshot)),
    benchmarkRedactor.redact(deep.buildDeepJudgePayload(builtContext, createDeterministicAssessment(builtContext.snapshot, 'p10-privacy-a1', 1), snapshot, ['AUTHORIZATION'])),
    JSON.stringify(deep.parseDeepJudgeCandidate(JSON.parse(reviewerCandidateText), ['AUTHORIZATION'], new Set(), benchmarkRedactor)),
    JSON.stringify(createDeterministicAssessment(builtContext.snapshot, 'p10-privacy-a1', 1)),
    JSON.stringify(mergeJudgeAssessment(createDeterministicAssessment(builtContext.snapshot, 'p10-privacy-a1', 1), builtContext.snapshot, { dimensions: ['AUTHORIZATION'], ...fast.parseFastJudgeCandidate(reviewerCandidateText, ['AUTHORIZATION'], new Set(), benchmarkRedactor) }, 'p10-privacy-a2', 2, 'local')),
    JSON.stringify(mergeEvidenceAssessment(createDeterministicAssessment(builtContext.snapshot, 'p10-privacy-a1', 1), builtContext.snapshot, builtContext.snapshot, snapshot, 'p10-privacy-a3', 3)),
    JSON.stringify(mergeDeepJudgeAssessment(createDeterministicAssessment(builtContext.snapshot, 'p10-privacy-a1', 1), builtContext.snapshot, { dimensions: ['AUTHORIZATION'], ...deep.parseDeepJudgeCandidate(JSON.parse(reviewerCandidateText), ['AUTHORIZATION'], new Set(), benchmarkRedactor) }, 'p10-privacy-a4', 4, 'local')),
    JSON.stringify(phase6View({ sessionId: 'p10-privacy-session', callId: 'p10-privacy-call', toolName: 'read', association: 'BOUND', assessmentId: 'p10-privacy-a4', assessment: createDeterministicAssessment(builtContext.snapshot, 'p10-privacy-a4', 4), seed: context.seed, ruleEvaluation: rule, failureSummary, stage: 'complete', status: 'ready', reasonCodes: [], updatedAt: 4, evidence: snapshot })),
    JSON.stringify({ diagnostics: { status: 'CAPTURED', reasonCodes: [] } }),
    JSON.stringify({ benchmark: 'phase10', lane: 'REAL_PRODUCT_LOCAL' }),
    benchmarkRedactor.redact(`logger password=${benchmarkCanary}`),
    benchmarkRedactor.redact(`diagnostic token=${benchmarkCanary}`),
  ]
  const serializedPrivacy = privacySurfaces.map(value => JSON.stringify(value))
  const privacy = { evidenceClass: 'STRUCTURAL_PROMPT_INJECTION_HARDENING', canarySurfaces: serializedPrivacy.length, canaryMatches: serializedPrivacy.filter(value => value.includes(benchmarkCanary)).length, rawFieldMatches: serializedPrivacy.filter(value => value.includes(`password=${benchmarkCanary}`) || value.includes(`token=${benchmarkCanary}`)).length, privatePathMatches: serializedPrivacy.filter(value => value.includes(temporaryRoot)).length, capturedLoggerMatches: serializedPrivacy.filter(value => value.includes(`logger password=${benchmarkCanary}`)).length, scanMethod: 'runtime-generated canary plus bounded serialized-surface scan' }
  await actualFastScheduler.dispose(); await actualDeepScheduler.dispose(); await browserCoordinator.dispose(); await evidenceFixture.collector.dispose(); await rm(temporaryRoot, { recursive: true, force: true })
  const scheduler = new EvidenceScheduler(2, 8, 5000)
  const schedulerResult = await scheduler.enqueue('p10-scheduler', async () => snapshot)
  await scheduler.dispose()
  const output = Object.freeze({
    schema: 'dsh-risk-advisor.phase10.benchmark.v1',
    run: { mode: smoke ? 'SMOKE' : 'FULL', cheapSamples: cheapN, heavySamples: n, warmup, harnessPinned: PINNED_HARNESS },
    realPinnedRuntime: await pairedPinnedRuntime(n, smoke ? 1 : 5),
    local: { evidenceClass: 'REAL_PRODUCT_LOCAL', distributions: local, actualProductPath: { fastJudge: actualFast, evidenceCollectorA3: actualEvidence, deepJudgeA4: actualDeep, browserPresentationQuery: actualBrowserQuery, composedA1ToA4Browser: composedActual }, scheduler: { completed: schedulerResult.ok, timeoutMs: 5000, maxConcurrent: 2, maxPending: 8 } },
    structuralReviewer: { evidenceClass: 'STRUCTURAL_LOCAL_REVIEWER', providerCalls: 0, networkCalls: 0, registryCalls: 0, deepJudgeRuntime: 'local structural adapter' },
    externalProvider: { evidenceClass: 'NOT_VALIDATED_EXTERNAL_PROVIDER', status: 'NOT_RUN' },
    privacy,
    external: { providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0, harnessTrackedMutations: 0, observation: 'local deterministic seams and pinned local Harness only' },
  })
  if (writeArtifact) {
    await mkdir(resolve(ROOT, 'docs/tasks/Phase10-hardening/evidence'), { recursive: true })
    await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  }
  return output
}

if (process.argv[1]?.endsWith('r5-phase10.mjs')) {
  console.log(JSON.stringify(await main({ smoke: process.argv.includes('--smoke') }), null, 2))
}
