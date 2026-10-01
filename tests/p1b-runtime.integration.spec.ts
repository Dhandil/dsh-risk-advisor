import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService, { type ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { apply } from '../src/index.ts'

async function setup(policy: 'ask' | 'never' = 'ask') {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService, { policy })
  apply(ctx)
  const session = ctx.sessions.create(`p1b-runtime-${policy}`)
  session.append('turn/start', { turn: 1 })
  return { ctx, session, agent: { session } as unknown as Agent }
}

describe('Phase 1B pinned Host runtime integration', () => {
  it('P1B-01 uses genuine ApprovalService audit events and preserves one native answerer', async () => {
    const { ctx, session, agent } = await setup()
    const asked = Promise.withResolvers<void>()
    const decision = Promise.withResolvers<ApprovalOutcome>()
    let answererCalls = 0
    ctx.on('approval/request', () => {
      answererCalls += 1
      asked.resolve()
      return decision.promise
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'p1b-approval-probe',
      description: 'Phase 1B harmless local approval fixture',
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

    let disposed = false
    try {
      const pending = ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId('p1b-live-call'),
        name: 'p1b-approval-probe',
        arguments: {},
        agent,
      })
      await asked.promise

      const askedEvents = session.snapshotEvents().filter(event => event.type === 'approval/asked')
      expect(askedEvents).toHaveLength(1)
      const approvalId = askedEvents[0]!.data.id as string
      const correlation = ctx.get('riskAdvisorCorrelation').snapshotObservations()
      expect(correlation).toHaveLength(1)
      expect(correlation[0]!.lookup.status).toBe('FOUND')
      if (correlation[0]!.lookup.status !== 'FOUND') throw new Error('expected exact live execution')

      const assessment = ctx.get('riskAdvisorAssessments').getForApproval(session, approvalId)
      expect(assessment).toMatchObject({
        association: 'BOUND',
        status: 'unavailable',
        stage: 'not-started',
        executionId: correlation[0]!.lookup.executionId,
        closed: false,
      })
      expect(assessment.reasonCodes).not.toContain('ASSESSOR_NOT_IMPLEMENTED')
      expect(assessment.assessment).toBeDefined()
      expect(assessment.assessmentId).toMatch(/^ra-assessment-[0-9a-f-]{36}$/)
      expect(answererCalls).toBe(1)
      const assessments = ctx.get('riskAdvisorAssessments')

      session.append('approval/asked', {
        id: approvalId as never,
        toolName: 'p1b-conflicting-tool',
        callId: ToolCallId('p1b-conflicting-call'),
      })
      const conflicted = assessments.getForApproval(session, approvalId)
      expect(conflicted).toMatchObject({ association: 'UNBOUND', status: 'unavailable', closed: false })
      expect(conflicted).not.toHaveProperty('executionId')
      expect(conflicted).not.toHaveProperty('assessmentId')
      expect(conflicted.reasonCodes).toContain('CORRELATION_CONFLICT')
      expect(answererCalls).toBe(1)

      decision.resolve('allowed-once')
      await expect(pending).resolves.toMatchObject({ isError: false })
      expect(assessments.getForApproval(session, approvalId)).toMatchObject({
        closed: true,
        observedOutcome: 'allowed-once',
        status: 'unavailable',
      })
      await ctx.fiber.dispose()
      disposed = true
      expect(assessments.getForApproval(session, approvalId).status).toBe('not-found')
    } finally {
      if (!disposed) await ctx.fiber.dispose()
    }
  })

  it('P1B-06/P1B-11 policy=never does not enter approval/request and records native rejection', async () => {
    const { ctx, session, agent } = await setup('never')
    let answererCalls = 0
    ctx.on('approval/request', () => {
      answererCalls += 1
      return Promise.resolve('allowed-once' as ApprovalOutcome)
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'p1b-policy-never-probe',
      description: 'Phase 1B policy-never fixture',
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

    try {
      await expect(ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId('p1b-policy-never-call'),
        name: 'p1b-policy-never-probe',
        arguments: {},
        agent,
      })).resolves.toMatchObject({ isError: false })
      const askedEvents = session.snapshotEvents().filter(event => event.type === 'approval/asked')
      expect(askedEvents).toHaveLength(1)
      const approvalId = askedEvents[0]!.data.id as string
      expect(answererCalls).toBe(0)
      expect(ctx.get('riskAdvisorAssessments').getForApproval(session, approvalId)).toMatchObject({
        association: 'BOUND',
        closed: true,
        observedOutcome: 'rejected',
        status: 'unavailable',
      })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('P1B-11 contains a faulting native answerer and records only unavailable observation', async () => {
    const { ctx, session, agent } = await setup('ask')
    let answererCalls = 0
    ctx.on('approval/request', () => {
      answererCalls += 1
      throw new Error('native answerer fixture fault')
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'p1b-answerer-fault-probe',
      description: 'Phase 1B answerer fault fixture',
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

    try {
      await expect(ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId('p1b-answerer-fault-call'),
        name: 'p1b-answerer-fault-probe',
        arguments: {},
        agent,
      })).resolves.toMatchObject({ isError: false })
      const askedEvents = session.snapshotEvents().filter(event => event.type === 'approval/asked')
      expect(askedEvents).toHaveLength(1)
      const approvalId = askedEvents[0]!.data.id as string
      expect(answererCalls).toBe(1)
      expect(ctx.get('riskAdvisorAssessments').getForApproval(session, approvalId)).toMatchObject({
        closed: true,
        observedOutcome: 'unavailable',
        status: 'unavailable',
      })
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
