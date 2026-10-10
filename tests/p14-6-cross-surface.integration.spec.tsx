import { rm } from 'node:fs/promises'
import type { ComponentType, ReactNode } from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { Context } from '@deepseek-ai/cordis'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { createUserMessage, ToolCallId } from '@deepseek-ai/dsh-llm'
import SessionStore, { type Session } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime, { defineTool } from '@deepseek-ai/dsh-tools'
import { afterEach, describe, expect, it } from 'vitest'
import { createSlotRenderer } from '../../../deepseek-harness/packages/client/ui-renderer/src/client/scoped-slots.tsx'
import { apply as applyHost } from '../src/index.ts'
import { apply as applyClient, inject as clientInject } from '../src/client/index.ts'
import { onlineCorrectionEn } from '../src/client/online-correction-locales.ts'
import {
  CORRECTION_HISTORICAL_CONTEXT_ENDPOINT,
  CORRECTION_HISTORICAL_CONTEXT_ROUTE,
} from '../src/correction-historical-context-contract.ts'
import {
  CORRECTION_NEXT_CHECK_ENDPOINT,
  CORRECTION_NEXT_CHECK_ROUTE,
} from '../src/correction-next-check-contract.ts'
import {
  ONLINE_CORRECTION_ENDPOINT,
  ONLINE_CORRECTION_ROUTE,
} from '../src/online-correction-contract.ts'
import {
  RISK_ADVISOR_RUNTIME_RISK_ENDPOINT,
  RISK_ADVISOR_RUNTIME_RISK_ROUTE,
} from '../src/bridge-contract.ts'
import { createJsonStorageFixture } from './p11-1-experience-fixtures.ts'
import { createQualifiedHistoryFixture } from './p14-2-historical-context-fixtures.ts'

type FetchRoute = { readonly path: string; readonly fetch: (request: Request) => Promise<Response> }
type Rpc = { readonly call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown> }

const routeForEndpoint = new Map([
  [RISK_ADVISOR_RUNTIME_RISK_ENDPOINT, RISK_ADVISOR_RUNTIME_RISK_ROUTE],
  [ONLINE_CORRECTION_ENDPOINT, ONLINE_CORRECTION_ROUTE],
  [CORRECTION_HISTORICAL_CONTEXT_ENDPOINT, CORRECTION_HISTORICAL_CONTEXT_ROUTE],
  [CORRECTION_NEXT_CHECK_ENDPOINT, CORRECTION_NEXT_CHECK_ROUTE],
])

async function flush(): Promise<void> {
  for (let index = 0; index < 16; index += 1) await Promise.resolve()
}

function translate(key: keyof typeof onlineCorrectionEn, params?: Record<string, unknown>): string {
  let value = onlineCorrectionEn[key]
  for (const [name, replacement] of Object.entries(params ?? {})) value = value.replaceAll(`{${name}}`, String(replacement))
  return value
}

async function createDurableGuidanceFixture() {
  const seed = await createQualifiedHistoryFixture({ toolName: 'write' })
  const patternId = seed.patterns.diagnostics.patternIds()[0]
  if (patternId === undefined || seed.guidance.diagnostics.currentForPattern(patternId) === undefined) {
    throw new Error('phase14-6 trusted fixture did not qualify a Pattern and Guidance')
  }
  const root = seed.root
  await seed.patterns.drain()
  await seed.guidance.drain()
  await seed.guidance.detach()
  await seed.patterns.detach()
  await seed.outcomes.detach()
  // Keep the original backing facility alive after detaching the seed
  // runtimes. The actual Host apply() opens the same durable domain below.
  return { root, patternId, storage: seed.backing, async close() {
    await seed.backing.close()
    await rm(root, { recursive: true, force: true })
  } }
}

async function createHostFixture() {
  const history = await createDurableGuidanceFixture()
  const routes = new Map<string, FetchRoute>()
  const rpc = {
    call: async (_channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<unknown> => {
      const path = routeForEndpoint.get(endpoint)
      const route = path === undefined ? undefined : routes.get(path)
      if (route === undefined) throw new Error(`unregistered fixture endpoint ${endpoint}`)
      const response = await route.fetch(new Request(`http://harness.test${route.path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: `p14-6-rpc-${++rpcSequence}`, method: endpoint, payload }),
        ...(signal === undefined ? {} : { signal }),
      }))
      const envelope = await response.json() as { readonly result?: unknown }
      return envelope.result
    },
  } satisfies Rpc
  const connection = {
    rpc,
    generation: { getSnapshot: () => 1, subscribe: (_listener: () => void) => () => undefined },
    fetch: {
      register(route: FetchRoute) {
        if (routes.has(route.path)) throw new Error(`duplicate route ${route.path}`)
        routes.set(route.path, route)
        return async () => { routes.delete(route.path) }
      },
    },
  }

  const ctx = new Context()
  ctx.provide('connection', connection)
  ctx.provide('storageDomain', history.storage.facility)
  await ctx.plugin(SessionStore).await()
  await ctx.plugin(SystemPrompt).await()
  await ctx.plugin(ToolRuntime).await()
  const risk = ctx.plugin({ name: 'p14-6-actual-risk-advisor-host', inject: ['tools'], apply: owner => applyHost(owner) })
  await risk.await()
  await waitFor(() => expect(ctx.get('riskAdvisorExperience').status()).toBe('READY'))

  if (routes.size !== 8 || new Set([...routes.values()].map(route => route.path)).size !== 8) {
    await ctx.fiber.dispose()
    await history.close()
    throw new Error(`expected eight distinct live Risk Advisor routes, got ${routes.size}`)
  }

  let executionId: string | undefined
  const executionIds = new Map<string, string>()
  const settledTools = new Map<string, { readonly exec: object; readonly result: object }>()
  let heldWriteStarted: (() => void) | undefined
  let releaseHeldWrite: (() => void) | undefined
  const heldWriteStartedPromise = new Promise<void>(resolve => { heldWriteStarted = resolve })
  const heldWriteReleasePromise = new Promise<void>(resolve => { releaseHeldWrite = resolve })
  ctx.on('tools/pre-execute', (exec, next) => {
    const found = ctx.get('riskAdvisorCorrelation').lookup(exec.agent?.session, exec.callId)
    if (found.status === 'FOUND') {
      executionId = found.executionId
      executionIds.set(String(exec.callId), found.executionId)
    }
    return next()
  })
  ctx.on('tools/result', (exec, result) => { settledTools.set(String(exec.callId), { exec, result }) })
  const session = ctx.sessions.create('phase14-6-integrated-session')
  const prepareSession = (owner: Session, prompt = 'Read the synthetic fixture and verify the resulting file state.') => {
    owner.append('turn/start', { turn: 1 })
    owner.append('user/message', createUserMessage({
      content: [{ type: 'text', text: prompt }],
      source: { kind: 'user' },
    }), { surfaceOp: 'append' })
  }
  prepareSession(session)
  ctx.tools.register(defineTool({
    name: 'write',
    description: 'deterministic local write fixture for cross-surface verification',
    parameters: {
      file_path: { type: 'string', required: true },
      content: { type: 'string', required: true },
    },
    output: {
      schema: { type: 'object', additionalProperties: true },
      render: () => [{ type: 'text' as const, text: 'bounded synthetic write result' }],
    },
    async execute(args) {
      if (args.content === 'phase14-6-e1-held-mismatch') {
        heldWriteStarted?.()
        await heldWriteReleasePromise
      }
      // The independently observed postcondition deliberately differs from
      // the requested content. This is a deterministic Tool fixture, not a
      // provider response or a fabricated Risk Advisor Finding.
      return {
        path: args.file_path,
        operation: 'create',
        before: null,
        after: args.content === 'phase14-6-matched-content' ? args.content : 'unexpected synthetic content',
      }
    },
  }))

  let closed = false
  return {
    ctx, routes, history, session,
    get executionId() { return executionId },
    rpc: connection.rpc,
    createSession(sessionId: string) {
      const created = ctx.sessions.create(sessionId)
      prepareSession(created, `Observe the isolated synthetic session ${sessionId}.`)
      return created
    },
    executionIdFor(callId: string) { return executionIds.get(callId) },
    settledToolFor(callId: string) { return settledTools.get(callId) },
    waitForHeldWrite() { return heldWriteStartedPromise },
    releaseHeldWrite() { releaseHeldWrite?.() },
    async executeWrite(options: { readonly session: Session; readonly callId: string; readonly path: string; readonly content: string }) {
      return await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId(options.callId),
        name: 'write',
        arguments: { file_path: options.path, content: options.content },
        agent: { session: options.session } as unknown as Agent,
      })
    },
    async readRuntimeRisk(sessionId: string) {
      return await connection.rpc.call('/api', RISK_ADVISOR_RUNTIME_RISK_ENDPOINT, { sessionId })
    },
    async readOnlineCorrection(sessionId: string) {
      return await connection.rpc.call('/api', ONLINE_CORRECTION_ENDPOINT, { sessionId })
    },
    async readHistoricalContext(sessionId: string, findingId: string) {
      return await connection.rpc.call('/api', CORRECTION_HISTORICAL_CONTEXT_ENDPOINT, { sessionId, findingId })
    },
    async executeMismatch() {
      const result = await ctx.tools.execute({
        signal: new AbortController().signal,
        callId: ToolCallId('phase14-6-write-call'),
        name: 'write',
        arguments: { file_path: '/private/phase14-6/secret-target.txt', content: 'private-content-sentinel' },
        agent: { session } as unknown as Agent,
      })
      if (result.isError) throw new Error('synthetic write Tool should have completed successfully')
      return result
    },
    async close() {
      if (closed) return
      closed = true
      await ctx.fiber.dispose()
      await history.close()
    },
  }
}

async function createBrowserFixture(rpc: Rpc) {
  const ctx = new Context()
  let connectionGeneration = 1
  const generationListeners = new Set<() => void>()
  ctx.provide('connection', { rpc, generation: {
    getSnapshot: () => connectionGeneration,
    subscribe: (listener: () => void) => {
      generationListeners.add(listener)
      return () => { generationListeners.delete(listener) }
    },
  } })
  await ctx.plugin(SlotRegistry).await()
  const locale = new LocaleRuntime(ctx)
  ctx.provide('locale', locale)
  ctx.slots.installLocale(locale)
  ctx.slots.install(createSlotRenderer())
  ctx.slots.register({ name: 'root', children: {
    'conversation.input.dock': { kind: 'list', scope: 'session' },
    'conversation.approval.detail': { kind: 'single', scope: 'session' },
  } }, () => null)
  const fiber = ctx.plugin({ name: 'p14-6-actual-risk-advisor-client', inject: [...clientInject], apply: applyClient })
  await fiber.await()

  const entry = ctx.slots.entriesOfSlot('conversation.input.dock').find(item => item.options.id === 'risk-advisor-online-correction')
  const runtimeEntry = ctx.slots.entriesOfSlot('conversation.input.dock').find(item => item.options.id === 'risk-advisor-runtime-risk-awareness')
  if (entry === undefined || entry.options.order !== 10 || runtimeEntry?.options.order !== 20) {
    await ctx.fiber.dispose()
    throw new Error('actual Client apply() did not register the frozen advisory slots')
  }
  const Component = entry.component as ComponentType<Record<string, unknown>>
  let mounted: ReturnType<typeof render> | undefined
  return {
    ctx,
    entry,
    mount(sessionId: string) {
      const injected = entry.inject?.(sessionId as never) ?? {}
      mounted?.unmount()
      mounted = render(<Component
        sessionId={sessionId as never}
        session={{ id: sessionId } as never}
        input={{} as never}
        useSession={(() => ({ id: sessionId })) as never}
        useProjection={(() => undefined) as never}
        useSessions={(() => ({})) as never}
        useSessionStatus={(() => ({})) as never}
        useSessionRetainInfo={(() => ({})) as never}
        t={translate as never}
        {...injected}
      />)
      return mounted
    },
    replaceGeneration() {
      connectionGeneration += 1
      for (const listener of [...generationListeners]) listener()
      return connectionGeneration
    },
    async close() {
      mounted?.unmount()
      mounted = undefined
      await ctx.fiber.dispose()
    },
  }
}

let rpcSequence = 0
afterEach(() => {
  cleanup()
  rpcSequence = 0
})

describe('Phase 14.6 actual Host-to-Client cross-surface integration', () => {
  it('registers exactly eight Host routes and clears every handler over three apply/dispose generations', async () => {
    const routes = new Map<string, FetchRoute>()
    const connection = {
      rpc: { call: async () => ({ ok: true, value: {} }) },
      generation: { getSnapshot: () => 1, subscribe: (_listener: () => void) => () => undefined },
      fetch: { register(route: FetchRoute) {
        if (routes.has(route.path)) throw new Error(`duplicate route ${route.path}`)
        routes.set(route.path, route)
        return async () => { routes.delete(route.path) }
      } },
    }
    const ctx = new Context()
    ctx.provide('connection', connection)
    await ctx.plugin(SessionStore).await()
    await ctx.plugin(SystemPrompt).await()
    await ctx.plugin(ToolRuntime).await()

    try {
      for (let generation = 1; generation <= 3; generation += 1) {
        const fiber = ctx.plugin({ name: `p14-6-route-generation-${generation}`, inject: ['tools'], apply: applyHost })
        await fiber.await()
        expect(routes.size).toBe(8)
        expect(new Set(routes.keys()).size).toBe(8)
        expect([...routes.keys()].every(path => path.startsWith('/api/risk-advisor/'))).toBe(true)
        await fiber.dispose()
        expect(routes.size).toBe(0)
      }
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('shows an actual stored-verifier F2 with both trusted-history and current next-check views in the registered Dock', async () => {
    const host = await createHostFixture()
    let browser: Awaited<ReturnType<typeof createBrowserFixture>> | undefined
    try {
      const toolResult = await host.executeMismatch()
      expect(toolResult.isError).toBe(false)
      expect(host.executionId).toBeDefined()
      const verification = host.ctx.get('riskAdvisorVerification').get(host.executionId!)
      expect(verification).toMatchObject({ source: 'tool-contract', adapterId: 'tool.write.v1', status: 'MISMATCHED', semanticSuccess: false })
      const finding = host.ctx.get('riskAdvisorLiveCorrection').forSession(host.session).findings[0]
      expect(finding).toMatchObject({ kind: 'POSTCONDITION_NOT_SATISFIED', diagnosis: 'VERIFIED_POSTCONDITION_MISMATCH', advisoryCode: 'INSPECT_UNSATISFIED_POSTCONDITION_V1' })

      const historicalRoute = host.routes.get(CORRECTION_HISTORICAL_CONTEXT_ROUTE)!
      const historyResponse = await historicalRoute.fetch(new Request(`http://harness.test${historicalRoute.path}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'client-request', rpcId: 'p14-6-proof-history', method: CORRECTION_HISTORICAL_CONTEXT_ENDPOINT,
          payload: { sessionId: host.session.id, findingId: finding.findingId } }),
      }))
      const historyEnvelope = await historyResponse.json() as { readonly result: { readonly ok: boolean; readonly value?: Record<string, unknown> } }
      expect(historyEnvelope.result).toMatchObject({ ok: true, value: { kind: 'VIEW', sessionId: host.session.id,
        findingId: finding.findingId, findingKind: 'POSTCONDITION_NOT_SATISFIED', historical: {
          patternId: host.history.patternId, evidenceStrength: 'QUALIFIED_PATTERN', supportCount: 3,
        } } })

      browser = await createBrowserFixture(host.ctx.get('connection').rpc)
      const view = browser.mount(host.session.id)
      await screen.findByText(translate('title'))
      await waitFor(() => expect(view.container.querySelector('[data-correction-next-check]')).not.toBeNull())
      await waitFor(() => expect(view.container.querySelector('[data-correction-history]')).not.toBeNull())
      expect(view.container.querySelectorAll('[data-advisory-kind="POSTCONDITION_NOT_SATISFIED"]')).toHaveLength(1)
      expect(view.container.querySelector('[data-correction-next-check]')?.textContent).toContain(translate('nextCheck.inspectWrite'))
      expect(view.container.querySelector('[data-correction-history]')?.textContent).toContain(translate('history.label'))
      expect(view.container.textContent).toContain(translate('kind.f2'))
      expect(view.container.textContent).not.toContain('/private/phase14-6/secret-target.txt')
      expect(view.container.textContent).not.toContain('private-content-sentinel')

      const serialized = JSON.stringify(historyEnvelope)
      expect(serialized).not.toContain('/private/phase14-6/secret-target.txt')
      expect(serialized).not.toContain('private-content-sentinel')
    } finally {
      await browser?.close()
      await host.close()
    }
  })

  it('contains either optional read failure while preserving the actual F2 warning and the other optional surface', async () => {
    const host = await createHostFixture()
    const clients: Array<Awaited<ReturnType<typeof createBrowserFixture>>> = []
    try {
      await host.executeMismatch()
      const finding = host.ctx.get('riskAdvisorLiveCorrection').forSession(host.session).findings[0]!

      const mountWithFailure = async (failedEndpoint: string) => {
        const rpc: Rpc = {
          call: async (channel, endpoint, payload, signal) => {
            if (endpoint === failedEndpoint) return {
              ok: false,
              error: { code: 'risk-advisor/fixture-unavailable', message: 'deterministic optional read failure', details: {} },
            }
            return host.ctx.get('connection').rpc.call(channel, endpoint, payload, signal)
          },
        }
        const browser = await createBrowserFixture(rpc)
        clients.push(browser)
        return browser.mount(host.session.id)
      }

      const nextCheckFailed = await mountWithFailure(CORRECTION_NEXT_CHECK_ENDPOINT)
      await screen.findByText(translate('kind.f2'))
      await waitFor(() => expect(nextCheckFailed.container.querySelector('[data-correction-history]')).not.toBeNull())
      expect(nextCheckFailed.container.querySelector('[data-advisory-kind="POSTCONDITION_NOT_SATISFIED"]')).not.toBeNull()
      expect(nextCheckFailed.container.querySelector('[data-correction-next-check]')).toBeNull()
      nextCheckFailed.unmount()

      const historyFailed = await mountWithFailure(CORRECTION_HISTORICAL_CONTEXT_ENDPOINT)
      await screen.findByText(translate('kind.f2'))
      await waitFor(() => expect(historyFailed.container.querySelector('[data-correction-next-check]')).not.toBeNull())
      expect(historyFailed.container.querySelector('[data-advisory-kind="POSTCONDITION_NOT_SATISFIED"]')).not.toBeNull()
      expect(historyFailed.container.querySelector('[data-correction-history]')).toBeNull()
      expect(finding.kind).toBe('POSTCONDITION_NOT_SATISFIED')
    } finally {
      for (const browser of clients) await browser.close()
      await host.close()
    }
  })

  it('keeps one Session ordinary-risk projection independent from a late F2 and duplicate settled Tool events', async () => {
    const host = await createHostFixture()
    const olderCallId = 'phase14-6-e1-older-write'
    const newerCallId = 'phase14-6-e1-newer-write'
    const olderPath = '/private/phase14-6/e1-held-mismatch.txt'
    const newerPath = '/private/phase14-6/e1-matched-write.txt'
    try {
      const olderExecution = host.executeWrite({
        session: host.session,
        callId: olderCallId,
        path: olderPath,
        content: 'phase14-6-e1-held-mismatch',
      })
      await host.waitForHeldWrite()

      let capturedRisk: { readonly ok: boolean; readonly value?: Record<string, unknown> } | undefined
      await waitFor(async () => {
        capturedRisk = await host.readRuntimeRisk(host.session.id) as typeof capturedRisk
        expect(capturedRisk).toMatchObject({ ok: true, value: {
          kind: 'VIEW', sessionId: host.session.id, callId: olderCallId, timing: 'PRE_EXECUTION_EVIDENCE',
        } })
      })
      const olderExecutionId = host.executionIdFor(olderCallId)
      expect(olderExecutionId).toBeDefined()
      expect(capturedRisk?.value?.executionId).toBe(olderExecutionId)
      expect(capturedRisk?.value?.status).toBe('DEGRADED')
      expect(capturedRisk?.value?.reasonCodes).toEqual(expect.arrayContaining([expect.any(String)]))

      const beforeOlderSettlement = await host.readOnlineCorrection(host.session.id) as {
        readonly ok: boolean; readonly value?: { readonly kind: string; readonly view?: { readonly findings: readonly unknown[] } }
      }
      expect(beforeOlderSettlement).toMatchObject({ ok: true, value: { kind: 'VIEW', view: { findings: [] } } })

      const newerResult = await host.executeWrite({
        session: host.session,
        callId: newerCallId,
        path: newerPath,
        content: 'phase14-6-matched-content',
      })
      expect(newerResult.isError).toBe(false)
      const newerExecutionId = host.executionIdFor(newerCallId)
      expect(newerExecutionId).toBeDefined()
      expect(newerExecutionId).not.toBe(olderExecutionId)

      let newerRisk: { readonly ok: boolean; readonly value?: Record<string, unknown> } | undefined
      await waitFor(async () => {
        newerRisk = await host.readRuntimeRisk(host.session.id) as typeof newerRisk
        expect(newerRisk).toMatchObject({ ok: true, value: {
          kind: 'VIEW', sessionId: host.session.id, executionId: newerExecutionId,
          callId: newerCallId, timing: 'PRE_EXECUTION_EVIDENCE', status: expect.stringMatching(/^(READY|DEGRADED)$/u),
        } })
      })

      host.releaseHeldWrite()
      const olderResult = await olderExecution
      expect(olderResult.isError).toBe(false)
      const settled = host.settledToolFor(olderCallId)
      expect(settled).toBeDefined()
      const actualFindings = await host.readOnlineCorrection(host.session.id) as {
        readonly ok: boolean; readonly value?: { readonly kind: string; readonly view?: { readonly findings: readonly { readonly findingId: string; readonly kind: string }[] } }
      }
      expect(actualFindings).toMatchObject({ ok: true, value: { kind: 'VIEW', view: { findings: [
        { kind: 'POSTCONDITION_NOT_SATISFIED' },
      ] } } })
      const actualFindingIds = actualFindings.value?.kind === 'VIEW'
        ? actualFindings.value.view?.findings.map(finding => finding.findingId)
        : []
      expect(actualFindingIds).toHaveLength(1)

      const afterOutOfOrderSettlement = await host.readRuntimeRisk(host.session.id) as {
        readonly ok: boolean; readonly value?: Record<string, unknown>
      }
      expect(afterOutOfOrderSettlement).toMatchObject({ ok: true, value: {
        kind: 'VIEW', sessionId: host.session.id, executionId: newerExecutionId, callId: newerCallId,
      } })
      expect(afterOutOfOrderSettlement.value?.executionId).not.toBe(olderExecutionId)

      host.ctx.emit('tools/result', settled!.exec as never, settled!.result as never)
      host.ctx.emit('tools/result', settled!.exec as never, settled!.result as never)
      await flush()

      const afterDuplicateDelivery = await host.readOnlineCorrection(host.session.id) as typeof actualFindings
      const finalRisk = await host.readRuntimeRisk(host.session.id) as typeof afterOutOfOrderSettlement
      expect(afterDuplicateDelivery.value).toEqual(actualFindings.value)
      expect(finalRisk.value).toMatchObject({
        kind: 'VIEW', sessionId: host.session.id, executionId: newerExecutionId, callId: newerCallId,
      })
      expect(finalRisk.value?.executionId).not.toBe(olderExecutionId)
    } finally {
      host.releaseHeldWrite()
      await host.close()
    }
  })

  it('fences both optional projections through Session A→B→A, late replies, and connection generation replacement', async () => {
    const host = await createHostFixture()
    const sessionA = host.session
    const sessionB = host.createSession('phase14-6-e2-session-b')
    try {
      const aResult = await host.executeWrite({
        session: sessionA,
        callId: 'phase14-6-e2-session-a-write',
        path: '/private/phase14-6/e2-session-a-mismatch.txt',
        content: 'private-content-sentinel',
      })
      expect(aResult.isError).toBe(false)
      const aRisk = await host.readRuntimeRisk(sessionA.id) as { readonly ok: boolean; readonly value?: Record<string, unknown> }
      expect(aRisk).toMatchObject({ ok: true, value: { kind: 'VIEW', sessionId: sessionA.id, callId: 'phase14-6-e2-session-a-write' } })

      const delayed = new Map<string, { readonly value: unknown; readonly deliver: () => void }>()
      const rpcTrace: Array<{ endpoint: string; sessionId: string | undefined; findingId: string | undefined; kind: string | undefined; observedAt: number | undefined }> = []
      const deferredAEndpoints = new Set([CORRECTION_HISTORICAL_CONTEXT_ENDPOINT, CORRECTION_NEXT_CHECK_ENDPOINT])
      const intercepted: Rpc = {
        call: async (channel, endpoint, payload, signal) => {
          const value = await host.rpc.call(channel, endpoint, payload, signal)
          const requestSessionId = payload !== null && typeof payload === 'object' && 'sessionId' in payload
            ? String((payload as { readonly sessionId: unknown }).sessionId)
            : undefined
          const requestFindingId = payload !== null && typeof payload === 'object' && 'findingId' in payload
            ? String((payload as { readonly findingId: unknown }).findingId)
            : undefined
          const valueRecord = value !== null && typeof value === 'object' && 'value' in value
            ? (value as { readonly value: unknown }).value
            : undefined
          const valueView = valueRecord !== null && typeof valueRecord === 'object' ? valueRecord as Record<string, unknown> : undefined
          rpcTrace.push({
            endpoint,
            sessionId: requestSessionId,
            findingId: requestFindingId,
            kind: typeof valueView?.kind === 'string' ? valueView.kind : undefined,
            observedAt: typeof valueView?.observedAt === 'number' ? valueView.observedAt : undefined,
          })
          if (requestSessionId === sessionA.id && deferredAEndpoints.has(endpoint) && !delayed.has(endpoint)) {
            return await new Promise(resolve => { delayed.set(endpoint, { value, deliver: () => resolve(value) }) })
          }
          return value
        },
      }
      const browser = await createBrowserFixture(intercepted)
      try {
        const viewA1 = browser.mount(sessionA.id)
        await screen.findByText(translate('kind.f2'))
        await waitFor(() => {
          expect(viewA1.container.querySelector('[data-correction-history]')).toBeNull()
          expect(viewA1.container.querySelector('[data-correction-next-check]')).toBeNull()
          expect(delayed.size).toBe(2)
        })
        expect(delayed.get(CORRECTION_HISTORICAL_CONTEXT_ENDPOINT)?.value).toMatchObject({
          ok: true, value: { kind: 'VIEW', sessionId: sessionA.id, findingKind: 'POSTCONDITION_NOT_SATISFIED' },
        })
        expect(delayed.get(CORRECTION_NEXT_CHECK_ENDPOINT)?.value).toMatchObject({
          ok: true, value: { kind: 'VIEW', sessionId: sessionA.id, findingKind: 'POSTCONDITION_NOT_SATISFIED' },
        })
        const findingA = host.ctx.get('riskAdvisorLiveCorrection').forSession(sessionA).findings[0]
        expect(findingA).toBeDefined()
        for (const endpoint of deferredAEndpoints) {
          expect(rpcTrace).toContainEqual(expect.objectContaining({
            endpoint, sessionId: sessionA.id, findingId: findingA!.findingId, kind: 'VIEW',
          }))
        }

        const viewB = browser.mount(sessionB.id)
        await waitFor(async () => {
          const read = await host.readOnlineCorrection(sessionB.id) as {
            readonly ok: boolean; readonly value?: { readonly kind: string; readonly view?: { readonly findings: readonly unknown[] } }
          }
          expect(read).toMatchObject({ ok: true, value: { kind: 'VIEW', view: { findings: [] } } })
          expect(viewB.container.querySelector('[data-advisory-kind]')).toBeNull()
          expect(viewB.container.querySelector('[data-correction-history]')).toBeNull()
          expect(viewB.container.querySelector('[data-correction-next-check]')).toBeNull()
        })

        const generationAfterReplacement = browser.replaceGeneration()
        expect(generationAfterReplacement).toBe(2)
        await waitFor(() => {
          expect(viewB.container.querySelector('[data-advisory-kind]')).toBeNull()
          expect(viewB.container.querySelector('[data-correction-history]')).toBeNull()
          expect(viewB.container.querySelector('[data-correction-next-check]')).toBeNull()
        })

        for (const response of delayed.values()) response.deliver()
        await flush()
        expect(viewB.container.querySelector('[data-advisory-kind]')).toBeNull()
        expect(viewB.container.querySelector('[data-correction-history]')).toBeNull()
        expect(viewB.container.querySelector('[data-correction-next-check]')).toBeNull()

        const viewA2 = browser.mount(sessionA.id)
        await screen.findByText(translate('kind.f2'))
        await waitFor(() => {
          expect(viewA2.container.querySelectorAll('[data-advisory-kind="POSTCONDITION_NOT_SATISFIED"]')).toHaveLength(1)
          expect(viewA2.container.querySelector('[data-correction-history]')).toBeNull()
          expect(viewA2.container.querySelector('[data-correction-next-check]')).not.toBeNull()
        }, { timeout: 5000, interval: 20 })
        expect(viewA2.container.textContent).not.toContain(translate('history.label'))
        expect(viewA2.container.textContent).toContain(translate('nextCheck.inspectWrite'))
        const currentFinding = host.ctx.get('riskAdvisorLiveCorrection').forSession(sessionA).findings[0]
        expect(currentFinding).toBeDefined()
        const currentHistorical = await host.readHistoricalContext(sessionA.id, currentFinding!.findingId) as {
          readonly ok: boolean; readonly value?: { readonly kind: string; readonly sessionId?: string; readonly findingId?: string }
        }
        expect(currentHistorical).toMatchObject({ ok: true, value: {
          kind: 'NOT_FOUND', sessionId: sessionA.id, findingId: currentFinding!.findingId,
        } })
        expect(host.ctx.get('riskAdvisorPatterns').current(host.history.patternId)?.state).toBe('INVALIDATED')
        expect(rpcTrace).toContainEqual(expect.objectContaining({
          endpoint: CORRECTION_HISTORICAL_CONTEXT_ENDPOINT,
          sessionId: sessionA.id,
          findingId: currentFinding!.findingId,
          kind: 'NOT_FOUND',
        }))
      } finally {
        await browser.close()
      }
    } finally {
      await host.close()
    }
  })
})
