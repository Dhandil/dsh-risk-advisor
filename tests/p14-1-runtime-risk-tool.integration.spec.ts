import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { performance } from 'node:perf_hooks'
import { afterEach, describe, expect, it } from 'vitest'
import { apply } from '../src/index.ts'
import { RISK_ADVISOR_RUNTIME_RISK_ROUTE, parseRuntimeRiskAwarenessRead } from '../src/bridge-contract.ts'
import type { HostConnectionLike, ConnectionRpcResultLike } from '../src/host/browser-bridge.ts'

class LocalConnection {
  private readonly routes = new Map<string, { readonly fetch: (request: Request) => Promise<Response> }>()
  private rpcId = 0
  registrations = 0
  disposals = 0
  readonly connection: HostConnectionLike = {
    fetch: {
      register: route => {
        if (this.routes.has(route.path)) throw new Error(`duplicate route ${route.path}`)
        this.routes.set(route.path, route)
        this.registrations += 1
        return async () => { this.routes.delete(route.path); this.disposals += 1 }
      },
    },
  }

  async dispatchRuntimeRisk(sessionId: string): Promise<unknown> {
    const route = this.routes.get(RISK_ADVISOR_RUNTIME_RISK_ROUTE)
    if (route === undefined) throw new Error('runtime-risk route is not registered')
    const response = await route.fetch(new Request(`http://dsh.internal${RISK_ADVISOR_RUNTIME_RISK_ROUTE}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type: 'client-request', rpcId: `p14-rpc-${++this.rpcId}`, method: 'risk-advisor/runtime-risk', payload: { sessionId } }),
    }))
    const body = await response.json() as { readonly result: ConnectionRpcResultLike }
    return body.result.ok ? body.result.value : body.result
  }
}

let context: Context | undefined
afterEach(async () => { await context?.fiber.dispose(); context = undefined })

describe('Phase 14.1 ordinary Harness Tool execution', () => {
  it('passes the exact downstream pre-execute promise once and stays inside the capture latency budget', async () => {
    context = new Context()
    await context.plugin(SessionStore)
    await context.plugin(SystemPrompt)
    await context.plugin(ToolRuntime)
    apply(context)
    const session = context.sessions.create('p14-hook-passthrough-session')
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    const input = { file_path: '/tmp/p14-runtime-risk-safe-fixture.txt', content: 'bounded local fixture input' }
    const samples: number[] = []
    let downstreamCalls = 0

    for (let index = 0; index < 160; index += 1) {
      const exec = {
        callId: ToolCallId(`p14-hook-call-${index}`),
        rootCallId: ToolCallId(`p14-hook-call-${index}`),
        name: 'write',
        arguments: input,
        agent,
        signal: new AbortController().signal,
        token: Symbol(`p14-hook-${index}`),
      } as unknown as ToolExecution
      const downstream = Promise.resolve(Object.freeze({ kind: 'allow' as const }))
      const startedAt = performance.now()
      const observers = context.events.dispatch('waterfall', [context, 'tools/pre-execute', exec])
      const observer = observers.at(-1)
      expect(observer).toBeDefined()
      const returned = observer!(exec, () => {
        downstreamCalls += 1
        return downstream
      })
      samples.push(performance.now() - startedAt)
      expect(returned).toBe(downstream)
      await returned
    }

    const percentile = (fraction: number) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * fraction) - 1] ?? Infinity
    expect(downstreamCalls).toBe(160)
    expect(percentile(0.95)).toBeLessThanOrEqual(1)
    expect(percentile(0.99)).toBeLessThanOrEqual(2)
    await context.fiber.dispose()
    context = undefined
  })

  it('keeps Tool dispatch/result intact while publishing one pre-execution-only row', async () => {
    context = new Context()
    const connection = new LocalConnection()
    context.provide('connection', connection.connection)
    await context.plugin(SessionStore)
    await context.plugin(SystemPrompt)
    await context.plugin(ToolRuntime)
    apply(context)
    const session = context.sessions.create('p14-ordinary-tool-session')
    session.append('turn/start', { turn: 1 })
    const agent = { session } as unknown as Agent
    const bodyObservations: unknown[] = []
    const input = { file_path: '/tmp/p14-runtime-risk-safe-fixture.txt', content: 'tool-input-private-sentinel' }
    context.tools.register(defineContentToolFixture({
      name: 'write',
      description: 'Phase 14 deterministic local Tool fixture',
      parameters: {
        file_path: { type: 'string', required: true },
        content: { type: 'string', required: true },
      },
      async execute(args) {
        bodyObservations.push(args)
        const duringDispatch = parseRuntimeRiskAwarenessRead(await connection.dispatchRuntimeRisk(session.id))
        expect(duringDispatch).toMatchObject({ kind: 'VIEW', sessionId: session.id, callId: 'p14-ordinary-tool-call', timing: 'PRE_EXECUTION_EVIDENCE', stage: 'CAPTURED' })
        return [{ type: 'text' as const, text: `written:${args.file_path}` }]
      },
    }))

    const result = await context.tools.execute({
      signal: new AbortController().signal,
      callId: ToolCallId('p14-ordinary-tool-call'),
      name: 'write',
      arguments: input,
      agent,
    })
    expect(result.isError).toBe(false)
    expect(result.content).toEqual([{ type: 'text', text: `written:${input.file_path}` }])
    expect(bodyObservations).toHaveLength(1)
    expect(bodyObservations[0]).toMatchObject(input)

    await new Promise<void>(resolve => setImmediate(resolve))
    const afterResult = parseRuntimeRiskAwarenessRead(await connection.dispatchRuntimeRisk(session.id))
    expect(afterResult).toMatchObject({ kind: 'VIEW', sessionId: session.id, callId: 'p14-ordinary-tool-call', timing: 'PRE_EXECUTION_EVIDENCE', stage: 'COMPLETE' })
    expect(JSON.stringify(afterResult)).not.toContain('tool-input-private-sentinel')
    expect(JSON.stringify(afterResult)).not.toContain(input.file_path)
    expect(connection.registrations).toBe(6)
    await context.fiber.dispose()
    expect(connection.disposals).toBe(6)
    context = undefined
  })
})
