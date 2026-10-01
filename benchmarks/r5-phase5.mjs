import { performance } from 'node:perf_hooks'
import { Context } from '@deepseek-ai/cordis'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import { Session } from '@deepseek-ai/dsh-session'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { apply } from '../lib/index.js'
import { SecretRedactor } from '../lib/types/host/redactor.js'
import { DirectUserRing, captureReviewerSeed } from '../lib/types/host/reviewer-seed.js'
import { buildPhase5Context } from '../lib/types/host/context-builder.js'
import { createDeterministicAssessment } from '../lib/types/host/risk-engine.js'
import { JudgeScheduler } from '../lib/types/host/fast-judge.js'

const now = () => performance.now()

function readyInputs() {
  const session = Session.create('r5-phase5-benchmark')
  const turnStart = { type: 'turn/start', data: { turn: 1 } }
  const userMessage = createUserMessage({ content: [{ type: 'text', text: 'read the bounded fixture' }], source: { kind: 'user' } })
  session.append('turn/start', turnStart.data)
  session.append('user/message', userMessage, { surfaceOp: 'append' })
  const evaluation = {
    schemaVersion: 1, rulesetVersion: 'phase4-v1', executionId: 'r5-execution', status: 'READY', operationKind: 'filesystem-read', parserConfidence: 'high', mutating: false, externalEffect: false, networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown', requestedPermission: undefined,
    failureContext: { isRetry: false, retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, degraded: false }, findings: [], reasonCodes: [],
  }
  const exec = { callId: ToolCallId('r5-execution'), name: 'read', arguments: { file_path: 'fixture.txt', content: 'must not retain' }, signal: new AbortController().signal, token: Symbol('r5') , agent: { session } }
  const captured = captureReviewerSeed('r5-execution', exec, evaluation)
  const ring = new DirectUserRing()
  ring.observe(session, turnStart)
  ring.observe(session, { type: 'user/message', data: userMessage })
  const context = buildPhase5Context({ session, executionId: 'r5-execution', seed: captured.seed, ruleEvaluation: evaluation, failureSummary: { executionId: 'r5-execution', status: 'READY', retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: false, truncated: false, recent: [] }, foundation: undefined, userRing: ring, ledger: undefined })
  return { session, evaluation, captured, context }
}

async function localPaths(samples) {
  const redactor = new SecretRedactor()
  const seedMs = [], a1Ms = [], publishMs = [], contextMs = []
  for (let i = 0; i < samples; i += 1) {
    const startContext = now(); const inputs = readyInputs(); contextMs.push(now() - startContext)
    const startSeed = now(); redactor.redact('token=secret https://u:p@example.test/?token=x'); captureReviewerSeed('r5-execution', { callId: ToolCallId(`r5-${i}`), name: 'read', arguments: { file_path: 'fixture.txt' }, signal: new AbortController().signal, token: Symbol('r5'), agent: { session: inputs.session } }, inputs.evaluation); seedMs.push(now() - startSeed)
    const startA1 = now(); const a1 = createDeterministicAssessment(inputs.context.snapshot, `r5-assessment-${i}`, now()); a1Ms.push(now() - startA1)
    const startPublish = now(); Object.freeze({ ...a1 }); publishMs.push(now() - startPublish)
  }
  const scheduler = new JudgeScheduler(2, 4)
  const queueMs = [], executeMs = []
  const jobs = Array.from({ length: Math.max(4, samples) }, (_, index) => {
    const queued = now()
    return scheduler.enqueue(`r5-job-${index}`, async signal => {
      const started = now(); queueMs.push(started - queued)
      await new Promise(resolve => setTimeout(resolve, 0))
      if (signal.aborted) return { ok: false, failure: 'JUDGE_ABORTED' }
      executeMs.push(now() - started)
      return { ok: true }
    })
  })
  const schedulerResults = await Promise.all(jobs)
  await scheduler.dispose()
  return { contextMs, seedMs, a1Ms, publishMs, queueMs, executeMs, schedulerResults, labels: { providerLatency: 'REAL_PROVIDER_NOT_RUN', providerPolicy: 'PRODUCTION_POLICY_UNDETERMINED', evidence: 'LOCAL_MOCK_ONLY' } }
}

async function nativeApproval() {
  const ctx = new Context()
  await ctx.plugin(SessionStore); await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime); await ctx.plugin(ApprovalService, { policy: 'ask' }); apply(ctx)
  let answers = 0
  ctx.on('approval/request', () => { answers += 1; return 'allowed-once' })
  ctx.tools.register(defineContentToolFixture({ name: 'r5-phase5-approval', description: 'local R5 fixture', parameters: {}, async execute(_args, exec) { await ctx.approval.request({ agent: exec.agent, toolName: exec.name, callId: exec.callId, signal: exec.signal }); return [{ type: 'text', text: 'ok' }] } }))
  try {
    const session = ctx.sessions.create('r5-phase5-approval-session'); session.append('turn/start', { turn: 1 })
    const result = await ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('r5-phase5-approval-call'), name: 'r5-phase5-approval', arguments: {}, agent: { session } })
    return { outcome: result.isError ? 'error' : 'allowed-once', answerers: answers, sessionEvents: 'NOT_READ' }
  } finally { await ctx.fiber.dispose() }
}

export async function main({ smoke = true } = {}) {
  const samples = smoke ? 8 : 32
  return Object.freeze({ run: Object.freeze({ benchmark: 'R5_PHASE5_FOLLOW_UP', mode: smoke ? 'SMOKE' : 'FULL', samples, testedAt: new Date().toISOString() }), localPaths: await localPaths(samples), nativeApproval: await nativeApproval(), nonClaims: { realProviderP50P95P99: 'REAL_PROVIDER_NOT_RUN', productionTimeoutConcurrencyPolicy: 'PRODUCTION_POLICY_UNDETERMINED' } })
}
