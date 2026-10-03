import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import LlmRuntime, { createUserMessage, LlmAdapter, ToolCallId, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore, { type Session, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService, { type ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { apply } from '../src/index.ts'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { RuleEngine } from '../src/host/rule-engine.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'

class CoexistenceJudgeAdapter extends LlmAdapter {
  readonly releases: Array<() => void> = []
  requests = 0
  failures = 0
  hold = false
  fail = false

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests += 1
    if (this.fail) { this.failures += 1; throw new Error('local Risk Advisor reviewer failure') }
    if (this.hold) await new Promise<void>((resolve, reject) => {
      const onAbort = () => { options.signal?.removeEventListener('abort', onAbort); reject(new Error('local Risk Advisor reviewer aborted')) }
      if (options.signal?.aborted) return onAbort()
      options.signal?.addEventListener('abort', onAbort, { once: true })
      this.releases.push(() => { options.signal?.removeEventListener('abort', onAbort); resolve() })
    })
    const block = options.messages.flatMap(message => message.content).find(item => item.type === 'text')
    const payload = block?.type === 'text' ? JSON.parse(block.text) as { requestedDimensions?: readonly string[] } : {}
    const text = JSON.stringify({ schemaVersion: 1, results: (payload.requestedDimensions ?? []).map(dimension => ({ dimension, verdict: 'UNKNOWN', rationale: 'bounded local coexistence seam', referencedFeatureIds: [] })), suggestedAlternatives: [] })
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }

  releaseAll(): void { while (this.releases.length > 0) this.releases.shift()!() }
}

async function setup(withRiskAdvisor: boolean, mode: 'healthy' | 'timeout' | 'failure' = 'healthy') {
  const ctx = new Context()
  const adapter = mode === 'healthy' ? undefined : new CoexistenceJudgeAdapter()
  if (adapter !== undefined) { adapter.hold = mode === 'timeout'; adapter.fail = mode === 'failure'; await ctx.plugin(LlmRuntime); ctx.llm.registerAdapter(['mock'], adapter) }
  await ctx.plugin(SessionStore); await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime); await ctx.plugin(ApprovalService, { policy: 'ask' })
  const calls: string[] = []
  const decisions = Promise.withResolvers<ApprovalOutcome>()
  const fixture = ctx.plugin({ name: 'p10-native-answerer-fixture', apply(owner) {
    return owner.on('approval/request', () => { calls.push('answerer'); return decisions.promise })
  } })
  await fixture
  const risk = withRiskAdvisor ? ctx.plugin({
    name: 'p10-risk-advisor-under-test',
    inject: ['tools'],
    apply(owner) {
      apply(owner, adapter === undefined ? {} : { fastJudge: { enabled: true, timeoutMs: 10, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: 'mock', model: 'local' } } })
    },
  }) : undefined
  if (risk !== undefined) await risk
  return { ctx, calls, decisions, fixture, risk, adapter }
}

async function executeApproval(ctx: Context, sessionId: string, callId: string, signal = new AbortController().signal, toolName = `p10-coexistence-${sessionId}`) {
  const session = ctx.sessions.create(sessionId)
  session.append('turn/start', { turn: 1 })
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Please read the bounded local file.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  const agent = { session } as unknown as Agent
  ctx.tools.register(defineContentToolFixture({ name: toolName, description: 'bounded fixture', parameters: {}, async execute(_args, exec) {
    const outcome = await ctx.approval.request({ agent: exec.agent!, toolName: exec.name, callId: exec.callId, signal: exec.signal })
    return [{ type: 'text' as const, text: outcome }]
  } }))
  return { session, pending: ctx.tools.execute({ signal, callId: ToolCallId(callId), name: toolName, arguments: { file_path: 'safe.txt' }, agent }) }
}

async function realRiskApproval(mode: 'healthy' | 'timeout' | 'failure') {
  const ctx = new Context()
  const adapter = new CoexistenceJudgeAdapter()
  adapter.hold = mode === 'timeout'; adapter.fail = mode === 'failure'
  await ctx.plugin(LlmRuntime); ctx.llm.registerAdapter(['mock'], adapter)
  await ctx.plugin(SessionStore); await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime); await ctx.plugin(ApprovalService, { policy: 'ask' })
  const session = ctx.sessions.create(`p10-real-${mode}`)
  const index = new ActiveExecutionIndex()
  const foundation = new OperationFoundation()
  const failures = new RetryEscalationAnalyzer()
  const rules = new RuleEngine()
  const ledger = { snapshot: () => ({ sessionId: session.id, health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }) } as unknown as LedgerDiagnostics
  const coordinator = new ApprovalAssessmentCoordinator(foundation.diagnostics, { rules: rules.diagnostics, failureChain: failures.diagnostics, ledger, fastJudge: { enabled: true, timeoutMs: 10, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: 'mock', model: 'local' } } })
  coordinator.attachJudge(ctx.llm)
  ctx.on('session/event', (owner, event) => { index.observeSessionEvent(owner, event); coordinator.observeSessionEvent(owner, event, index) })
  session.append('turn/start', { turn: 1 })
  session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Please read the bounded local file.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
  const calls: string[] = []
  const decisions = Promise.withResolvers<ApprovalOutcome>()
  ctx.on('approval/request', () => { calls.push('answerer'); return decisions.promise })
  ctx.tools.register(defineContentToolFixture({ name: 'read', description: 'bounded fixture', parameters: {}, async execute(_args, exec) {
    const typed = exec as unknown as ToolExecution
    const executionId = index.observePreExecute(typed)
    foundation.capture(typed, executionId); failures.observePreExecute(typed, executionId); rules.observePreExecute(typed, executionId, executionId === undefined ? undefined : failures.diagnostics.get(executionId)); coordinator.captureReviewerSeed(typed, executionId); coordinator.captureDeepJudgeParent(typed, executionId)
    const outcome = await ctx.approval.request({ agent: exec.agent!, toolName: exec.name, callId: exec.callId, signal: exec.signal })
    return [{ type: 'text' as const, text: outcome }]
  } }))
  const pending = ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId(`p10-real-${mode}-call`), name: 'read', arguments: { file_path: 'safe.txt' }, agent: { session } as unknown as Agent })
  return { ctx, adapter, session, index, coordinator, calls, decisions, pending }
}

async function actualPluginApproval(mode: 'timeout' | 'failure') {
  const plugin = await setup(true, mode)
  const run = await executeApproval(plugin.ctx, `p10-real-plugin-${mode}`, `p10-real-plugin-${mode}-call`, new AbortController().signal, 'read')
  const reviewerSeam = await realRiskApproval(mode)
  return { plugin, run, reviewerSeam }
}

describe('Phase 10 native Approval coexistence', () => {
  it('preserves native outcome parity with RA absent and present', async () => {
    const outcomes: boolean[] = []
    for (const withRiskAdvisor of [false, true]) {
      const fixture = await setup(withRiskAdvisor)
      try {
        const run = await executeApproval(fixture.ctx, `parity-${withRiskAdvisor}`, `parity-call-${withRiskAdvisor}`)
        fixture.decisions.resolve('allowed-once')
        const result = await run.pending
        outcomes.push(!result.isError)
        expect(fixture.calls).toHaveLength(1)
        expect(run.session.snapshotEvents().filter(event => event.type === 'approval/asked')).toHaveLength(1)
        if (withRiskAdvisor) expect(fixture.ctx.get('riskAdvisorAssessments')).toBeDefined()
      } finally { await fixture.ctx.fiber.dispose() }
    }
    expect(outcomes).toEqual([true, true])
  })

  async function assertActualPluginCoexistence(mode: 'timeout' | 'failure'): Promise<void> {
    const fixture = await actualPluginApproval(mode)
    try {
      const deadline = Date.now() + 250
      let asked = fixture.run.session.snapshotEvents().find(event => event.type === 'approval/asked')
      while (asked === undefined && Date.now() < deadline) { await new Promise(resolve => setTimeout(resolve, 2)); asked = fixture.run.session.snapshotEvents().find(event => event.type === 'approval/asked') }
      expect(asked?.type).toBe('approval/asked')
      while (fixture.reviewerSeam.adapter.requests === 0 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 2))
      expect(fixture.reviewerSeam.adapter.requests).toBeGreaterThanOrEqual(1)
      const assessments = fixture.plugin.ctx.get('riskAdvisorAssessments', false)
      expect(assessments).toBeDefined()
      if (asked?.type === 'approval/asked' && assessments !== undefined) {
        expect(assessments.getForApproval(fixture.run.session, String(asked.data.id)).status).not.toBe('not-found')
      }
      fixture.plugin.decisions.resolve('allowed-once')
      fixture.reviewerSeam.decisions.resolve('allowed-once')
      const result = await fixture.run.pending
      const seamResult = await fixture.reviewerSeam.pending
      expect(result.isError).toBe(false)
      expect(seamResult.isError).toBe(false)
      expect(fixture.plugin.calls).toEqual(['answerer'])
      expect(fixture.plugin.calls).toHaveLength(1)
      expect(fixture.reviewerSeam.calls).toEqual(['answerer'])
      expect(fixture.reviewerSeam.calls).toHaveLength(1)
      if (mode === 'timeout') fixture.reviewerSeam.adapter.releaseAll()
    } finally {
      await fixture.plugin.risk?.dispose()
      await fixture.plugin.ctx.fiber.dispose()
      await fixture.reviewerSeam.coordinator.dispose()
      await fixture.reviewerSeam.ctx.fiber.dispose()
    }
  }

  it('proves actual Risk Advisor plugin timeout coexistence with native Approval', async () => {
    await assertActualPluginCoexistence('timeout')
  })

  it('proves actual Risk Advisor plugin failure coexistence with native Approval', async () => {
    await assertActualPluginCoexistence('failure')
  })

  it('fences a real duplicate approval observation while native ApprovalService remains single-shot', async () => {
    const fixture = await realRiskApproval('healthy')
    try {
      const deadline = Date.now() + 250
      let asked = fixture.session.snapshotEvents().find(event => event.type === 'approval/asked')
      while (asked === undefined && Date.now() < deadline) { await new Promise(resolve => setTimeout(resolve, 2)); asked = fixture.session.snapshotEvents().find(event => event.type === 'approval/asked') }
      expect(asked?.type).toBe('approval/asked')
      const before = asked?.type === 'approval/asked' ? fixture.coordinator.diagnostics.getForApproval(fixture.session, String(asked.data.id)) : undefined
      if (asked?.type === 'approval/asked') {
        expect(fixture.coordinator.observeSessionEvent(fixture.session, asked as unknown as SessionEvent, fixture.index)).toBe('DUPLICATE')
        expect(fixture.coordinator.observeSessionEvent(fixture.session, asked as unknown as SessionEvent, fixture.index)).toBe('DUPLICATE')
      }
      fixture.decisions.resolve('allowed-once')
      const result = await fixture.pending
      expect(result.isError).toBe(false)
      expect(fixture.calls).toEqual(['answerer'])
      expect(fixture.calls).toHaveLength(1)
      const after = asked?.type === 'approval/asked' ? fixture.coordinator.diagnostics.getForApproval(fixture.session, String(asked.data.id)) : undefined
      expect(after?.assessmentId).toBe(before?.assessmentId)
    } finally { await fixture.coordinator.dispose(); await fixture.ctx.fiber.dispose() }
  })

  it('keeps the native answer authoritative through actual RA fiber dispose-before-answer', async () => {
    const fixture = await setup(true)
    try {
      const run = await executeApproval(fixture.ctx, 'dispose-before-answer', 'dispose-before-answer-call')
      await new Promise(resolve => setTimeout(resolve, 0))
      await fixture.risk?.dispose()
      expect(fixture.ctx.get('riskAdvisorAssessments', false)).toBeUndefined()
      fixture.decisions.resolve('allowed-once')
      const result = await run.pending
      expect(result.isError).toBe(false)
      expect(fixture.calls).toHaveLength(1)
    } finally { await fixture.ctx.fiber.dispose() }
  })

  it('has no Risk Advisor fallback after fixture answerer removal and no duplicate after remount', async () => {
    const fixture = await setup(true)
    try {
      await fixture.fixture.dispose()
      const controller = new AbortController()
      const run = await executeApproval(fixture.ctx, 'removed-answerer', 'removed-answerer-call', controller.signal)
      controller.abort()
      const result = await run.pending
      expect(result.isError).toBe(true)
      expect(fixture.calls).toHaveLength(0)
      const replacement = fixture.ctx.plugin({ name: 'p10-native-answerer-fixture-remount', apply(owner) {
        return owner.on('approval/request', () => { fixture.calls.push('remounted-answerer'); return Promise.resolve('allowed-once') })
      } })
      await replacement
      const remounted = await executeApproval(fixture.ctx, 'remounted-answerer', 'remounted-answerer-call')
      const remountedResult = await remounted.pending
      expect(remountedResult.isError).toBe(false)
      expect(fixture.calls).toEqual(['remounted-answerer'])
      expect(remounted.session.snapshotEvents().filter(event => event.type === 'approval/asked')).toHaveLength(1)
    } finally { await fixture.ctx.fiber.dispose() }
  })
})
