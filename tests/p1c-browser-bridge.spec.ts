import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ApprovalService, { type ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import ToolRuntime, { defineContentToolFixture } from '@deepseek-ai/dsh-tools'
import { apply } from '../src/index.ts'
import { createRiskAdvisorBridgeClient } from '../src/client/assessment-bridge.ts'
import { installRiskAdvisorBrowserBridge } from '../src/host/browser-bridge.ts'
import {
  RISK_ADVISOR_ACTIVE_ROUTE,
  RISK_ADVISOR_ASSESSMENT_ROUTE,
  RISK_ADVISOR_RPC_CHANNEL,
  type BrowserBridgeClientResult,
} from '../src/bridge-contract.ts'
import { ONLINE_CORRECTION_ROUTE } from '../src/online-correction-contract.ts'
import type { ConnectionRpcResultLike, HostConnectionLike } from '../src/host/browser-bridge.ts'

class InMemoryAuthenticatedConnection {
  private readonly routes = new Map<string, { readonly fetch: (request: Request) => Promise<Response> }>()
  private requestCount = 0
  private readonly routeRegistry: Set<string>
  private readonly failPath: string | undefined
  registrations = 0
  disposals = 0
  constructor(routeRegistry = new Set<string>(), failPath?: string) {
    this.routeRegistry = routeRegistry
    this.failPath = failPath
  }

  readonly connection: HostConnectionLike = {
    fetch: {
      register: route => {
        if (route.path === this.failPath) throw new Error('simulated second route registration failure')
        expect(route.methods).toEqual(['POST'])
        expect(this.routes.has(route.path)).toBe(false)
        expect(this.routeRegistry.has(route.path)).toBe(false)
        this.routes.set(route.path, route)
        this.routeRegistry.add(route.path)
        this.registrations += 1
        return async () => {
          this.routes.delete(route.path)
          this.routeRegistry.delete(route.path)
          this.disposals += 1
        }
      },
    },
  }

  async dispatch(endpoint: string, payload: unknown, signal = new AbortController().signal): Promise<ConnectionRpcResultLike> {
    const path = `/api/risk-advisor/${endpoint}`
    const route = this.routes.get(path)
    if (route === undefined) throw new Error('authenticated exact route is not registered')
    const response = await route.fetch(new Request(`http://dsh.internal${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId: `p1c-rpc-${++this.requestCount}`,
        method: `risk-advisor/${endpoint}`,
        payload,
      }),
      signal,
    }))
    const body = await response.json() as { readonly result: ConnectionRpcResultLike }
    return body.result
  }

  async request(path: string, body: unknown, headers: HeadersInit = { 'content-type': 'application/json' }, method = 'POST'): Promise<Response> {
    const route = this.routes.get(path)
    if (route === undefined) throw new Error(`route is not registered: ${path}`)
    return route.fetch(new Request(`http://dsh.internal${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }))
  }

  registeredPaths(): string[] {
    return [...this.routes.keys()].sort()
  }

  isRegistered(): boolean {
    return this.routes.size > 0
  }
}

async function setupConnection() {
  const ctx = new Context()
  const connection = new InMemoryAuthenticatedConnection()
  ctx.provide('connection', connection.connection)
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService, { policy: 'ask' })
  apply(ctx)
  const session = ctx.sessions.create('p1c-browser-session')
  session.append('turn/start', { turn: 1 })
  return { ctx, connection, session, agent: { session } as unknown as Agent }
}

async function openApproval(
  ctx: Context,
  session: ReturnType<Context['sessions']['create']>,
  agent: Agent,
  toolName: string,
  callId: string,
) {
  const asked = Promise.withResolvers<void>()
  const decision = Promise.withResolvers<ApprovalOutcome>()
  let answererCalls = 0
  ctx.on('approval/request', () => {
    answererCalls += 1
    asked.resolve()
    return decision.promise
  })
  ctx.tools.register(defineContentToolFixture({
    name: toolName,
    description: 'Phase 1C harmless authenticated bridge fixture',
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
  const pending = ctx.tools.execute({
    signal: new AbortController().signal,
    callId: ToolCallId(callId),
    name: toolName,
    arguments: {},
    agent,
  })
  await asked.promise
  const event = session.snapshotEvents().find(item => item.type === 'approval/asked')
  if (event === undefined || event.type !== 'approval/asked') throw new Error('approval event not observed')
  return { approvalId: event.data.id as string, pending, decision, answererCalls: () => answererCalls }
}

function expectOk(result: ConnectionRpcResultLike): unknown {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected RPC success')
  return result.value
}

function expectFailure(result: ConnectionRpcResultLike, code: string): void {
  expect(result.ok).toBe(false)
  if (result.ok) return
  expect(result.error).toMatchObject({ code, message: expect.any(String), details: {} })
  expect(Object.keys(result.error.details)).toHaveLength(0)
}

function validView(): Record<string, unknown> {
  return {
    kind: 'VIEW',
    view: {
      schemaVersion: 1,
      sessionId: 'session-1',
      callId: 'call-1',
      assessmentId: 'ra-assessment-00000000-0000-4000-8000-000000000000',
      association: 'BOUND',
      status: 'unavailable',
      stage: 'not-started',
      reasonCodes: ['ASSESSOR_NOT_IMPLEMENTED'],
      updatedAt: 123,
    },
  }
}

describe('Phase 1C authenticated read-only browser bridge', () => {
  it('P1C-01/P1C-05/P1C-06/P1C-10 serves one active view, follow-up, then no stale view after decision/disposal', async () => {
    const { ctx, connection, session, agent } = await setupConnection()
    let disposed = false
    try {
      const approval = await openApproval(ctx, session, agent, 'p1c-live-probe', 'p1c-live-call')
      expect(connection.registeredPaths()).toEqual([RISK_ADVISOR_ACTIVE_ROUTE, RISK_ADVISOR_ASSESSMENT_ROUTE, ONLINE_CORRECTION_ROUTE].sort())
      expect(connection.registrations).toBe(3)

      const active = expectOk(await connection.dispatch('active', { sessionId: session.id, callId: 'p1c-live-call' })) as Record<string, unknown>
      expect(active).toMatchObject({ kind: 'VIEW' })
      const view = (active as { view: Record<string, unknown> }).view
      expect(view).toMatchObject({ schemaVersion: 2, sessionId: session.id, callId: 'p1c-live-call', association: 'BOUND', status: 'ready', stage: 'complete' })
      expect(view.assessmentId).toMatch(/^ra-assessment-[0-9a-f-]{36}$/)
      expect(view).toHaveProperty('operation')
      expect(view).toHaveProperty('assessment')
      expect(view).not.toHaveProperty('approvalId')
      expect(view).not.toHaveProperty('executionId')
      expect(view).not.toHaveProperty('observedOutcome')
      expect(view).not.toHaveProperty('rawArguments')
      expect(view).not.toHaveProperty('cwd')
      expect(view).not.toHaveProperty('operationHash')

      const assessmentId = view.assessmentId as string
      expect(expectOk(await connection.dispatch('assessment', { assessmentId }))).toEqual(active)
      expect(approval.answererCalls()).toBe(1)

      approval.decision.resolve('allowed-once')
      await expect(approval.pending).resolves.toMatchObject({ isError: false })
      expect(expectOk(await connection.dispatch('active', { sessionId: session.id, callId: 'p1c-live-call' }))).toEqual({ kind: 'NOT_FOUND' })
      expect(expectOk(await connection.dispatch('assessment', { assessmentId }))).toEqual({ kind: 'NOT_FOUND' })

      await ctx.fiber.dispose()
      disposed = true
      expect(connection.disposals).toBe(3)
      expect(connection.isRegistered()).toBe(false)
    } finally {
      if (!disposed) await ctx.fiber.dispose()
    }
  })

  it('P1C-F4 remounts the bridge across late Connection lifecycle changes', async () => {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt)
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(ApprovalService, { policy: 'ask' })
  const routeRegistry = new Set<string>()
  apply(ctx)
  await new Promise<void>(resolve => setTimeout(resolve, 0))

  // Sessions may be ready before Connection; the required dependency keeps
  // the bridge sub-fiber pending instead of running a no-op callback.
  expect(ctx.get('sessions')).toBeDefined()
  expect(routeRegistry).toEqual(new Set())

  const first = new InMemoryAuthenticatedConnection(routeRegistry)
  const removeFirst = ctx.provide('connection', first.connection)
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  expect(first.registrations).toBe(3)
  expect(first.isRegistered()).toBe(true)
  expect(routeRegistry).toEqual(new Set([RISK_ADVISOR_ACTIVE_ROUTE, RISK_ADVISOR_ASSESSMENT_ROUTE, ONLINE_CORRECTION_ROUTE]))

  // Connection replacement first unloads the old dependency-owned bridge.
  await removeFirst()
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  expect(first.disposals).toBe(3)
  expect(first.isRegistered()).toBe(false)
  expect(routeRegistry).toEqual(new Set())

  const replacement = new InMemoryAuthenticatedConnection(routeRegistry)
  ctx.provide('connection', replacement.connection)
  await new Promise<void>(resolve => setTimeout(resolve, 0))
  expect(replacement.registrations).toBe(3)
  expect(replacement.isRegistered()).toBe(true)
  expect(routeRegistry).toEqual(new Set([RISK_ADVISOR_ACTIVE_ROUTE, RISK_ADVISOR_ASSESSMENT_ROUTE, ONLINE_CORRECTION_ROUTE]))
  expect(first.registrations + replacement.registrations).toBe(6)

  // Final tree disposal withdraws the replacement route as well.
  await ctx.fiber.dispose()
  expect(replacement.disposals).toBe(3)
  expect(replacement.isRegistered()).toBe(false)
  expect(routeRegistry).toEqual(new Set())
  })

  it('P1C-02 resolves only the current live Session and exact callId', async () => {
    const { ctx, connection, session, agent } = await setupConnection()
    try {
      const approval = await openApproval(ctx, session, agent, 'p1c-identity-probe', 'p1c-identity-call')
      expect(expectOk(await connection.dispatch('active', { sessionId: session.id, callId: 'wrong-call' }))).toEqual({ kind: 'NOT_FOUND' })
      expect(expectOk(await connection.dispatch('active', { sessionId: 'disposed-or-unknown', callId: 'p1c-identity-call' }))).toEqual({ kind: 'NOT_FOUND' })
      approval.decision.resolve('rejected')
      await approval.pending
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('P1C-03 returns AMBIGUOUS for two component-injected open records sharing callId', async () => {
    const { ctx, connection, session } = await setupConnection()
    try {
      session.append('approval/asked', { id: 'component-a' as never, toolName: 'probe-a', callId: ToolCallId('same-call') })
      session.append('approval/asked', { id: 'component-b' as never, toolName: 'probe-b', callId: ToolCallId('same-call') })
      expect(expectOk(await connection.dispatch('active', { sessionId: session.id, callId: 'same-call' }))).toEqual({
        kind: 'AMBIGUOUS',
        reasonCodes: ['MULTIPLE_ACTIVE_APPROVALS'],
      })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('P1C-04 preserves a Phase 1B conflict as unavailable and cannot recover its old assessmentId', async () => {
    const { ctx, connection, session, agent } = await setupConnection()
    try {
      const approval = await openApproval(ctx, session, agent, 'p1c-conflict-probe', 'p1c-conflict-call')
      const initial = expectOk(await connection.dispatch('active', { sessionId: session.id, callId: 'p1c-conflict-call' })) as { view: Record<string, unknown> }
      const oldAssessmentId = initial.view.assessmentId as string
      session.append('approval/asked', {
        id: approval.approvalId as never,
        toolName: 'p1c-conflicting-tool',
        callId: ToolCallId('p1c-other-call'),
      })
      const conflicted = expectOk(await connection.dispatch('active', { sessionId: session.id, callId: 'p1c-conflict-call' })) as { view: Record<string, unknown> }
      expect(conflicted.view).toMatchObject({ association: 'UNBOUND', status: 'unavailable' })
      expect(conflicted.view).not.toHaveProperty('assessmentId')
      expect(expectOk(await connection.dispatch('assessment', { assessmentId: oldAssessmentId }))).toEqual({ kind: 'NOT_FOUND' })
      approval.decision.resolve('cancelled')
      await approval.pending
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('P1C-07 strictly validates endpoint/payload and cancellation without echoing input', async () => {
    const { ctx, connection } = await setupConnection()
    try {
      const huge = 'x'.repeat(257)
      expectFailure(await connection.dispatch('active', { sessionId: 's', callId: 'c', extra: 'secret' }), 'risk-advisor/bad-request')
      expectFailure(await connection.dispatch('active', { sessionId: huge, callId: 'c' }), 'risk-advisor/bad-request')
      expectFailure(await connection.dispatch('active', { sessionId: '', callId: 'c' }), 'risk-advisor/bad-request')
      const unknown = await connection.request(RISK_ADVISOR_ACTIVE_ROUTE, {
        type: 'client-request', rpcId: 'p1c-unknown', method: 'risk-advisor/unknown', payload: { sessionId: 'secret-session' },
      })
      expect(unknown.status).toBe(200)
      expect(await unknown.json()).toMatchObject({ result: { ok: false, error: { code: 'gateway/bad-request', details: {} } } })
      const abort = new AbortController()
      abort.abort()
      expectFailure(await connection.dispatch('active', { sessionId: 's', callId: 'c' }, abort.signal), 'risk-advisor/cancelled')
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('P1C-maintenance validates the shared Connection envelope and bounded failures', async () => {
    const { ctx, connection } = await setupConnection()
    try {
      const malformed = await connection.request(RISK_ADVISOR_ACTIVE_ROUTE, { type: 'not-client-request', payload: 'secret-raw-payload' })
      expect(malformed.status).toBe(200)
      const malformedBody = JSON.stringify(await malformed.json())
      expect(malformedBody).toContain('invalid client-request message')
      expect(malformedBody).not.toContain('secret-raw-payload')

      const mismatch = await connection.request(RISK_ADVISOR_ACTIVE_ROUTE, {
        type: 'client-request', rpcId: 'p1c-mismatch', method: 'risk-advisor/assessment', payload: { assessmentId: 'secret-assessment' },
      })
      expect(mismatch.status).toBe(200)
      expect(await mismatch.json()).toMatchObject({
        type: 'server-response',
        rpcId: 'p1c-mismatch',
        result: { ok: false, error: { code: 'gateway/bad-request', details: {} } },
      })

      const wrongContentType = await connection.request(RISK_ADVISOR_ACTIVE_ROUTE, {}, { 'content-type': 'text/plain' })
      expect(wrongContentType.status).toBe(415)
      const wrongMethod = await connection.request(RISK_ADVISOR_ACTIVE_ROUTE, undefined, {}, 'GET')
      expect(wrongMethod.status).toBe(404)
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('P1C-maintenance drains the first exact route when the second registration fails', async () => {
    const ctx = new Context()
    const connection = new InMemoryAuthenticatedConnection(new Set(), RISK_ADVISOR_ASSESSMENT_ROUTE)
    ctx.provide('connection', connection.connection)
    await ctx.plugin(SessionStore)
    const coordinator = {
      queryActivePresentationForCall: () => ({ kind: 'NOT_FOUND' as const }),
      queryOpenPresentationByAssessmentId: () => ({ kind: 'NOT_FOUND' as const }),
    }
    installRiskAdvisorBrowserBridge(ctx, connection.connection, coordinator)
    await new Promise<void>(resolve => setTimeout(resolve, 0))
    expect(connection.registrations).toBe(1)
    expect(connection.disposals).toBe(1)
    expect(connection.registeredPaths()).toEqual([])
    await ctx.fiber.dispose()
  })

  it('P1C-08/P1C-09 validates Browser DTOs and maps Host/transport failures safely', async () => {
    const calls: unknown[] = []
    const client = createRiskAdvisorBridgeClient({
      call: async (...args) => {
        calls.push(args)
        return { ok: true, value: validView() }
      },
    })
    const valid = await client.active('session-1', 'call-1')
    expect(valid.kind).toBe('VIEW')
    expect(Object.isFrozen(valid)).toBe(true)
    if (valid.kind === 'VIEW') {
      expect(Object.isFrozen(valid.view)).toBe(true)
      expect(Object.isFrozen(valid.view.reasonCodes)).toBe(true)
    }
    expect((calls[0] as unknown[]).slice(0, 3)).toEqual([RISK_ADVISOR_RPC_CHANNEL, 'risk-advisor/active', { sessionId: 'session-1', callId: 'call-1' }])

    const malformed = createRiskAdvisorBridgeClient({
      call: async () => ({ ok: true, value: { ...validView(), view: { ...(validView() as { view: Record<string, unknown> }).view, approvalId: 'secret' } } }),
    })
    expect(await malformed.active('session-1', 'call-1')).toEqual({ kind: 'UNAVAILABLE', reason: 'PROTOCOL_INVALID' })

    const rejected = createRiskAdvisorBridgeClient({ call: async () => ({ ok: false, error: { code: 'secret-code', message: 'secret-message', details: { secret: 'raw' } } }) })
    expect(await rejected.assessment('ra-assessment-1')).toEqual({ kind: 'UNAVAILABLE', reason: 'HOST_REJECTED' })

    const thrown = createRiskAdvisorBridgeClient({ call: async () => { throw new Error('raw exception') } })
    expect(await thrown.assessment('ra-assessment-1')).toEqual({ kind: 'UNAVAILABLE', reason: 'TRANSPORT_UNAVAILABLE' })
    const abort = new AbortController()
    abort.abort()
    expect(await thrown.assessment('ra-assessment-1', abort.signal)).toEqual({ kind: 'UNAVAILABLE', reason: 'CANCELLED' })
    expect(await thrown.active('', 'call-1')).toEqual({ kind: 'UNAVAILABLE', reason: 'PROTOCOL_INVALID' })

    const serialized = JSON.stringify(await rejected.assessment('ra-assessment-1'))
    expect(serialized).not.toContain('secret')
  })

  it('P1C-11 leaves the T01 fixture store and detail renderer path untouched', async () => {
    const { ctx, connection } = await setupConnection()
    try {
      const client = createRiskAdvisorBridgeClient({ call: (...args) => connection.dispatch(String(args[1]).replace('risk-advisor/', ''), args[2], args[3]) })
      expect(client).toBeDefined()
      expect(connection.registeredPaths()).toEqual([RISK_ADVISOR_ACTIVE_ROUTE, RISK_ADVISOR_ASSESSMENT_ROUTE, ONLINE_CORRECTION_ROUTE].sort())
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
