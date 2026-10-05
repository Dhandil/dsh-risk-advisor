import { describe, expect, it } from 'vitest'
import { isAbsolute, join, resolve } from 'node:path'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService, { type ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { apply } from '../src/index.ts'

describe('Phase 1A pinned Host runtime integration', () => {
  it('captures the exact real ToolRuntime traversal once and retains only sanitized result metadata', async () => {
    const workspace = resolve('tests', '.fixtures', 'p1a-workspace')
    const reportPath = join(workspace, 'report.txt')
    expect(isAbsolute(workspace)).toBe(true)
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'ask' })
    apply(ctx)

    const session = ctx.sessions.create('p1a-live-session', { meta: { cwd: workspace } })
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    const asked = Promise.withResolvers<void>()
    const decision = Promise.withResolvers<ApprovalOutcome>()
    let approvalRequests = 0
    let disposed = false
    ctx.on('approval/request', () => {
      approvalRequests += 1
      asked.resolve()
      return decision.promise
    })
    ctx.tools.register(defineContentToolFixture({
      name: 'read',
      description: 'Phase 1A read-shaped integration fixture',
      parameters: {
        file_path: { type: 'string', required: true },
        offset: { type: 'integer' },
        limit: { type: 'integer' },
      },
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
      const pending = ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId('p1a-live-call'),
        name: 'read',
        arguments: { file_path: reportPath, offset: 1, limit: 20 },
        agent,
      })
      await asked.promise

      const correlation = ctx.get('riskAdvisorCorrelation')
      const observations = correlation.snapshotObservations()
      expect(observations).toHaveLength(1)
      expect(approvalRequests).toBe(1)
      expect(observations[0]).toMatchObject({
        sessionId: session.id,
        toolName: 'read',
        callId: 'p1a-live-call',
        lookup: { status: 'FOUND' },
        closed: false,
      })
      const lookup = observations[0]!.lookup
      expect(lookup.status).toBe('FOUND')
      if (lookup.status !== 'FOUND') throw new Error('expected exact live execution identity')

      const foundation = ctx.get('riskAdvisorFoundation')
      expect(foundation.get(lookup.executionId)).toMatchObject({
        executionId: lookup.executionId,
        status: 'CAPTURED',
        toolKind: 'filesystem-read',
        boundary: {
          workspaceContained: 'unknown',
          targetScope: 'unknown',
          sandboxActive: 'unknown',
          sandboxCovered: 'unknown',
          rollbackAvailable: 'unknown',
          checkpointAvailable: 'unknown',
        },
      })
      const publicDiagnostic = JSON.stringify(foundation.get(lookup.executionId))
      expect(publicDiagnostic).not.toContain('report.txt')
      expect(publicDiagnostic).not.toContain(reportPath)
      expect(publicDiagnostic).not.toContain(workspace)

      decision.resolve('allowed-once')
      await expect(pending).resolves.toMatchObject({ isError: false })
      expect(correlation.snapshotObservations()[0]).toMatchObject({ decidedOutcome: 'allowed-once', closed: true })
      expect(foundation.get(lookup.executionId).status).toBe('CAPTURED')

      await ctx.fiber.dispose()
      disposed = true
      expect(foundation.get(lookup.executionId).status).toBe('NOT_FOUND')
    } finally {
      // The normal path disposes above; this is only for assertion/fixture failures.
      if (!disposed) await ctx.fiber.dispose()
    }
  })
})
