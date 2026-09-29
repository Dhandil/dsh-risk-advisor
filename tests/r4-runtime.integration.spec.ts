import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { ToolCallId, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { installCorrelation, installLedger } from '../src/index.ts'

describe('T04 R4 pinned Harness integration', () => {
  it('observes real ToolRuntime/ApprovalService events and folds Session snapshot once', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'never' })
    installCorrelation(ctx)
    const ledger = installLedger(ctx)
    try {
      expect(ctx.get('riskAdvisorLedger')).toBe(ledger)
      const session = ctx.sessions.create()
      session.append('turn/start', { turn: 1 })
      session.append('step/start', { turn: 1, step: 1 })
      const callId = ToolCallId('r4-runtime-call')
      session.append('tool/call', {
        turn: 1,
        step: 1,
        callId,
        name: 'r4-runtime-approval-probe',
        arguments: '{"secret":"do-not-export"}',
      })
      const agent = { session } as unknown as Agent
      ctx.tools.register(defineContentToolFixture({
        name: 'r4-runtime-approval-probe',
        description: 'deterministic local R4 probe',
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

      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId,
        name: 'r4-runtime-approval-probe',
        arguments: {},
        agent,
      })
      expect(result).toMatchObject({ isError: false })
      session.append('tool/result', {
        turn: 1,
        step: 1,
        message: createToolResultMessage({ callId, content: result.content, isError: result.isError }),
      }, { surfaceOp: 'append' })
      session.append('step/end', { turn: 1, step: 1 })
      session.append('turn/end', { turn: 1, reason: { kind: 'completed' } })

      const snapshot = ledger.snapshot(session)
      expect(snapshot.sourceComplete).toBe(true)
      expect(snapshot.executions).toHaveLength(2)
      expect(snapshot.executions.find(item => item.occurrence.kind === 'LIVE')).toMatchObject({
        lifecycle: 'SETTLED',
        provenance: 'LIVE_FINAL',
        terminal: { isError: false },
        confirmations: [],
      })
      expect(snapshot.executions.find(item => item.occurrence.kind === 'DURABLE')).toMatchObject({
        lifecycle: 'SETTLED',
        provenance: 'DURABLE_SOURCE',
        terminal: { isError: false },
      })
      expect(snapshot.approvals).toMatchObject([{
        lifecycle: 'DECIDED',
        outcome: 'rejected',
        binding: 'UNBOUND',
      }])
      expect(JSON.stringify(snapshot)).not.toContain('do-not-export')
      expect(JSON.stringify(snapshot)).not.toContain('private')

      const replay = ledger.snapshot(session)
      expect(replay).toEqual(snapshot)
      expect(session.snapshotEvents().filter(event => event.type === 'approval/asked')).toHaveLength(1)
      expect(session.snapshotEvents().filter(event => event.type === 'approval/decided')).toHaveLength(1)
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
