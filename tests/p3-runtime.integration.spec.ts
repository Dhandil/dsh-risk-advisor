import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { apply } from '../src/index.ts'

describe('Phase 3 pinned Host runtime integration', () => {
  it('P3-27 observes exact live IDs through real ToolRuntime and leaves Native Approval authority untouched', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'never' })
    apply(ctx)

    const session = ctx.sessions.create('p3-live-session')
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    const executionIds = new Map<string, string>()
    let calls = 0
    const approvalRequests: unknown[] = []
    ctx.on('tools/pre-execute', (exec, next) => {
      const lookup = ctx.get('riskAdvisorCorrelation').lookup(exec.agent?.session, exec.callId)
      if (lookup.status === 'FOUND') executionIds.set(String(exec.callId), lookup.executionId)
      return next()
    })
    ctx.on('approval/request', request => {
      approvalRequests.push(request)
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'read',
      description: 'Phase 3 deterministic local read fixture',
      parameters: { file_path: { type: 'string', required: true } },
      async execute(_args) {
        calls += 1
        if (calls === 1) throw new Error('private local failure')
        return [{ type: 'text' as const, text: 'ok' }]
      },
    }))

    try {
      const firstCall = ToolCallId('p3-live-first')
      const first = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: firstCall,
        name: 'read',
        arguments: { file_path: 'private.txt' },
        agent,
      })
      const secondCall = ToolCallId('p3-live-second')
      const second = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: secondCall,
        name: 'read',
        arguments: { file_path: 'private.txt' },
        agent,
      })
      expect(first.isError).toBe(true)
      expect(second.isError).toBe(false)
      const firstId = executionIds.get(firstCall)
      const secondId = executionIds.get(secondCall)
      expect(firstId).toBeDefined()
      expect(secondId).toBeDefined()
      const diagnostic = ctx.get('riskAdvisorFailureChain')
      expect(diagnostic.get(secondId!)).toMatchObject({ retryOf: firstId, status: 'READY' })
      expect(JSON.stringify(diagnostic.get(secondId!))).not.toContain('private.txt')
      expect(approvalRequests).toHaveLength(0)
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
