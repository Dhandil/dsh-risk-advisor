import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { apply } from '../src/index.ts'

describe('Phase 4 pinned Host runtime integration', () => {
  it('uses the existing ExecutionId path, leaves harmless tool execution and Native Approval available', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'never' })
    apply(ctx)

    const session = ctx.sessions.create('p4-live-session')
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    const executionIds = new Map<string, string>()
    const approvalRequests: unknown[] = []
    let calls = 0
    ctx.on('tools/pre-execute', (exec, next) => {
      const lookup = ctx.get('riskAdvisorCorrelation').lookup(exec.agent?.session, exec.callId)
      if (lookup.status === 'FOUND') executionIds.set(String(exec.callId), lookup.executionId)
      return next()
    })
    ctx.on('approval/request', request => { approvalRequests.push(request) })
    ctx.tools.register(defineContentToolFixture({
      name: 'read',
      description: 'Phase 4 harmless local read fixture',
      parameters: { file_path: { type: 'string', required: true } },
      async execute() {
        calls += 1
        return [{ type: 'text' as const, text: 'ok' }]
      },
    }))
    ctx.tools.register(defineContentToolFixture({
      name: 'p4-unknown-fixture',
      description: 'Phase 4 unknown-tool fixture',
      parameters: { value: { type: 'string', required: true } },
      async execute() {
        return [{ type: 'text' as const, text: 'ok' }]
      },
    }))

    try {
      const firstCall = ToolCallId('p4-live-read')
      const first = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: firstCall,
        name: 'read',
        arguments: { file_path: 'safe.txt' },
        agent,
      })
      const secondCall = ToolCallId('p4-live-unknown')
      const second = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: secondCall,
        name: 'p4-unknown-fixture',
        arguments: { value: 'safe' },
        agent,
      })
      expect(first.isError).toBe(false)
      expect(second.isError).toBe(false)
      expect(calls).toBe(1)
      const firstId = executionIds.get(firstCall)
      const secondId = executionIds.get(secondCall)
      expect(firstId).toBeDefined()
      expect(secondId).toBeDefined()
      const diagnostics = ctx.get('riskAdvisorRules')
      expect(diagnostics.get(firstId!)).toMatchObject({
        executionId: firstId,
        status: 'READY',
        operationKind: 'filesystem-read',
      })
      expect(diagnostics.get(secondId!)).toMatchObject({
        executionId: secondId,
        status: 'UNSUPPORTED',
        operationKind: 'unknown',
      })
      expect(approvalRequests).toHaveLength(0)
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('keeps the generation inert after disposal and never creates a second listener path', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    apply(ctx)
    const diagnostics = ctx.get('riskAdvisorRules')
    const captured = diagnostics.get('not-created')
    expect(captured.status).toBe('NOT_FOUND')
    await ctx.fiber.dispose()
    expect(diagnostics.get('not-created').status).toBe('NOT_FOUND')
  })
})

