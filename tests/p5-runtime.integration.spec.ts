import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { LlmAdapter, ToolCallId, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService, { type ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { apply } from '../src/index.ts'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { RuleEngine } from '../src/host/rule-engine.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'

class LocalJudgeAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    const text = JSON.stringify({
      schemaVersion: 1,
      results: [
        { dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'direct goal is bounded', referencedFeatureIds: [] },
        { dimension: 'NECESSITY', verdict: 'LIKELY_NECESSARY', rationale: 'operation semantics match the goal', referencedFeatureIds: [] },
      ],
    })
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

describe('Phase 5 real pinned LLM seam', () => {
  it('publishes deterministic A1 and fails closed when the live ledger is structurally degraded', async () => {
    const ctx = new Context()
    const adapter = new LocalJudgeAdapter()
    await ctx.plugin(LlmRuntime)
    ctx.llm.registerAdapter(['mock'], adapter)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'ask' })
    apply(ctx, { fastJudge: { enabled: true, timeoutMs: 1000, maxConcurrentJudges: 1, maxPendingJudges: 2, reviewer: { provider: 'mock', model: 'judge-model' } } })
    const session = ctx.sessions.create('p5-runtime-session')
    session.append('turn/start', { turn: 1 })
    session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Please read safe.txt' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
    const agent = { session } as unknown as Agent
    const asked = Promise.withResolvers<string>()
    const decision = Promise.withResolvers<ApprovalOutcome>()
    ctx.on('approval/request', request => {
      const id = session.snapshotEvents().find(event => event.type === 'approval/asked')
      if (id?.type === 'approval/asked') asked.resolve(String(id.data.id))
      return decision.promise
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'read',
      description: 'Phase 5 read fixture',
      parameters: { file_path: { type: 'string', required: true } },
      async execute(_args, exec) {
        const outcome = await ctx.approval.request({ agent: exec.agent!, toolName: exec.name, callId: exec.callId, signal: exec.signal })
        return [{ type: 'text' as const, text: outcome }]
      },
    }))
    try {
      const pending = ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('p5-read-call'), name: 'read', arguments: { file_path: 'safe.txt' }, agent })
      const approvalId = await asked.promise
      const first = ctx.get('riskAdvisorAssessments').getForApproval(session, approvalId)
      expect(first.assessment).toBeDefined()
      expect(first.assessment?.assessmentId).toBe(first.assessmentId)
      expect(first.assessment?.provenance.judge.invoked).toBe(false)
      await new Promise(resolve => setTimeout(resolve, 10))
      const latest = ctx.get('riskAdvisorAssessments').getLatestForApproval(session, approvalId)
      expect(first.assessment?.status).toBe('DEGRADED')
      expect(latest?.assessmentId).toBe(first.assessment?.assessmentId)
      expect(adapter.requests).toHaveLength(0)
      expect(session.snapshotEvents().some(event => event.type === 'assistant/message')).toBe(false)
      decision.resolve('allowed-once')
      await expect(pending).resolves.toMatchObject({ isError: false })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('publishes A1 before A2 through real ctx.llm.stream with a bounded healthy ledger seam', async () => {
    const ctx = new Context()
    const adapter = new LocalJudgeAdapter()
    await ctx.plugin(LlmRuntime)
    ctx.llm.registerAdapter(['mock'], adapter)
    await ctx.plugin(SessionStore)
    const session = ctx.sessions.create('p5-direct-runtime-session')
    const index = new ActiveExecutionIndex()
    const foundation = new OperationFoundation()
    const failureChain = new RetryEscalationAnalyzer()
    const rules = new RuleEngine()
    const ledger = {
      snapshot: () => ({ sessionId: String(session.id), health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }),
      phase2: () => ({ sessionId: String(session.id), health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [], ptc: { schemaVersion: 1, sessionId: String(session.id), status: 'NOT_RUN', records: [], truncated: false, issues: [] } }),
    } as unknown as LedgerDiagnostics
    const coordinator = new ApprovalAssessmentCoordinator(foundation.diagnostics, {
      rules: rules.diagnostics,
      failureChain: failureChain.diagnostics,
      ledger,
      fastJudge: { enabled: true, timeoutMs: 1000, maxConcurrentJudges: 1, maxPendingJudges: 2, reviewer: { provider: 'mock', model: 'judge-model' } },
    })
    coordinator.attachJudge(ctx.llm)
    const userEvent = { type: 'user/message', data: createUserMessage({ content: [{ type: 'text', text: 'Please read safe.txt' }], source: { kind: 'user' } }) } as unknown as SessionEvent
    coordinator.observeSessionEvent(session, userEvent, index)
    const exec = {
      callId: ToolCallId('p5-direct-call'),
      name: 'read',
      arguments: { file_path: 'safe.txt' },
      signal: new AbortController().signal,
      token: Symbol('p5-direct-execution'),
      agent: { session } as unknown as Agent,
    } as unknown as ToolExecution
    const executionId = index.observePreExecute(exec)
    foundation.capture(exec, executionId)
    failureChain.observePreExecute(exec, executionId)
    rules.observePreExecute(exec, executionId, executionId === undefined ? undefined : failureChain.diagnostics.get(executionId))
    coordinator.captureReviewerSeed(exec, executionId)
    const approvalEvent = { type: 'approval/asked', data: { id: 'p5-direct-approval', toolName: 'read', callId: ToolCallId('p5-direct-call') } } as unknown as SessionEvent
    expect(coordinator.observeSessionEvent(session, approvalEvent, index)).toBe('RECORDED')
    try {
      const first = coordinator.diagnostics.getForApproval(session, 'p5-direct-approval')
      expect(first.assessment?.provenance.judge.invoked).toBe(false)
      await new Promise(resolve => setTimeout(resolve, 10))
      const latest = coordinator.diagnostics.getLatestForApproval(session, 'p5-direct-approval')
      expect(latest?.supersedesAssessmentId).toBe(first.assessment?.assessmentId)
      expect(latest?.provenance.judge.model).toBe('judge-model')
      expect(adapter.requests).toHaveLength(1)
      expect(adapter.requests[0]?.tools).toBeUndefined()
      expect(adapter.requests[0]?.sessionId).toBeUndefined()
      expect(adapter.requests[0]?.purpose).toBeUndefined()
      expect(adapter.requests[0]?.system).toContain('strict JSON only')
      expect(latest?.alternatives).toHaveLength(0)
    } finally {
      await coordinator.dispose()
      await ctx.fiber.dispose()
    }
  })
})
