import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService, { type ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { installCorrelation } from '../src/index.ts'

describe('T02 pinned Host runtime integration', () => {
  it('observes a real ToolRuntime traversal and post-commit ApprovalService pair', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService)
    const index = installCorrelation(ctx)
    expect(Object.isFrozen(index)).toBe(true)
    expect(Object.keys(index).sort()).toEqual(['lookup', 'snapshotObservations'])
    expect(index).not.toHaveProperty('dispose')
    expect(ctx.get('riskAdvisorCorrelation')).toBe(index)
    const session = ctx.sessions.create()
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    const asked = Promise.withResolvers<void>()
    const decision = Promise.withResolvers<ApprovalOutcome>()
    ctx.on('approval/request', () => {
      asked.resolve()
      return decision.promise
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'r2-approval-probe',
      description: 'local deterministic probe',
      parameters: {},
      async execute(_args, exec) {
        const outcome = await ctx.approval.request({
          agent: exec.agent!,
          toolName: exec.name,
          callId: exec.callId,
          signal: exec.signal,
        })
        return [{ type: 'text' as const, text: outcome }]
      },
    }))

    const pending = ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('r2-live-call'),
      name: 'r2-approval-probe',
      arguments: {},
      agent,
    })
    await asked.promise
    const duringApproval = index.snapshotObservations()
    expect(duringApproval).toHaveLength(1)
    expect(duringApproval[0]).toMatchObject({
      sessionId: session.id,
      toolName: 'r2-approval-probe',
      callId: 'r2-live-call',
      lookup: { status: 'FOUND' },
      closed: false,
      conflict: false,
    })
    expect(Object.isFrozen(duringApproval[0])).toBe(true)
    expect(Object.isFrozen(duringApproval[0]!.lookup)).toBe(true)
    decision.resolve('allowed-once')
    await expect(pending).resolves.toMatchObject({ isError: false })
    expect(index.lookup(session, 'r2-live-call')).toEqual({ status: 'NOT_FOUND', reason: 'NO_ACTIVE_EXECUTION' })
    expect(index.snapshotObservations()[0]).toMatchObject({ decidedOutcome: 'allowed-once', closed: true })
  })

  it('records policy=never without entering approval/request or changing native outcome', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'never' })
    const index = installCorrelation(ctx)
    const session = ctx.sessions.create()
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    let answererCalls = 0
    ctx.on('approval/request', () => {
      answererCalls += 1
      return Promise.resolve('allowed-once' as ApprovalOutcome)
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'r2-policy-never-probe',
      description: 'local policy-never probe',
      parameters: {},
      async execute(_args, exec) {
        const outcome = await ctx.approval.request({
          agent: exec.agent!,
          toolName: exec.name,
          callId: exec.callId,
          signal: exec.signal,
        })
        return [{ type: 'text' as const, text: outcome }]
      },
    }))

    const pending = ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('r2-policy-never-call'),
      name: 'r2-policy-never-probe',
      arguments: {},
      agent,
    })
    await expect(pending).resolves.toMatchObject({ isError: false })
    expect(answererCalls).toBe(0)
    expect(index.snapshotObservations()).toMatchObject([{
      toolName: 'r2-policy-never-probe',
      callId: 'r2-policy-never-call',
      lookup: { status: 'FOUND' },
      decidedOutcome: 'rejected',
      closed: true,
    }])
  })

  it('keeps a short-circuited traversal unobserved and records NOT_FOUND', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    ctx.on('tools/pre-execute', () => Promise.resolve({
      kind: 'deny' as const,
      reason: 'test short circuit',
    }))
    const index = installCorrelation(ctx)
    const session = ctx.sessions.create()
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    ctx.tools.register(defineContentToolFixture({
      name: 'r2-short-circuit-probe',
      description: 'local short-circuit probe',
      parameters: {},
      async execute() {
        throw new Error('short-circuited tool body must not run')
      },
    }))

    await expect(ctx.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('r2-short-circuit-call'),
      name: 'r2-short-circuit-probe',
      arguments: {},
      agent,
    })).resolves.toMatchObject({ isError: true })
    session.append('approval/asked', {
      id: 'short-circuit-approval' as never,
      toolName: 'r2-short-circuit-probe',
      callId: ToolCallId('r2-short-circuit-call'),
    })
    expect(index.snapshotObservations()).toMatchObject([{
      lookup: { status: 'NOT_FOUND', reason: 'NO_ACTIVE_EXECUTION' },
    }])
  })
})
