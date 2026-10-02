import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import LlmRuntime, { createUserMessage, LlmAdapter, ToolCallId, type StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore, { type Session, type SessionEvent } from '@deepseek-ai/dsh-session'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import { OperationFoundation } from '../src/host/operation-foundation.ts'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'
import { RuleEngine } from '../src/host/rule-engine.ts'
import { ApprovalAssessmentCoordinator } from '../src/host/assessment-envelope.ts'
import type { LedgerDiagnostics } from '../src/host/ledger.ts'

class ImmediateJudgeAdapter extends LlmAdapter {
  override async *stream(_options: Parameters<LlmAdapter['stream']>[0]): AsyncIterable<StreamChunk> {
    const text = JSON.stringify({
      schemaVersion: 1,
      results: [
        { dimension: 'AUTHORIZATION', verdict: 'EXPLICITLY_AUTHORIZED', rationale: 'bounded local seam', referencedFeatureIds: [] },
        { dimension: 'NECESSITY', verdict: 'LIKELY_NECESSARY', rationale: 'bounded local seam', referencedFeatureIds: [] },
      ],
    })
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }
}

function userEvent(text: string): SessionEvent {
  return { type: 'user/message', data: createUserMessage({ content: [{ type: 'text', text }], source: { kind: 'user' } }) } as unknown as SessionEvent
}

async function flushAsync(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve()
}

describe('Phase 6 real coordinator lifecycle projection', () => {
  it('keeps A1 non-terminal until late LLM attach, then makes complete one-way after A2', async () => {
    const ctx = new Context()
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    const session = ctx.sessions.create('p6-lifecycle-session')
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
      fastJudge: { enabled: true, timeoutMs: 1000, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: 'mock', model: 'judge-model' } },
    })
    coordinator.observeSessionEvent(session, userEvent('Please read safe.txt'), index)
    const exec = {
      callId: ToolCallId('p6-lifecycle-call'),
      name: 'read',
      arguments: { file_path: 'safe.txt' },
      signal: new AbortController().signal,
      token: Symbol('p6-lifecycle'),
      agent: { session } as unknown as Agent,
    } as unknown as ToolExecution
    const executionId = index.observePreExecute(exec)
    foundation.capture(exec, executionId)
    failureChain.observePreExecute(exec, executionId)
    rules.observePreExecute(exec, executionId, executionId === undefined ? undefined : failureChain.diagnostics.get(executionId))
    coordinator.captureReviewerSeed(exec, executionId)
    coordinator.observeSessionEvent(session, { type: 'approval/asked', data: { id: 'p6-lifecycle-approval', toolName: 'read', callId: ToolCallId('p6-lifecycle-call') } } as unknown as SessionEvent, index)

    const beforeAttach = coordinator.queryActivePresentationForCall(session, 'p6-lifecycle-call')
    expect(beforeAttach.kind).toBe('VIEW')
    if (beforeAttach.kind !== 'VIEW') throw new Error('expected bound Phase 6 view')
    expect(beforeAttach.view.status).toBe('ready')
    expect(beforeAttach.view.stage).toBe('fast')
    expect(beforeAttach.view.assessment?.supersedesAssessmentId).toBeUndefined()

    const adapter = new ImmediateJudgeAdapter()
    ctx.llm.registerAdapter(['mock'], adapter)
    coordinator.attachJudge(ctx.llm)
    await new Promise(resolve => setTimeout(resolve, 25))
    await flushAsync()
    const afterAttach = coordinator.queryActivePresentationForCall(session, 'p6-lifecycle-call')
    expect(afterAttach.kind).toBe('VIEW')
    if (afterAttach.kind !== 'VIEW') throw new Error('expected A2 view')
    expect(afterAttach.view.status).toBe('ready')
    expect(afterAttach.view.stage).toBe('complete')
    expect(afterAttach.view.assessment?.supersedesAssessmentId).toBeDefined()
    expect(afterAttach.view.assessment?.judgeAssisted).toBe(true)
    const a2Id = afterAttach.view.assessmentId

    await coordinator.detachJudge()
    coordinator.attachJudge(ctx.llm)
    await flushAsync()
    const afterReattach = coordinator.queryActivePresentationForCall(session, 'p6-lifecycle-call')
    expect(afterReattach.kind).toBe('VIEW')
    if (afterReattach.kind !== 'VIEW') throw new Error('expected terminal view')
    expect(afterReattach.view.stage).toBe('complete')
    expect(afterReattach.view.assessmentId).toBe(a2Id)

    await coordinator.dispose()
    await ctx.fiber.dispose()
  })
})
