import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { apply, replayPtcSnapshot } from '../lib/index.js'
import { pairedDelta, roundSamples, summarize } from './r5-stats.mjs'
import { runControlledSimulation } from './r5-sidepath-simulation.mjs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUTPUT_DIR = resolve(ROOT, 'docs/tasks/T05-latency-benchmark/evidence')
const clock = () => performance.now()

function sleep(ms) {
  return new Promise(resolveSleep => setTimeout(resolveSleep, ms))
}

function gitHead() {
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()
}

function summarizeWithWarmup(values, warmup) {
  return Object.freeze({ ...summarize(values), warmup })
}

function measureArray(values, warmup) {
  return { summary: summarizeWithWarmup(values, warmup), samplesMs: roundSamples(values) }
}

async function mountRuntime({ withRa, answererMode = 'allow', observerFault = false } = {}) {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService, { policy: 'ask' })
  if (withRa) apply(ctx)
  const metrics = {
    answererCount: 0,
    answererEntry: undefined,
    requestStart: undefined,
    requestEnd: undefined,
    outcome: undefined,
    outcomes: [],
  }
  ctx.on('approval/request', async () => {
    metrics.answererCount += 1
    metrics.answererEntry = clock()
    if (answererMode === 'slow') await sleep(2)
    if (answererMode === 'failed') throw new Error('benchmark answerer failure')
    return 'allowed-once'
  })
  if (observerFault) {
    ctx.on('session/event', (_session, event) => {
      if (event.type === 'approval/asked') throw new Error('benchmark observer fault')
    })
  }
  ctx.tools.register(defineContentToolFixture({
    name: 'r5-benchmark-tool',
    description: 'bounded local benchmark fixture',
    parameters: {},
    async execute(_args, exec) {
      const start = clock()
      const outcome = await ctx.approval.request({
        agent: exec.agent,
        toolName: exec.name,
        callId: exec.callId,
        signal: exec.signal,
      })
      const end = clock()
      metrics.requestStart = start
      metrics.requestEnd = end
      metrics.outcome = outcome
      metrics.outcomes.push(outcome)
      return [{ type: 'text', text: 'ok' }]
    },
  }))
  return { ctx, metrics }
}

function openToolStep(session, callId, argumentsText = '{"fixture":"bounded"}') {
  session.append('turn/start', { turn: 1 })
  session.append('step/start', { turn: 1, step: 1 })
  session.append('tool/call', {
    turn: 1,
    step: 1,
    callId,
    name: 'r5-benchmark-tool',
    arguments: argumentsText,
  })
}

function appendToolResult(session, callId, result) {
  session.append('tool/result', {
    turn: 1,
    step: 1,
    message: createToolResultMessage({ callId, content: result.content, isError: result.isError }),
  }, { surfaceOp: 'append' })
}

function closeToolStep(session, callId, result) {
  appendToolResult(session, callId, result)
  session.append('step/end', { turn: 1, step: 1 })
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
}

async function runApprovalIteration({ withRa, answererMode = 'allow', observerFault = false } = {}) {
  const { ctx, metrics } = await mountRuntime({ withRa, answererMode, observerFault })
  try {
    const session = ctx.sessions.create()
    const callId = ToolCallId('r5-benchmark-call')
    openToolStep(session, callId)
    const executeStart = clock()
    const result = await ctx.tools.execute({
      signal: new AbortController().signal,
      callId,
      name: 'r5-benchmark-tool',
      arguments: {},
      agent: { session },
    })
    const executeMs = clock() - executeStart
    closeToolStep(session, callId, result)
    if (metrics.requestStart === undefined || metrics.requestEnd === undefined || metrics.answererEntry === undefined) {
      throw new Error('benchmark approval instrumentation did not observe the native answerer path')
    }
    if (metrics.answererCount !== 1) throw new Error(`native answerer count was ${metrics.answererCount}`)
    if (metrics.outcome !== 'allowed-once') throw new Error(`native approval outcome was ${metrics.outcome}`)
    return {
      approvalE2eMs: metrics.requestEnd - metrics.requestStart,
      askedToAnswererMs: metrics.answererEntry - metrics.requestStart,
      answererDecisionMs: metrics.requestEnd - metrics.answererEntry,
      toolExecuteMs: executeMs,
      answererCount: metrics.answererCount,
      outcome: metrics.outcome,
      eventCount: session.snapshotEvents().length,
    }
  } finally {
    await ctx.fiber.dispose()
  }
}

async function runPairedApproval({ n, warmups }) {
  const baseline = []
  const treatment = []
  const baselineAsked = []
  const treatmentAsked = []
  const baselineTool = []
  const treatmentTool = []
  for (let i = 0; i < warmups + n; i += 1) {
    const firstTreatment = i % 2 === 1
    const first = firstTreatment ? { withRa: true } : { withRa: false }
    const second = firstTreatment ? { withRa: false } : { withRa: true }
    const firstResult = await runApprovalIteration(first)
    const secondResult = await runApprovalIteration(second)
    const pair = firstTreatment ? [secondResult, firstResult] : [firstResult, secondResult]
    if (i >= warmups) {
      baseline.push(pair[0].approvalE2eMs)
      treatment.push(pair[1].approvalE2eMs)
      baselineAsked.push(pair[0].askedToAnswererMs)
      treatmentAsked.push(pair[1].askedToAnswererMs)
      baselineTool.push(pair[0].toolExecuteMs)
      treatmentTool.push(pair[1].toolExecuteMs)
    }
  }
  return {
    evidenceLevel: 'REAL_PINNED_RUNTIME',
    scenario: 'native approval ask via real ApprovalService answerer; Browser Native UI not deployed',
    n,
    warmups,
    quantile: 'nearest-rank: ceil(q*n), one-indexed, clamped to one',
    approvalE2eMs: {
      baseline: measureArray(baseline, warmups),
      treatment: measureArray(treatment, warmups),
      delta: measureArray(pairedDelta(baseline, treatment), warmups),
    },
    approvalAskedToAnswererMs: {
      baseline: measureArray(baselineAsked, warmups),
      treatment: measureArray(treatmentAsked, warmups),
      delta: measureArray(pairedDelta(baselineAsked, treatmentAsked), warmups),
    },
    toolExecuteMs: {
      baseline: measureArray(baselineTool, warmups),
      treatment: measureArray(treatmentTool, warmups),
      delta: measureArray(pairedDelta(baselineTool, treatmentTool), warmups),
    },
    parity: { expectedOutcome: 'allowed-once', expectedAnswerersPerIteration: 1 },
    T_sync: {
      method: 'MEASURED_DELTA_ESTIMATE',
      status: 'PARTIAL_NOT_DIRECTLY_ISOLATABLE',
      basis: 'paired treatment minus baseline approval E2E and asked-to-answerer distributions; includes matched service overhead, not a direct hook-only timer',
    },
  }
}

async function runControlCases() {
  const fault = await runApprovalIteration({ withRa: true, observerFault: true })
  const slow = await runApprovalIteration({ withRa: true, answererMode: 'slow' }).catch(error => ({ error: String(error?.message ?? error) }))
  const failed = await runApprovalIteration({ withRa: true, answererMode: 'failed' }).catch(error => ({ error: String(error?.message ?? error) }))
  const { ctx, metrics } = await mountRuntime({ withRa: true })
  let burst
  let nativeDuringSimulation
  try {
    const session = ctx.sessions.create()
    session.append('turn/start', { turn: 1 })
    session.append('step/start', { turn: 1, step: 1 })
    const calls = Array.from({ length: 8 }, (_, index) => ToolCallId(`r5-burst-${index}`))
    for (const callId of calls) session.append('tool/call', { turn: 1, step: 1, callId, name: 'r5-benchmark-tool', arguments: '{"fixture":"burst"}' })
    const promises = calls.map(callId => ctx.tools.execute({
      signal: new AbortController().signal,
      callId,
      name: 'r5-benchmark-tool',
      arguments: {},
      agent: { session },
    }))
    const results = await Promise.all(promises)
    for (const [index, result] of results.entries()) appendToolResult(session, calls[index], result)
    session.append('step/end', { turn: 1, step: 1 })
    session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
    burst = {
      evidenceLevel: 'REAL_PINNED_RUNTIME',
      count: calls.length,
      answererCount: metrics.answererCount,
      outcomes: metrics.outcomes,
      parity: metrics.outcomes.every(outcome => outcome === 'allowed-once'),
      note: 'moderate concurrent ApprovalService requests; session append shape is isolated control data',
    }
    const simulationPromise = runControlledSimulation({ trials: 1, burstSize: 12, concurrency: 2, maxPending: 4, judgeMs: 20, timeoutMs: 3 })
    nativeDuringSimulation = await runApprovalIteration({ withRa: true })
    await simulationPromise
  } finally {
    await ctx.fiber.dispose()
  }
  return {
    observerFault: { outcome: fault.outcome, answererCount: fault.answererCount, parity: fault.outcome === 'allowed-once' && fault.answererCount === 1 },
    slowAnswerer: { evidenceLevel: 'REAL_PINNED_RUNTIME', result: slow },
    failedAnswerer: { evidenceLevel: 'REAL_PINNED_RUNTIME', result: failed },
    burst,
    nativeDuringSaturatedSimulation: {
      evidenceLevel: 'REAL_PINNED_RUNTIME + CONTROLLED_SIMULATION',
      outcome: nativeDuringSimulation?.outcome,
      answererCount: nativeDuringSimulation?.answererCount,
      nativePathCompleted: nativeDuringSimulation?.outcome === 'allowed-once',
    },
  }
}

async function buildHistory(ctx, { steps, argsChars = 24 }) {
  const session = ctx.sessions.create()
  session.append('turn/start', { turn: 1 })
  const args = JSON.stringify({ fixture: 'component', payload: 'x'.repeat(Math.max(0, argsChars)) })
  for (let step = 1; step <= steps; step += 1) {
    const callId = ToolCallId(`r5-component-${step}`)
    session.append('step/start', { turn: 1, step })
    session.append('tool/call', { turn: 1, step, callId, name: 'component-tool', arguments: args })
    session.append('tool/result', {
      turn: 1,
      step,
      message: createToolResultMessage({ callId, content: [{ type: 'text', text: 'x' }], isError: false }),
    }, { surfaceOp: 'append' })
    session.append('step/end', { turn: 1, step })
  }
  session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })
  return session
}

async function runComponentScenario({ name, steps, argsChars, repeats = 12 }) {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService, { policy: 'never' })
  apply(ctx)
  try {
    const session = await buildHistory(ctx, { steps, argsChars })
    const ledger = ctx.get('riskAdvisorLedger')
    const correlation = ctx.get('riskAdvisorCorrelation')
    const events = session.snapshotEvents()
    const ledgerMs = []
    const ptcMs = []
    const lookupMs = []
    let lastSnapshot
    for (let i = 0; i < repeats; i += 1) {
      let start = clock()
      lastSnapshot = ledger.snapshot(session)
      ledgerMs.push(clock() - start)
      start = clock()
      replayPtcSnapshot(String(session.id), events)
      ptcMs.push(clock() - start)
      start = clock()
      for (let j = 0; j < 100; j += 1) correlation.lookup(session, 'r5-component-missing')
      lookupMs.push((clock() - start) / 100)
    }
    if (events.length > 128 && (!lastSnapshot?.truncated || lastSnapshot.health === 'HEALTHY')) {
      throw new Error(`component cap assertion failed for ${name}`)
    }
    return {
      evidenceLevel: 'IMPLEMENTED_COMPONENT',
      scenario: name,
      validSession: true,
      steps,
      sourceEventCount: events.length,
      argumentChars: argsChars,
      repeats,
      ledgerSnapshotMs: measureArray(ledgerMs, 0),
      replayPtcSnapshotMs: measureArray(ptcMs, 0),
      correlationLookupMsPerCall: measureArray(lookupMs, 0),
      finalProjection: {
        health: lastSnapshot.health,
        sourceComplete: lastSnapshot.sourceComplete,
        truncated: lastSnapshot.truncated,
      },
    }
  } finally {
    await ctx.fiber.dispose()
  }
}

function simulationSummary(simulation) {
  const measurements = simulation.measurements
  const values = key => measurements.map(item => item[key]).filter(value => Number.isFinite(value))
  return {
    evidenceLevel: simulation.evidenceLevel,
    config: simulation.config,
    contextBuildMs: measureArray(values('contextBuildMs'), 0),
    deterministicMs: measureArray(values('deterministicMs'), 0),
    judgeQueueWaitMs: measureArray(values('judgeQueueWaitMs'), 0),
    judgeExecuteMs: measureArray(values('judgeExecuteMs'), 0),
    simulatedPublishMs: measureArray(values('simulatedPublishMs'), 0),
    simulatedTtfMs: measureArray(values('simulatedTtfMs'), 0),
    simulatedTtFinalMs: measureArray(values('simulatedTtFinalMs'), 0),
    rejectedByBackpressure: simulation.rejectedByBackpressure,
    timeoutCount: simulation.timeoutCount,
    lateCompletionCount: simulation.lateCompletionCount,
    maxActive: simulation.maxActive,
    maxQueueDepth: simulation.maxQueueDepth,
  }
}

export async function main({ smoke = false } = {}) {
  const n = smoke ? 8 : 300
  const warmups = smoke ? 2 : 20
  const startedAt = new Date().toISOString()
  const real = await runPairedApproval({ n, warmups })
  const components = [
    await runComponentScenario({ name: 'short-valid-session', steps: 2, argsChars: 24 }),
    await runComponentScenario({ name: 'large-argument-fixture', steps: 1, argsChars: 8192 }),
    await runComponentScenario({ name: 'long-valid-session-near-replay-cap', steps: 2400, argsChars: 24, repeats: smoke ? 3 : 12 }),
  ]
  const simulation = await runControlledSimulation({ trials: smoke ? 2 : 20, burstSize: 12, concurrency: 2, maxPending: 4, judgeMs: 8, timeoutMs: 3 })
  const controls = await runControlCases()
  const finishedAt = new Date().toISOString()
  const output = {
    schema: 'dsh-risk-advisor.t05.r5-benchmark.v1',
    evidenceBoundary: {
      real: 'REAL_PINNED_RUNTIME',
      component: 'IMPLEMENTED_COMPONENT',
      simulation: 'CONTROLLED_SIMULATION',
      noProviderNetworkPrivilegedBrowser: true,
      nativeBrowserUi: 'NOT_RUN',
    },
    run: {
      mode: smoke ? 'SMOKE' : 'FULL',
      seed: 'T05-2026-09-29-r5-local-fixture-v1',
      startedAt,
      finishedAt,
      commit: gitHead(),
      requestedMainSamples: n,
      warmups,
      hostExclusivity: 'NOT_AVAILABLE; shared local desktop host, ambient load not controlled',
    },
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuModel: cpus()[0]?.model ?? 'unknown',
      cpuCount: cpus().length,
      harnessPinned: 'ddefc45fbc7f8e46dd73185e68295696d1297887',
      upstreamObservedButNotValidated: '4878cdabd87d4041bdaff61d04c966883b9fd07a',
    },
    realApproval: real,
    implementedComponents: components,
    controlledSimulation: simulationSummary(simulation),
    controls,
    nonClaims: {
      timeToFirstAssessment: 'NOT_MEASURABLE_NOT_IMPLEMENTED',
      timeToFinalAssessment: 'NOT_MEASURABLE_NOT_IMPLEMENTED',
      contextBuilder: 'NOT_MEASURABLE_NOT_IMPLEMENTED',
      deterministicAssessment: 'NOT_MEASURABLE_NOT_IMPLEMENTED',
      judgeQueueAndExecution: 'SIMULATION_ONLY',
      publish: 'NOT_MEASURABLE_NOT_IMPLEMENTED',
      policyValues: 'PROVISIONAL_ONLY; no production timeout or concurrency configuration changed',
    },
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })
  writeFileSync(resolve(OUTPUT_DIR, 'r5-measurements.json'), `${JSON.stringify(output, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify({
    mode: output.run.mode,
    commit: output.run.commit,
    realApproval: output.realApproval.approvalE2eMs,
    components: output.implementedComponents.map(item => ({ scenario: item.scenario, events: item.sourceEventCount, ledger: item.ledgerSnapshotMs.summary })),
    simulation: output.controlledSimulation,
    controls: output.controls,
    artifact: 'docs/tasks/T05-latency-benchmark/evidence/r5-measurements.json',
  }, null, 2))
  return output
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  await main({ smoke: process.argv.includes('--smoke') })
}
