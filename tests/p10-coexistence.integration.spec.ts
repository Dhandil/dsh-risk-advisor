import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { apply } from '../src/index.ts'

describe('Phase 10 native Approval coexistence', () => {
  it('keeps the pinned ApprovalService answerer authoritative with Risk Advisor mounted', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore); await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime); await ctx.plugin(ApprovalService, { policy: 'ask' }); apply(ctx)
    const session = ctx.sessions.create('p10-coexistence')
    session.append('turn/start', { turn: 1 })
    let answererCalls = 0
    const decision = Promise.withResolvers<'allowed-once'>()
    ctx.on('approval/request', () => { answererCalls += 1; return decision.promise })
    ctx.tools.register(defineContentToolFixture({ name: 'p10-coexistence-tool', description: 'bounded fixture', parameters: {}, async execute(_args, exec) {
      const outcome = await ctx.approval.request({ agent: exec.agent!, toolName: exec.name, callId: exec.callId, signal: exec.signal })
      return [{ type: 'text' as const, text: outcome }]
    } }))
    try {
      const pending = ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('p10-coexistence-call'), name: 'p10-coexistence-tool', arguments: {}, agent: { session } as unknown as Agent })
      await new Promise(resolve => setTimeout(resolve, 0))
      decision.resolve('allowed-once')
      const result = await pending
      expect(result.isError).toBe(false)
      expect(answererCalls).toBe(1)
      expect(session.snapshotEvents().filter(event => event.type === 'approval/asked')).toHaveLength(1)
      expect(ctx.get('riskAdvisorAssessments')).toBeDefined()
    } finally { await ctx.fiber.dispose() }
  })
})
