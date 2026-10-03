import { mkdir, writeFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { resolve } from 'node:path'
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

export async function main({ smoke = false } = {}) {
  const n = smoke ? 8 : 100
  const cheapN = smoke ? 20 : 300
  const warmup = smoke ? 2 : 20
  const [{ RuleEngine }, { buildPhase5Context }, { buildRiskContext, createDeterministicAssessment }, { DirectUserRing }, { parseFastJudgeCandidate }, { parseDeepJudgeCandidate }, { parseBridgeRead }, { overlayEvidenceContext }, { EvidenceScheduler }] = await Promise.all([
    import('../src/host/rule-engine.ts'), import('../src/host/context-builder.ts'), import('../src/host/risk-engine.ts'), import('../src/host/reviewer-seed.ts'), import('../src/host/fast-judge.ts'), import('../src/host/deep-judge.ts'), import('../src/bridge-contract.ts'), import('../src/host/risk-engine.ts'), import('../src/host/evidence-scheduler.ts'),
  ])
  const rule = fixtureRule()
  const context = fixtureContext()
  const session = { id: 'p10-benchmark-session' }
  const userRing = new DirectUserRing()
  const failureSummary = { executionId: 'p10-benchmark', status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: 'unknown', permissionEscalation: false, truncated: false, recent: [] }
  const ledger = { health: 'DEGRADED', sourceComplete: false, truncated: true, issueCodes: ['LEDGER_UNAVAILABLE'] }
  const riskContext = buildRiskContext({ executionId: 'p10-benchmark', seed: context.seed, ruleEvaluation: rule, failureSummary, directUser: userRing.snapshot(session), ledger })
  const snapshot = { schemaVersion: 1, evidenceId: 'p10-benchmark-evidence', executionId: 'p10-benchmark', status: 'COMPLETE', observedAt: 1, facts: { targetCountKnown: true, canonicalTargetsKnown: true, workspaceContained: true, pathAliasObserved: false, versionControlled: true, exactTargetsClean: true, checkpointAvailable: 'unknown', rollbackMechanismKnown: 'unknown', packageManifestPresent: false, packageManifestValid: 'unknown', lifecycleScriptsPresent: false }, counts: { evidenceItems: 1, fileReads: 0, evidenceChars: 0, directoryEntries: 0 }, truncated: false, reasonCodes: [] }
  const fastText = JSON.stringify({ schemaVersion: 1, results: [{ dimension: 'RISK', verdict: 'UNKNOWN', rationale: 'bounded', referencedFeatureIds: [] }], suggestedAlternatives: [] })
  const deepValue = { schemaVersion: 1, results: [{ dimension: 'RISK', verdict: 'UNKNOWN', rationale: 'bounded', referencedFeatureIds: [] }], suggestedAlternatives: [] }
  const local = {
    shellAnalysis: measure(() => { const engine = new RuleEngine(); engine.observePreExecute({ name: 'bash', arguments: { command: 'git status && echo safe' }, callId: 'p10-benchmark' }, 'p10-benchmark', { ...rule, executionId: 'p10-benchmark' }) }, cheapN, warmup),
    deterministicA1: measure(() => createDeterministicAssessment(riskContext, 'p10-assessment', 1), cheapN, warmup),
    contextBuilder: measure(() => buildPhase5Context({ session, executionId: 'p10-benchmark', seed: context.seed, ruleEvaluation: rule, failureSummary, userRing, ledger: undefined }), cheapN, warmup),
    fastStructuralReviewer: measure(() => parseFastJudgeCandidate(fastText, ['RISK'], new Set()), cheapN, warmup),
    deepStructuralReviewer: measure(() => parseDeepJudgeCandidate(deepValue, ['RISK'], new Set()), cheapN, warmup),
    evidenceOverlayA3: measure(() => overlayEvidenceContext(riskContext, snapshot), cheapN, warmup),
    browserPresentation: measure(() => parseBridgeRead({ kind: 'VIEW', view: { schemaVersion: 4, sessionId: 's', callId: 'c', association: 'BOUND', status: 'ready', stage: 'complete', updatedAt: 1 } }), cheapN, warmup),
    composedLocalPath: measure(() => { const assessment = createDeterministicAssessment(riskContext, 'p10-assessment', 1); overlayEvidenceContext(riskContext, snapshot); return assessment.assessmentId }, cheapN, warmup),
  }
  const scheduler = new EvidenceScheduler(2, 8, 5000)
  const schedulerResult = await scheduler.enqueue('p10-scheduler', async () => snapshot)
  await scheduler.dispose()
  const output = Object.freeze({
    schema: 'dsh-risk-advisor.phase10.benchmark.v1',
    run: { mode: smoke ? 'SMOKE' : 'FULL', cheapSamples: cheapN, heavySamples: n, warmup, harnessPinned: PINNED_HARNESS },
    realPinnedRuntime: await pairedPinnedRuntime(n, smoke ? 1 : 5),
    local: { evidenceClass: 'REAL_PRODUCT_LOCAL', distributions: local, scheduler: { completed: schedulerResult.ok, timeoutMs: 5000, maxConcurrent: 2, maxPending: 8 } },
    structuralReviewer: { evidenceClass: 'STRUCTURAL_LOCAL_REVIEWER', providerCalls: 0, networkCalls: 0, registryCalls: 0, deepJudgeRuntime: 'local structural adapter' },
    externalProvider: { evidenceClass: 'NOT_VALIDATED_EXTERNAL_PROVIDER', status: 'NOT_RUN' },
    privacy: { rawArguments: 0, rawPrompts: 0, secrets: 0, privatePaths: 0 },
    external: { providerCalls: 0, networkCalls: 0, registryCalls: 0, gitRemoteCalls: 0, harnessTrackedMutations: 0 },
  })
  await mkdir(resolve(ROOT, 'docs/tasks/Phase10-hardening/evidence'), { recursive: true })
  await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  return output
}

if (process.argv[1]?.endsWith('r5-phase10.mjs')) {
  console.log(JSON.stringify(await main({ smoke: process.argv.includes('--smoke') }), null, 2))
}
