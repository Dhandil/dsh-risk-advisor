import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import LlmRuntime, { createUserMessage, LlmAdapter, ToolCallId, type GenerateOptions, type StreamChunk } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'
import { RISK_ADVISOR_RPC_CHANNEL } from '../src/bridge-contract.ts'

class RpcFixture {
  readonly active = new Map<symbol, { readonly channel: string; readonly handler: unknown }>()
  maxActive = 0

  readonly connection = {
    rpc: {
      handle: (channel: string, handler: unknown): (() => void) => {
        const key = Symbol(channel)
        this.active.set(key, { channel, handler })
        this.maxActive = Math.max(this.maxActive, this.active.size)
        return () => { this.active.delete(key) }
      },
    },
  }

  count(channel: string): number {
    return [...this.active.values()].filter(item => item.channel === channel).length
  }
}

class CycleAdapter extends LlmAdapter {
  requests = 0
  private readonly gate: Promise<void>
  private releaseGate: (() => void) | undefined

  constructor(readonly hold: boolean) {
    super()
    this.gate = new Promise(resolve => { this.releaseGate = resolve })
  }

  override async *stream(_options: GenerateOptions): AsyncIterable<StreamChunk> {
    this.requests += 1
    if (this.hold) await this.gate
    const text = JSON.stringify({ schemaVersion: 1, results: [], suggestedAlternatives: [] })
    yield { type: 'block-start', index: 0, blockType: 'text' }
    yield { type: 'text-delta', index: 0, text }
    yield { type: 'block-end', index: 0, block: { type: 'text', text } }
    yield { type: 'finish', reason: { kind: 'stop' } }
  }

  release(): void { this.releaseGate?.() }
}

let root: Context | undefined

afterEach(async () => {
  await root?.fiber.dispose()
  root = undefined
})

describe('Phase 10 actual Host Risk Advisor fiber HMR', () => {
  it('completes three actual mount-dispose-remount cycles with one bridge handler and fenced diagnostics', async () => {
    root = new Context()
    const ctx = root
    const rpc = new RpcFixture()
    ctx.provide('connection', rpc.connection)
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'ask' })

    let answerCount = 0
    ctx.on('approval/request', () => { answerCount += 1; return Promise.resolve('allowed-once') })
    ctx.tools.register(defineContentToolFixture({
      name: 'read', description: 'bounded local HMR fixture', parameters: {},
      async execute(_args, exec) {
        const outcome = await ctx.approval.request({ agent: exec.agent!, toolName: exec.name, callId: exec.callId, signal: exec.signal })
        return [{ type: 'text' as const, text: outcome }]
      },
    }))

    let previousCorrelation: ReturnType<typeof ctx.get<'riskAdvisorCorrelation'>> | undefined
    let previousAssessments: ReturnType<typeof ctx.get<'riskAdvisorAssessments'>> | undefined
    let previousAdapter: CycleAdapter | undefined
    for (let cycle = 1; cycle <= 3; cycle += 1) {
      const adapter = new CycleAdapter(false)
      ctx.llm.registerAdapter([`p10-hmr-${cycle}`], adapter)
      const fiber = ctx.plugin({
        name: `p10-risk-advisor-host-hmr-${cycle}`,
        inject: ['tools'],
        apply(owner) {
          apply(owner, {
            fastJudge: { enabled: true, timeoutMs: 10, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: `p10-hmr-${cycle}`, model: 'local' } },
          })
        },
      })
      await fiber.await()
      expect(fiber.ctx.get('riskAdvisorAssessments', false)).toBeDefined()
      expect(fiber.ctx.get('riskAdvisorCorrelation', false)).toBeDefined()
      expect(rpc.count(RISK_ADVISOR_RPC_CHANNEL)).toBe(1)
      expect(rpc.maxActive).toBe(1)

      const session = ctx.sessions.create(`p10-host-hmr-${cycle}`)
      session.append('turn/start', { turn: 1 })
      session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Read the bounded local fixture.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId(`p10-host-hmr-call-${cycle}`),
        name: 'read', arguments: { file_path: 'safe.txt' },
        agent: { session } as unknown as Agent,
      })
      expect(result.isError).toBe(false)
      expect(answerCount).toBe(cycle)

      const correlation = fiber.ctx.get('riskAdvisorCorrelation')
      const assessments = fiber.ctx.get('riskAdvisorAssessments')
      expect(correlation.snapshotObservations()).toHaveLength(1)
      expect(assessments.getIssueSummary().orphanDecisions).toBe(0)
      if (previousCorrelation !== undefined) expect(previousCorrelation.snapshotObservations()).toHaveLength(0)
      if (previousAssessments !== undefined) expect(previousAssessments.getIssueSummary().orphanDecisions).toBe(0)
      if (previousAdapter !== undefined) expect(previousAdapter.requests).toBe(0)

      previousCorrelation = correlation
      previousAssessments = assessments
      previousAdapter = adapter
      await fiber.dispose()
      expect(rpc.count(RISK_ADVISOR_RPC_CHANNEL)).toBe(0)
      expect(ctx.get('riskAdvisorAssessments', false)).toBeUndefined()
      expect(previousAssessments.getIssueSummary().orphanDecisions).toBe(0)
    }
    expect(rpc.maxActive).toBe(1)
    expect(rpc.count(RISK_ADVISOR_RPC_CHANNEL)).toBe(0)
    expect(answerCount).toBe(3)
  })

  it('drains held owned work before actual Host Risk Advisor fiber disposal and fences remount', async () => {
    root = new Context()
    const ctx = root
    const rpc = new RpcFixture()
    ctx.provide('connection', rpc.connection)
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionStore)
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(ApprovalService, { policy: 'ask' })
    ctx.on('approval/request', () => Promise.resolve('allowed-once'))
    ctx.tools.register(defineContentToolFixture({
      name: 'read', description: 'held HMR fixture', parameters: {},
      async execute(_args, exec) {
        const outcome = await ctx.approval.request({ agent: exec.agent!, toolName: exec.name, callId: exec.callId, signal: exec.signal })
        return [{ type: 'text' as const, text: outcome }]
      },
    }))

    const held = new CycleAdapter(true)
    ctx.llm.registerAdapter(['p10-held-hmr'], held)
    let releaseOwnedWork: (() => void) | undefined
    const ownedWork = new Promise<void>(resolve => { releaseOwnedWork = resolve })
    const first = ctx.plugin({
      name: 'p10-risk-advisor-held-hmr',
      inject: ['tools'],
      apply(owner) {
        apply(owner, { fastJudge: { enabled: true, timeoutMs: 10, maxConcurrentJudges: 1, maxPendingJudges: 1, reviewer: { provider: 'p10-held-hmr', model: 'local' } } })
        void (async () => {
          for await (const _chunk of held.stream({ messages: [], signal: new AbortController().signal } as GenerateOptions)) {}
        })()
        owner.effect(() => async () => {
          held.release()
          await ownedWork
        }, 'p10-test-held-work-release')
      },
    })
    await first.await()
    expect(held.requests).toBe(1)
    const session = ctx.sessions.create('p10-held-hmr-session')
    session.append('turn/start', { turn: 1 })
    session.append('user/message', createUserMessage({ content: [{ type: 'text', text: 'Read the held local fixture.' }], source: { kind: 'user' } }), { surfaceOp: 'append' })
    const result = await ctx.tools.execute({ signal: new AbortController().signal, callId: ToolCallId('p10-held-hmr-call'), name: 'read', arguments: {}, agent: { session } as unknown as Agent })
    expect(result.isError).toBe(false)
    let disposed = false
    const dispose = first.dispose().then(() => { disposed = true })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(disposed).toBe(false)
    releaseOwnedWork!()
    await dispose
    expect(disposed).toBe(true)
    expect(rpc.count(RISK_ADVISOR_RPC_CHANNEL)).toBe(0)

    const second = ctx.plugin({ name: 'p10-risk-advisor-held-hmr-remount', inject: ['tools'], apply })
    await second.await()
    expect(rpc.count(RISK_ADVISOR_RPC_CHANNEL)).toBe(1)
    await second.dispose()
    expect(rpc.count(RISK_ADVISOR_RPC_CHANNEL)).toBe(0)
  })
})
