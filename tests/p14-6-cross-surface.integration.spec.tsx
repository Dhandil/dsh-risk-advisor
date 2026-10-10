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
import { createJsonStorageFixture } from './p11-1-experience-fixtures.ts'
import { createQualifiedHistoryFixture } from './p14-2-historical-context-fixtures.ts'

type FetchRoute = { readonly path: string; readonly fetch: (request: Request) => Promise<Response> }
type Rpc = { readonly call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown> }

const routeForEndpoint = new Map([
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
  ctx.on('tools/pre-execute', (exec, next) => {
    const found = ctx.get('riskAdvisorCorrelation').lookup(exec.agent?.session, exec.callId)
    if (found.status === 'FOUND') executionId = found.executionId
    return next()
  })
  const session = ctx.sessions.create('phase14-6-integrated-session')
  session.append('turn/start', { turn: 1 })
  session.append('user/message', createUserMessage({
    content: [{ type: 'text', text: 'Read the synthetic fixture and verify the resulting file state.' }],
    source: { kind: 'user' },
  }), { surfaceOp: 'append' })
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
      // The independently observed postcondition deliberately differs from
      // the requested content. This is a deterministic Tool fixture, not a
      // provider response or a fabricated Risk Advisor Finding.
      return { path: args.file_path, operation: 'create', before: null, after: 'unexpected synthetic content' }
    },
  }))

  let closed = false
  return {
    ctx, routes, history, session,
    get executionId() { return executionId },
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
  ctx.provide('connection', { rpc, generation: { getSnapshot: () => 1, subscribe: (_listener: () => void) => () => undefined } })
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
})
