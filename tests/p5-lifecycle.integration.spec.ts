import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { createUserMessage, LlmAdapter, ToolCallId, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore, { type Session, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { RuleEngine } from '../src/host/rule-engine.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'

class ControlledJudgeAdapter extends LlmAdapter {
  readonly requests: GenerateOptions[] = []
  readonly releases: Array<() => void> = []
  aborts = 0
  hold = true

  override async *stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests.push(options)
    if (this.hold) {
      await new Promise<void>((resolve, reject) => {
        let settled = false
        const cleanup = () => options.signal?.removeEventListener('abort', onAbort)
        const onAbort = () => {
          if (settled) return
          settled = true
          this.aborts += 1
          cleanup()
          reject(new Error('controlled judge aborted'))
        }
        if (options.signal?.aborted) return onAbort()
        options.signal?.addEventListener('abort', onAbort, { once: true })
        this.releases.push(() => {
          if (settled) return
          settled = true
          cleanup()
          resolve()
        })
      })
    }
    if (options.signal?.aborted) throw new Error('controlled judge aborted')
    const textBlock = options.messages.flatMap(message => message.content).find(block => block.type === 'text')
    const data = textBlock?.type === 'text' ? JSON.parse(textBlock.text) as { requestedDimensions?: readonly string[] } : {}
    const results = (data.requestedDimensions ?? []).map(dimension => ({
      dimension,
      verdict: dimension === 'RISK' ? 'LOW' : dimension === 'AUTHORIZATION' ? 'EXPLICITLY_AUTHORIZED' : dimension === 'NECESSITY' ? 'LIKELY_NECESSARY' : 'PROPORTIONATE',
      rationale: 'controlled local seam',
      referencedFeatureIds: [],
    }))
    const text = JSON.stringify({ schemaVersion: 1, results })
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }

  releaseAll(): void {
    this.hold = false
    while (this.releases.length > 0) this.releases.shift()!()
  }

  async waitForRequests(count: number): Promise<void> {
    const deadline = Date.now() + 1000
    while (this.requests.length < count && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 1))
    expect(this.requests.length).toBeGreaterThanOrEqual(count)
  }
}

interface LifecycleHarness {
  readonly ctx: Context
  readonly adapter: ControlledJudgeAdapter
  readonly session: Session
  readonly index: ActiveExecutionIndex
  readonly foundation: OperationFoundation
  readonly failureChain: RetryEscalationAnalyzer
  readonly rules: RuleEngine
  readonly coordinator: ApprovalAssessmentCoordinator
}

async function createHarness(id: string, timeoutMs = 1000): Promise<LifecycleHarness> {
  const ctx = new Context()
  const adapter = new ControlledJudgeAdapter()
  await ctx.plugin(LlmRuntime)
  ctx.llm.registerAdapter(['mock'], adapter)
  await ctx.plugin(SessionStore)
  const session = ctx.sessions.create(id)
  const index = new ActiveExecutionIndex()
  const foundation = new OperationFoundation()
  const failureChain = new RetryEscalationAnalyzer()
  const rules = new RuleEngine()
  const ledger = {
    snapshot: () => ({ sessionId: String(session.id), health: 'HEALTHY', sourceWatermark: 0, sourceComplete: true, truncated: false, issues: [], executions: [], approvals: [] }),
  } as unknown as LedgerDiagnostics
  const coordinator = new ApprovalAssessmentCoordinator(foundation.diagnostics, {
    rules: rules.diagnostics,
    failureChain: failureChain.diagnostics,
    ledger,
    fastJudge: { enabled: true, timeoutMs, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: 'mock', model: 'judge-model' } },
  })
  coordinator.attachJudge(ctx.llm)
  coordinator.observeSessionEvent(session, userEvent('Please read safe.txt'), index)
  return { ctx, adapter, session, index, foundation, failureChain, rules, coordinator }
}

function userEvent(text: string): SessionEvent {
  return { type: 'user/message', data: createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }) } as unknown as SessionEvent
}

function prepareApproval(harness: LifecycleHarness, approvalId: string, callIdValue = `${approvalId}-call`): void {
  const callId = ToolCallId(callIdValue)
  const exec = {
    callId,
    name: 'read',
    arguments: { file_path: 'safe.txt' },
    signal: new AbortController().signal,
    token: Symbol(callIdValue),
    agent: { session: harness.session } as unknown as Agent,
  } as unknown as ToolExecution
  const executionId = harness.index.observePreExecute(exec)
  harness.foundation.capture(exec, executionId)
  harness.failureChain.observePreExecute(exec, executionId)
  harness.rules.observePreExecute(exec, executionId, executionId === undefined ? undefined : harness.failureChain.diagnostics.get(executionId))
  harness.coordinator.captureReviewerSeed(exec, executionId)
  const asked = { type: 'approval/asked', data: { id: approvalId, toolName: 'read', callId } } as unknown as SessionEvent
  expect(harness.coordinator.observeSessionEvent(harness.session, asked, harness.index)).toBe('RECORDED')
}

async function cleanup(harness: LifecycleHarness): Promise<void> {
  await harness.coordinator.dispose()
  await harness.ctx.fiber.dispose()
}

describe('Phase 5 lifecycle and async repair seam', () => {
  it('fences late Judge results after native decision and duplicate asked events', async () => {
    const harness = await createHarness('p5-lifecycle-decision')
    try {
      prepareApproval(harness, 'approval-decision')
      expect(harness.coordinator.observeSessionEvent(harness.session, { type: 'approval/asked', data: { id: 'approval-decision', toolName: 'read', callId: ToolCallId('approval-decision-call') } } as unknown as SessionEvent, harness.index)).toBe('DUPLICATE')
      await harness.adapter.waitForRequests(1)
      const first = harness.coordinator.diagnostics.getLatestForApproval(harness.session, 'approval-decision')!
      expect(first.provenance.judge.invoked).toBe(false)
      expect(harness.coordinator.observeSessionEvent(harness.session, { type: 'approval/decided', data: { id: 'approval-decision', outcome: 'allowed-once' } } as unknown as SessionEvent, harness.index)).toBe('DECIDED')
      harness.adapter.releaseAll()
      await new Promise(resolve => setTimeout(resolve, 20))
      const latest = harness.coordinator.diagnostics.getLatestForApproval(harness.session, 'approval-decision')
      expect(latest?.assessmentId).toBe(first.assessmentId)
      expect(latest?.supersedesAssessmentId).toBeUndefined()
    } finally {
      await cleanup(harness)
    }
  })

  it('times out a held stream, aborts it, and never publishes a late A2', async () => {
    const harness = await createHarness('p5-lifecycle-timeout', 10)
    try {
      prepareApproval(harness, 'approval-timeout')
      await harness.adapter.waitForRequests(1)
      await new Promise(resolve => setTimeout(resolve, 40))
      const latest = harness.coordinator.diagnostics.getLatestForApproval(harness.session, 'approval-timeout')!
      const diagnostic = harness.coordinator.diagnostics.getForApproval(harness.session, 'approval-timeout')
      expect(latest.supersedesAssessmentId).toBeUndefined()
      expect(diagnostic.reasonCodes).toContain('JUDGE_TIMEOUT')
      expect(harness.adapter.aborts).toBeGreaterThan(0)
    } finally {
      await cleanup(harness)
    }
  })

  it('keeps concurrent session identities isolated and publishes one superseding A2 per approval', async () => {
    const first = await createHarness('p5-lifecycle-first')
    const second = await createHarness('p5-lifecycle-second')
    try {
      // Each coordinator owns its own scheduler and ring; identical approval ids cannot cross sessions.
      prepareApproval(first, 'same-approval')
      prepareApproval(second, 'same-approval')
      first.adapter.releaseAll()
      second.adapter.releaseAll()
      await new Promise(resolve => setTimeout(resolve, 20))
      const firstLatest = first.coordinator.diagnostics.getLatestForApproval(first.session, 'same-approval')!
      const secondLatest = second.coordinator.diagnostics.getLatestForApproval(second.session, 'same-approval')!
      expect(firstLatest.supersedesAssessmentId).toBeDefined()
      expect(secondLatest.supersedesAssessmentId).toBeDefined()
      expect(firstLatest.assessmentId).not.toBe(secondLatest.assessmentId)
    } finally {
      await cleanup(first)
      await cleanup(second)
    }
  })

  it('fences active work on session disposal and LLM detach/HMR disposal', async () => {
    const harness = await createHarness('p5-lifecycle-dispose')
    prepareApproval(harness, 'approval-dispose')
    await harness.adapter.waitForRequests(1)
    harness.coordinator.observeSessionDisposed(harness.session)
    await harness.coordinator.detachJudge()
    harness.adapter.releaseAll()
    await new Promise(resolve => setTimeout(resolve, 20))
    expect(harness.coordinator.diagnostics.getForApproval(harness.session, 'approval-dispose').status).toBe('not-found')
    expect(harness.adapter.aborts).toBeGreaterThan(0)
    await cleanup(harness)
  })
})
