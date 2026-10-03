import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService, { type ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { apply } from '../src/index.ts'

async function setup(withRiskAdvisor: boolean) {
  const ctx = new Context()
  await ctx.plugin(SessionStore); await ctx.plugin(SystemPrompt); await ctx.plugin(ToolRuntime); await ctx.plugin(ApprovalService, { policy: 'ask' })
  const calls: string[] = []
  const decisions = Promise.withResolvers<ApprovalOutcome>()
  const fixture = ctx.plugin({ name: 'p10-native-answerer-fixture', apply(owner) {
    return owner.on('approval/request', () => { calls.push('answerer'); return decisions.promise })
  } })
  await fixture
  const risk = withRiskAdvisor ? ctx.plugin({ name: 'p10-risk-advisor-fixture', inject: ['tools'], apply(owner) { apply(owner) } }) : undefined
  if (risk !== undefined) await risk
  return { ctx, calls, decisions, fixture, risk }
}

async function executeApproval(ctx: Context, sessionId: string, callId: string, signal = new AbortController().signal) {
  const session = ctx.sessions.create(sessionId)
  session.append('turn/start', { turn: 1 })
  const agent = { session } as unknown as Agent
  ctx.tools.register(defineContentToolFixture({ name: `p10-coexistence-${sessionId}`, description: 'bounded fixture', parameters: {}, async execute(_args, exec) {
    const outcome = await ctx.approval.request({ agent: exec.agent!, toolName: exec.name, callId: exec.callId, signal: exec.signal })
    return [{ type: 'text' as const, text: outcome }]
  } }))
  return { session, pending: ctx.tools.execute({ signal, callId: ToolCallId(callId), name: `p10-coexistence-${sessionId}`, arguments: {}, agent }) }
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

  it('keeps exactly one fixture answerer through observer faults, side-path timeout, and duplicate observation', async () => {
    const fixture = await setup(true)
    try {
      const sidePath = Promise.reject(new Error('synthetic observer side-path failure')).catch(() => 'fenced')
      const run = await executeApproval(fixture.ctx, 'fault-parity', 'fault-parity-call')
      await sidePath
      fixture.decisions.resolve('allowed-once')
      const result = await run.pending
      expect(result.isError).toBe(false)
      expect(fixture.calls).toEqual(['answerer'])
      expect(run.session.snapshotEvents().filter(event => event.type === 'approval/asked')).toHaveLength(1)
      expect(fixture.calls).toHaveLength(1)
    } finally { await fixture.ctx.fiber.dispose() }
  })

  it('keeps the native answer authoritative when RA is disposed before answer', async () => {
    const fixture = await setup(true)
    try {
      const run = await executeApproval(fixture.ctx, 'dispose-before-answer', 'dispose-before-answer-call')
      await new Promise(resolve => setTimeout(resolve, 0))
      await fixture.risk?.dispose()
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
