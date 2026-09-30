import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { installCorrelation, installLedger } from '../src/index.ts'

describe('Phase 2 pinned Host integration', () => {
  it('P2-23 observes real ToolRuntime + SessionStore + ApprovalService without taking authority', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'never' })
    installCorrelation(ctx)
    const ledger = installLedger(ctx)
    try {
      const session = ctx.sessions.create()
      session.append('turn/start', { turn: 1 })
      session.append('step/start', { turn: 1, step: 1 })
      const callId = ToolCallId('p2-runtime-call')
      session.append('tool/call', {
        turn: 1,
        step: 1,
        callId,
        name: 'p2-runtime-probe',
        arguments: '{"secret":"do-not-export"}',
      })
      const agent = { session } as unknown as Agent
      ctx.tools.register(defineContentToolFixture({
        name: 'p2-runtime-probe',
        description: 'deterministic local Phase 2 probe',
        parameters: {},
        async execute(_args, exec) {
          const approval = await ctx.approval.request({
            agent: exec.agent!,
            toolName: exec.name,
            callId: exec.callId,
            signal: exec.signal,
          })
          return [{ type: 'text' as const, text: approval }]
        },
      }))

      const before = session.snapshotEvents().length
      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId,
        name: 'p2-runtime-probe',
        arguments: {},
        agent,
      })
      expect(result).toMatchObject({ isError: false })
      session.append('tool/result', {
        turn: 1,
        step: 1,
        message: { role: 'tool', content: [{ type: 'tool-result', toolCallId: callId, content: result.content, isError: result.isError }] },
      }, { surfaceOp: 'append' })
      session.append('step/end', { turn: 1, step: 1 })
      session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

      const projection = ledger.phase2(session)
      expect(session.snapshotEvents().length).toBeGreaterThan(before)
      expect(projection.executions).toHaveLength(2)
      expect(projection.executions.map(item => item.outcome.terminalStatus)).toEqual(['SUCCESS', 'SUCCESS'])
      expect(projection.executions.every(item => item.outcome.semanticSuccess === 'unknown')).toBe(true)
      expect(projection.approvals).toMatchObject([{ outcome: 'rejected', failure: { kind: 'APPROVAL_REJECTED' } }])
      expect(JSON.stringify(projection)).not.toContain('do-not-export')
      expect(JSON.stringify(projection)).not.toContain('private')
      expect(ctx.get('riskAdvisorLedger')).toBe(ledger)
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
