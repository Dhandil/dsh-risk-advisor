import { Context } from '@deepseek-ai/cordis'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import type SessionStore from '@deepseek-ai/dsh-session'
import type { Session } from '@deepseek-ai/dsh-session'
import { LocaleRuntime } from '@deepseek-ai/dsh-client-locale/client'
import { SlotRegistry } from '@deepseek-ai/dsh-client-ui-renderer/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { apply as applyClient, inject as clientInject } from '../src/client/index.ts'
import { OnlineCorrectionDock, renderOnlineCorrectionAdvisory } from '../src/client/OnlineCorrectionDock.tsx'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { createOnlineCorrectionBridgeClient } from '../src/client/online-correction-bridge.ts'
import { OnlineCorrectionClient } from '../src/client/online-correction-client.ts'
import { onlineCorrectionEn, onlineCorrectionZh } from '../src/client/online-correction-locales.ts'
import { OnlineCorrectionStore } from '../src/client/online-correction-store.ts'
import type { OnlineCorrectionBridgeClient } from '../src/client/online-correction-bridge.ts'
import {
  ONLINE_CORRECTION_ENDPOINT,
  ONLINE_CORRECTION_ROUTE,
  parseOnlineCorrectionRead,
  parseOnlineCorrectionRequest,
  type BrowserOnlineCorrectionFindingV1,
  type BrowserOnlineCorrectionViewV1,
} from '../src/online-correction-contract.ts'
import { handleOnlineCorrectionRpc } from '../src/host/online-correction-bridge.ts'
import { LiveCorrectionRuntime, liveCorrectionFindingId } from '../src/host/live-correction.ts'
import type { FailureChainSummary } from '../src/host/retry-escalation.ts'
import type { VerificationRecordV1 } from '../src/host/verification-store.ts'

const session = (id: string): Session => ({ id, header: { cwd: '/private/path/sentinel' } }) as unknown as Session
const f1Text = 'The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.'
const f2Text = 'The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.'

function browserFinding(
  kind: BrowserOnlineCorrectionFindingV1['kind'] = 'REPEATED_FAILURE_WITHOUT_PROGRESS',
  observedAt = 1,
  suffix = 'a',
): BrowserOnlineCorrectionFindingV1 {
  const f1 = kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS'
  return Object.freeze({
    findingId: `ra-correction-v1_${suffix.repeat(64)}`,
    kind,
    diagnosis: f1 ? 'REPEATED_SAME_SIGNATURE_FAILURE' : 'VERIFIED_POSTCONDITION_MISMATCH',
    disposition: 'ADVISE',
    advisoryCode: f1 ? 'STOP_EXACT_RETRY_PATH_V1' : 'INSPECT_UNSATISFIED_POSTCONDITION_V1',
    observedAt,
  })
}

function browserView(overrides: Partial<BrowserOnlineCorrectionViewV1> = {}): BrowserOnlineCorrectionViewV1 {
  return Object.freeze({
    schemaVersion: 1,
    sessionId: 'session-1',
    findings: Object.freeze([]),
    truncated: false,
    reasonCodes: Object.freeze([]),
    ...overrides,
  })
}

function failureSummary(executionId: string): FailureChainSummary {
  return Object.freeze({
    executionId,
    status: 'READY',
    retryOf: 'prior',
    retryCount: 1,
    recentFailureCount: 2,
    sameRootCause: true,
    permissionEscalation: false,
    truncated: false,
    reasonCodes: Object.freeze([]),
    recent: Object.freeze([]),
  })
}

function mismatch(executionId: string, observedAt = 2): VerificationRecordV1 {
  return Object.freeze({
    schemaVersion: 1,
    executionId,
    adapterId: 'tool.write.v1',
    source: 'tool-contract',
    status: 'MISMATCHED',
    semanticSuccess: false,
    evidenceQuality: 'high',
    reasonCodes: Object.freeze(['POSTCONDITION_MISMATCH']),
    observedAt,
    durationMs: 1,
  })
}

function verificationConflict(executionId: string): VerificationRecordV1 {
  return Object.freeze({
    ...mismatch(executionId),
    status: 'UNKNOWN',
    semanticSuccess: 'unknown',
    evidenceQuality: 'low',
    reasonCodes: Object.freeze(['VERIFICATION_CONFLICT']),
  })
}

function execution(owner: Session, id: string, command: string): never {
  return {
    callId: `call-${id}`,
    rootCallId: `call-${id}`,
    name: 'bash',
    arguments: {
      command,
      args: 'private-args-sentinel',
      path: '/private/path/sentinel',
      cwd: '/private/cwd/sentinel',
      fileContent: 'file-content-sentinel',
      stdout: 'stdout-sentinel',
      stderr: 'stderr-sentinel',
      result: 'result-body-sentinel',
      approvalJustification: 'approval-justification-sentinel',
      prompt: 'private-model-prompt-sentinel',
      userContent: 'user-content-sentinel',
      modelContent: 'model-content-sentinel',
      credential: 'credential-sentinel',
    },
    agent: { session: owner },
    signal: new AbortController().signal,
    token: Symbol(id),
  } as never
}

function sessionStore(existing: Session | undefined): SessionStore {
  return { get: (id: string) => id === existing?.id ? existing : undefined } as unknown as SessionStore
}

function hostView(result: Awaited<ReturnType<typeof handleOnlineCorrectionRpc>>): BrowserOnlineCorrectionViewV1 {
  expect(result.ok).toBe(true)
  if (!result.ok) throw new Error('expected successful online-correction bridge read')
  const parsed = parseOnlineCorrectionRead(result.value)
  expect(parsed?.kind).toBe('VIEW')
  if (parsed?.kind !== 'VIEW') throw new Error('expected VIEW')
  return parsed.view
}

function makeManualTimers() {
  let nextId = 0
  const callbacks = new Map<number, () => void>()
  return {
    options: {
      setTimer: (callback: () => void) => {
        const id = ++nextId
        callbacks.set(id, callback)
        return id as unknown as ReturnType<typeof setTimeout>
      },
      clearTimer: (timer: ReturnType<typeof setTimeout>) => { callbacks.delete(timer as unknown as number) },
    },
    runNext: () => {
      const entry = callbacks.entries().next().value as [number, () => void] | undefined
      if (entry === undefined) return false
      callbacks.delete(entry[0])
      entry[1]()
      return true
    },
    count: () => callbacks.size,
  }
}

function makeGeneration(initial = 1) {
  let snapshot = initial
  const listeners = new Set<() => void>()
  const unsubscribes = vi.fn((listener: () => void) => { listeners.delete(listener) })
  const subscribe = vi.fn((listener: () => void) => {
    listeners.add(listener)
    return () => { unsubscribes(listener) }
  })
  return {
    service: { getSnapshot: () => snapshot, subscribe },
    set(next: number) {
      snapshot = next
      for (const listener of [...listeners]) listener()
    },
    active: () => listeners.size,
    subscribe,
    unsubscribes,
  }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
  await Promise.resolve()
}

function tFor(locale: 'en' | 'zh' = 'en') {
  const dictionary = locale === 'en' ? onlineCorrectionEn : onlineCorrectionZh
  return ((key: keyof typeof onlineCorrectionEn, params?: Record<string, unknown>) => {
    let value = dictionary[key]
    for (const [name, replacement] of Object.entries(params ?? {})) value = value.replaceAll(`{${name}}`, String(replacement))
    return value
  }) as never
}

function renderDock(client: OnlineCorrectionClient, sessionId = 'session-1', locale: 'en' | 'zh' = 'en') {
  return render(<OnlineCorrectionDock
    sessionId={sessionId as never}
    session={{} as never}
    input={{} as never}
    useSession={(() => ({}) as never) as never}
    useProjection={(() => undefined) as never}
    useSessions={(() => ({})) as never}
    useSessionStatus={(() => ({})) as never}
    useSessionRetainInfo={(() => ({})) as never}
    onlineCorrectionClient={client}
    t={tFor(locale)}
  />)
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('Phase 12.2 User Advisory Surface U1-U22', () => {
  it('U1 parses and freezes valid F1 and F2 browser DTOs', () => {
    const parsed = parseOnlineCorrectionRead({
      kind: 'VIEW',
      view: browserView({ findings: [browserFinding('REPEATED_FAILURE_WITHOUT_PROGRESS', 1, 'a'), browserFinding('POSTCONDITION_NOT_SATISFIED', 2, 'b')] }),
    })
    expect(parsed?.kind).toBe('VIEW')
    if (parsed?.kind !== 'VIEW') return
    expect(Object.isFrozen(parsed)).toBe(true)
    expect(Object.isFrozen(parsed.view)).toBe(true)
    expect(Object.isFrozen(parsed.view.findings)).toBe(true)
    expect(Object.isFrozen(parsed.view.findings[0])).toBe(true)
    expect(parsed.view.findings.map(item => item.kind)).toEqual(['REPEATED_FAILURE_WITHOUT_PROGRESS', 'POSTCONDITION_NOT_SATISFIED'])
  })

  it('U2 rejects extra keys, bad enums/IDs, cross-field mismatches, bad timestamps, and more than 64 findings', () => {
    const good = browserView({ findings: [browserFinding()] })
    expect(parseOnlineCorrectionRequest({ sessionId: 's', extra: true })).toBeUndefined()
    expect(parseOnlineCorrectionRead({ kind: 'NOT_FOUND', extra: true })).toBeUndefined()
    expect(parseOnlineCorrectionRead({ kind: 'VIEW', view: { ...good, extra: true } })).toBeUndefined()
    expect(parseOnlineCorrectionRead({ kind: 'VIEW', view: browserView({ findings: [{ ...browserFinding(), findingId: 'bad-id' }] }) })).toBeUndefined()
    expect(parseOnlineCorrectionRead({ kind: 'VIEW', view: browserView({ findings: [{ ...browserFinding(), kind: 'POSTCONDITION_NOT_SATISFIED' }] }) })).toBeUndefined()
    expect(parseOnlineCorrectionRead({ kind: 'VIEW', view: browserView({ findings: [{ ...browserFinding(), observedAt: Number.NaN }] }) })).toBeUndefined()
    expect(parseOnlineCorrectionRead({ kind: 'VIEW', view: browserView({ truncated: true }) })).toBeUndefined()
    expect(parseOnlineCorrectionRead({ kind: 'VIEW', view: browserView({ truncated: true, reasonCodes: ['SESSION_TRUNCATED'] }) })?.kind).toBe('VIEW')
    const tooMany = Array.from({ length: 65 }, (_, index) => Object.freeze({
      ...browserFinding(),
      findingId: `ra-correction-v1_${index.toString(16).padStart(64, '0')}`,
      observedAt: index,
    }))
    expect(parseOnlineCorrectionRead({ kind: 'VIEW', view: browserView({ findings: tooMany }) })).toBeUndefined()
  })

  it('U3 excludes privacy sentinels and all internal execution/verifier fields from the browser DTO', async () => {
    const owner = session('session-1')
    const runtime = new LiveCorrectionRuntime()
    runtime.observeSettledResult(execution(owner, 'privacy-execution-sentinel', 'command-sentinel --secret secret-sentinel'), 'privacy-execution-sentinel', failureSummary('privacy-execution-sentinel'))
    const view = hostView(await handleOnlineCorrectionRpc(sessionStore(owner), runtime.diagnostics, ONLINE_CORRECTION_ENDPOINT, { sessionId: 'session-1' }, new AbortController().signal))
    const serialized = JSON.stringify(view)
    for (const sentinel of [
      'command-sentinel', 'secret-sentinel', 'private-args-sentinel', '/private/path/sentinel', '/private/cwd/sentinel',
      'file-content-sentinel', 'stdout-sentinel', 'stderr-sentinel', 'result-body-sentinel',
      'approval-justification-sentinel', 'private-model-prompt-sentinel', 'user-content-sentinel',
      'model-content-sentinel', 'credential-sentinel', 'privacy-execution-sentinel',
      'executionId', 'verifierAdapterId', 'approvalId',
    ]) {
      expect(serialized).not.toContain(sentinel)
    }
    expect(Object.keys(view.findings[0]).sort()).toEqual(['advisoryCode', 'diagnosis', 'disposition', 'findingId', 'kind', 'observedAt'].sort())
    runtime.dispose()
  })

  it('U4 reads only current diagnostics for the requested live Session', async () => {
    const current = session('session-1')
    const other = session('session-2')
    const runtime = new LiveCorrectionRuntime()
    runtime.observeSettledResult(execution(current, 'current', 'pnpm test'), 'current', failureSummary('current'))
    runtime.observeSettledResult(execution(other, 'other', 'pnpm build'), 'other', failureSummary('other'))
    const view = hostView(await handleOnlineCorrectionRpc(sessionStore(current), runtime.diagnostics, ONLINE_CORRECTION_ENDPOINT, { sessionId: 'session-1' }, new AbortController().signal))
    expect(view.sessionId).toBe('session-1')
    expect(view.findings).toHaveLength(1)
    expect(view.findings[0].findingId).toBe(liveCorrectionFindingId('current', 'REPEATED_FAILURE_WITHOUT_PROGRESS'))
    runtime.dispose()
  })

  it('U5 returns NOT_FOUND for a missing Session and rejects a missing/extra request field', async () => {
    const runtime = new LiveCorrectionRuntime()
    const result = await handleOnlineCorrectionRpc(sessionStore(undefined), runtime.diagnostics, ONLINE_CORRECTION_ENDPOINT, { sessionId: 'gone' }, new AbortController().signal)
    expect(result).toEqual({ ok: true, value: { kind: 'NOT_FOUND' } })
    const invalid = await handleOnlineCorrectionRpc(sessionStore(undefined), runtime.diagnostics, ONLINE_CORRECTION_ENDPOINT, { sessionId: 'gone', callId: 'not-allowed' }, new AbortController().signal)
    expect(invalid.ok).toBe(false)
    runtime.dispose()
  })

  it('U6 keeps the correction route independent of Approval/Risk coordinator and approval endpoints', async () => {
    const bridge = await readFile(join(process.cwd(), 'src/host/online-correction-bridge.ts'), 'utf8')
    const hostIndex = await readFile(join(process.cwd(), 'src/index.ts'), 'utf8')
    expect(bridge).not.toContain('ApprovalAssessmentCoordinator')
    expect(bridge).not.toContain('RiskEngine')
    expect(bridge).toContain("path: ONLINE_CORRECTION_ROUTE")
    expect(hostIndex).toContain('installRiskAdvisorBrowserBridge(bridgeCtx, connection, assessments, runtimeRisk)')
    expect(hostIndex).toContain('installOnlineCorrectionBrowserBridge(bridgeCtx, connection as OnlineCorrectionHostConnectionLike, liveCorrection.diagnostics)')
  })

  it('U7 maps a truncated Session diagnostic to SESSION_TRUNCATED', async () => {
    const owner = session('session-1')
    const runtime = new LiveCorrectionRuntime({ maxAssociations: 1 })
    runtime.observeSettledResult(execution(owner, 'one', 'one'), 'one', undefined)
    runtime.observeSettledResult(execution(owner, 'two', 'two'), 'two', failureSummary('two'))
    const view = hostView(await handleOnlineCorrectionRpc(sessionStore(owner), runtime.diagnostics, ONLINE_CORRECTION_ENDPOINT, { sessionId: 'session-1' }, new AbortController().signal))
    expect(view.truncated).toBe(true)
    expect(view.reasonCodes).toContain('SESSION_TRUNCATED')
    runtime.dispose()
  })

  it('U8 maps saturation and keeps all suppressed F2 Findings out of the DTO', async () => {
    const owner = session('session-1')
    const runtime = new LiveCorrectionRuntime()
    runtime.observeSettledResult(execution(owner, 'f2-live', 'write'), 'f2-live', undefined)
    runtime.observeVerification(mismatch('f2-live'))
    for (let index = 0; index < 257; index += 1) runtime.observeVerification(verificationConflict(`conflict-${index}`))
    expect(runtime.diagnostics.status()).toEqual({ f2Availability: 'SATURATED' })
    expect(Object.keys(runtime.diagnostics.status())).toEqual(['f2Availability'])
    const view = hostView(await handleOnlineCorrectionRpc(sessionStore(owner), runtime.diagnostics, ONLINE_CORRECTION_ENDPOINT, { sessionId: 'session-1' }, new AbortController().signal))
    expect(view.reasonCodes).toContain('F2_SIGNAL_SATURATED')
    expect(view.findings.some(item => item.kind === 'POSTCONDITION_NOT_SATISFIED')).toBe(false)
    runtime.dispose()
  })

  it('U9 renders byte-identical fixed F1/F2 bodies to the Phase 12.1 Host renderer', () => {
    const owner = session('session-1')
    const runtime = new LiveCorrectionRuntime()
    runtime.observeSettledResult(execution(owner, 'f1', 'repeat'), 'f1', failureSummary('f1'))
    runtime.observeSettledResult(execution(owner, 'f2', 'write'), 'f2', undefined)
    runtime.observeVerification(mismatch('f2'))
    const f1 = runtime.diagnostics.forExecution('f1')[0]
    const f2 = runtime.diagnostics.forExecution('f2')[0]
    expect(renderOnlineCorrectionAdvisory(f1.advisoryCode)).toBe(runtime.diagnostics.render(f1.findingId))
    expect(renderOnlineCorrectionAdvisory(f2.advisoryCode)).toBe(runtime.diagnostics.render(f2.findingId))
    expect(renderOnlineCorrectionAdvisory(f1.advisoryCode)).toBe(f1Text)
    expect(renderOnlineCorrectionAdvisory(f2.advisoryCode)).toBe(f2Text)
    runtime.dispose()
  })

  it('U10 fails closed for malformed Host carrier and malformed view data', async () => {
    const malformed = createOnlineCorrectionBridgeClient({ call: async () => ({ ok: true, value: { kind: 'VIEW', view: { schemaVersion: 1 } } }) })
    const extraCarrier = createOnlineCorrectionBridgeClient({ call: async () => ({ ok: true, value: { kind: 'NOT_FOUND' }, extra: true }) })
    expect(await malformed.read('session-1')).toEqual({ kind: 'UNAVAILABLE', reason: 'PROTOCOL_INVALID' })
    expect(await extraCarrier.read('session-1')).toEqual({ kind: 'UNAVAILABLE', reason: 'PROTOCOL_INVALID' })
  })

  it('U11 starts polling while retained and aborts/stops polling on release or disposal', async () => {
    const timers = makeManualTimers()
    let seenSignal: AbortSignal | undefined
    const bridge: OnlineCorrectionBridgeClient = {
      read: vi.fn((_sessionId, signal) => new Promise(resolve => {
        seenSignal = signal
        signal?.addEventListener('abort', () => resolve({ kind: 'UNAVAILABLE', reason: 'CANCELLED' }), { once: true })
      })),
    }
    const store = new OnlineCorrectionStore(bridge, 'session-1', undefined, timers.options)
    store.start()
    await flushMicrotasks()
    expect(bridge.read).toHaveBeenCalledTimes(1)
    expect(seenSignal?.aborted).toBe(false)
    store.stop()
    expect(seenSignal?.aborted).toBe(true)
    expect(timers.count()).toBe(0)
    store.dispose()
  })

  it('U12 enforces one physical in-flight read and ignores a stale response after connection reset', async () => {
    let generation = 1
    const listeners = new Set<() => void>()
    const pending: Array<{ resolve: (result: Awaited<ReturnType<OnlineCorrectionBridgeClient['read']>>) => void; signal?: AbortSignal }> = []
    let active = 0
    let maxActive = 0
    const bridge: OnlineCorrectionBridgeClient = {
      read: vi.fn((_sessionId, signal) => new Promise(resolve => {
        active += 1
        maxActive = Math.max(maxActive, active)
        pending.push({ resolve: result => { active -= 1; resolve(result) }, signal })
      })),
    }
    const connection = {
      rpc: { call: async () => ({}) },
      generation: {
        getSnapshot: () => generation,
        subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) },
      },
    }
    const store = new OnlineCorrectionStore(bridge, 'session-1', connection, makeManualTimers().options)
    store.start()
    expect(pending).toHaveLength(1)
    generation = 2
    for (const listener of listeners) listener()
    expect(pending[0].signal?.aborted).toBe(true)
    expect(pending).toHaveLength(1)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    pending[0].resolve({ kind: 'VIEW', view: browserView({ findings: [browserFinding()] }) })
    await flushMicrotasks()
    expect(pending).toHaveLength(2)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    pending[1].resolve({ kind: 'VIEW', view: browserView({ findings: [browserFinding('POSTCONDITION_NOT_SATISFIED', 2, 'b')] }) })
    await flushMicrotasks()
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW', view: { findings: [{ kind: 'POSTCONDITION_NOT_SATISFIED' }] } })
    expect(maxActive).toBe(1)
    store.dispose()
  })

  it('U13 deduplicates semantically identical poll snapshots', async () => {
    const timers = makeManualTimers()
    const bridge: OnlineCorrectionBridgeClient = { read: vi.fn(async () => ({ kind: 'VIEW', view: browserView({ findings: [browserFinding()] }) })) }
    const store = new OnlineCorrectionStore(bridge, 'session-1', undefined, timers.options)
    const listener = vi.fn()
    store.subscribe(listener)
    store.start()
    await flushMicrotasks()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(timers.runNext()).toBe(true)
    await flushMicrotasks()
    expect(listener).toHaveBeenCalledTimes(1)
    store.dispose()
  })

  it('U14 renders no DOM when the current view contains no Findings or degradation reason', async () => {
    const call = vi.fn(async () => ({ ok: true, value: { kind: 'VIEW', view: browserView() } }))
    const client = new OnlineCorrectionClient({ rpc: { call } })
    const view = renderDock(client)
    await waitFor(() => expect(call).toHaveBeenCalledTimes(1))
    expect(view.container.querySelector('[data-online-correction-dock]')).toBeNull()
    client.dispose()
  })

  it('U15 labels visible content as execution advisory and exposes neither approval controls nor risk verdict', async () => {
    const client = new OnlineCorrectionClient({ rpc: { call: async () => ({ ok: true, value: { kind: 'VIEW', view: browserView({ findings: [browserFinding()] }) } }) } })
    renderDock(client)
    expect(await screen.findByText('Execution advisory')).toBeTruthy()
    expect(screen.getByText(f1Text)).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.queryByText(/approval decision|risk verdict|permission request/i)).toBeNull()
    client.dispose()
  })

  it('U16 sorts newest-first deterministically, shows only three, and reports overflow count', async () => {
    const findings = [
      browserFinding('REPEATED_FAILURE_WITHOUT_PROGRESS', 1, 'a'),
      browserFinding('POSTCONDITION_NOT_SATISFIED', 4, 'b'),
      browserFinding('REPEATED_FAILURE_WITHOUT_PROGRESS', 2, 'c'),
      browserFinding('POSTCONDITION_NOT_SATISFIED', 3, 'd'),
    ]
    const client = new OnlineCorrectionClient({ rpc: { call: async () => ({ ok: true, value: { kind: 'VIEW', view: browserView({ findings }) } }) } })
    const result = renderDock(client)
    await screen.findByText('Execution advisory')
    const rows = [...result.container.querySelectorAll('[data-advisory-kind]')]
    expect(rows).toHaveLength(3)
    expect(rows.map(row => row.getAttribute('data-advisory-kind'))).toEqual([
      'POSTCONDITION_NOT_SATISFIED', 'POSTCONDITION_NOT_SATISFIED', 'REPEATED_FAILURE_WITHOUT_PROGRESS',
    ])
    expect(screen.getByText('1 additional live advisories')).toBeTruthy()
    client.dispose()
  })

  it('U17 renders one neutral degradation line when truncation and saturation are both present', async () => {
    const client = new OnlineCorrectionClient({ rpc: { call: async () => ({ ok: true, value: { kind: 'VIEW', view: browserView({ truncated: true, reasonCodes: ['SESSION_TRUNCATED', 'F2_SIGNAL_SATURATED'] }) } }) } })
    const result = renderDock(client, 'session-1', 'zh')
    await screen.findByText('执行建议')
    expect(screen.getAllByText('部分执行建议可能未显示。')).toHaveLength(1)
    expect(result.container.querySelectorAll('[data-advisory-kind]')).toHaveLength(0)
    client.dispose()
  })

  it('U18 keeps Online Correction at order 10 and registers Risk Awareness at order 20 outside approval detail', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)
    ctx.provide('connection', { rpc: { call: async () => ({ ok: true, value: { kind: 'NOT_FOUND' } }) } })
    ctx.slots.register({
      name: 'root',
      children: {
        'conversation.input.dock': { kind: 'list', scope: 'session' },
        'conversation.approval.detail': { kind: 'single', scope: 'session' },
      },
    }, () => null)
    ctx.slots.register({ name: 'conversation.input.dock', id: 'queue', order: 20 }, () => null)
    ctx.slots.register({ name: 'conversation.approval.detail', id: 'native-detail', priority: 0 }, () => null)
    const fiber = ctx.plugin({ inject: [...clientInject], apply: applyClient })
    await fiber.await()
    const dock = ctx.slots.entriesOfSlot('conversation.input.dock')
    expect(dock.some(entry => entry.options.id === 'risk-advisor-online-correction' && entry.options.order === 10)).toBe(true)
    expect(dock.some(entry => entry.options.id === 'risk-advisor-runtime-risk-awareness' && entry.options.order === 20)).toBe(true)
    expect(dock.some(entry => entry.options.id === 'queue' && entry.options.order === 20)).toBe(true)
    expect(ctx.slots.entriesOfSlot('conversation.approval.detail').some(entry => entry.options.id === 'risk-advisor-online-correction')).toBe(false)
    await fiber.dispose()
    await ctx.fiber.dispose()
  })

  it('U19 has no mutation endpoint or user action controls in the bridge/store/dock', async () => {
    const [bridge, store, dock] = await Promise.all([
      readFile(join(process.cwd(), 'src/host/online-correction-bridge.ts'), 'utf8'),
      readFile(join(process.cwd(), 'src/client/online-correction-store.ts'), 'utf8'),
      readFile(join(process.cwd(), 'src/client/OnlineCorrectionDock.tsx'), 'utf8'),
    ])
    expect(bridge.match(/path:\s*ONLINE_CORRECTION_ROUTE/g)).toHaveLength(1)
    expect(bridge).not.toMatch(/dismiss|approve|reject|retry|replan|cancelRun/i)
    expect(store).not.toMatch(/localStorage|indexedDB/i)
    expect(store).not.toMatch(/\b(?:write|mutate)\s*\(/i)
    expect(dock).not.toContain('<button')
  })

  it('U20 clears a prior Finding when a later live read returns NOT_FOUND', async () => {
    const timers = makeManualTimers()
    let reads = 0
    const bridge: OnlineCorrectionBridgeClient = {
      read: vi.fn(async () => ++reads === 1
        ? { kind: 'VIEW', view: browserView({ findings: [browserFinding()] }) }
        : { kind: 'NOT_FOUND' }),
    }
    const store = new OnlineCorrectionStore(bridge, 'session-1', undefined, timers.options)
    store.start()
    await flushMicrotasks()
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW' })
    timers.runNext()
    await flushMicrotasks()
    expect(store.getSnapshot()).toEqual({ status: 'NOT_FOUND' })
    store.dispose()
  })

  it('U21 coexists with QueueDock and leaves the approval surface registered independently', async () => {
    const ctx = new Context()
    await ctx.plugin(SlotRegistry).await()
    const locale = new LocaleRuntime(ctx)
    ctx.provide('locale', locale)
    ctx.provide('connection', { rpc: { call: async () => ({ ok: true, value: { kind: 'NOT_FOUND' } }) } })
    ctx.slots.register({
      name: 'root',
      children: {
        'conversation.input.dock': { kind: 'list', scope: 'session' },
        'conversation.approval.detail': { kind: 'single', scope: 'session' },
      },
    }, () => null)
    const queueEntry = ctx.slots.register({ name: 'conversation.input.dock', id: 'queue', order: 20 }, () => null)
    const fiber = ctx.plugin({ inject: [...clientInject], apply: applyClient })
    await fiber.await()
    expect(ctx.slots.entriesOfSlot('conversation.input.dock').map(entry => entry.options.id)).toEqual(['risk-advisor-online-correction', 'queue', 'risk-advisor-runtime-risk-awareness'])
    expect(ctx.slots.entriesOfSlot('conversation.approval.detail').some(entry => entry.component === RiskAdvisorDetail)).toBe(true)
    expect(ctx.slots.entriesOfSlot('conversation.approval.detail').some(entry => entry.component === OnlineCorrectionDock)).toBe(false)
    await fiber.dispose()
    queueEntry()
    await ctx.fiber.dispose()
  })

  it('U22 keeps Pattern/Guidance, LLM/Judge, and Agent/model context outside correction bridge/client modules', async () => {
    const files = [
      'src/host/online-correction-bridge.ts',
      'src/client/online-correction-bridge.ts',
      'src/client/online-correction-store.ts',
      'src/client/online-correction-client.ts',
      'src/client/OnlineCorrectionDock.tsx',
    ]
    const source = (await Promise.all(files.map(file => readFile(join(process.cwd(), file), 'utf8')))).join('\n')
    expect(source).not.toMatch(/pattern-store|guidance-store|deep-judge|fast-judge|\bllm\b|\bmodel\b|subagent|agent context/i)
    expect(source).toContain('ONLINE_CORRECTION_ROUTE')
    expect(source).toContain('conversation')
  })
})

describe('Phase 12.2 Repair1 Client lifecycle L1-L9', () => {
  it('L1 returns one stable Store source per sessionId', () => {
    const client = new OnlineCorrectionClient({ rpc: { call: async () => ({ ok: true, value: { kind: 'NOT_FOUND' } }) } })
    expect(client.getSource('session-a')).toBe(client.getSource('session-a'))
    expect(client.getSource('session-a')).not.toBe(client.getSource('session-b'))
    client.dispose()
  })

  it('L2 getSource is render-pure and installs no poll or generation subscription', () => {
    const call = vi.fn(async () => ({ ok: true, value: { kind: 'NOT_FOUND' } }))
    const generation = makeGeneration()
    const client = new OnlineCorrectionClient({ rpc: { call }, generation: generation.service })
    const store = client.getSource('session-a')
    expect(client.getSource('session-a')).toBe(store)
    expect(call).not.toHaveBeenCalled()
    expect(generation.subscribe).not.toHaveBeenCalled()
    expect(generation.active()).toBe(0)
    client.dispose()
  })

  it('L3 first retain starts once; final release aborts, stops, unsubscribes, and clears the view', async () => {
    vi.useFakeTimers()
    const generation = makeGeneration()
    let calls = 0
    let pendingSignal: AbortSignal | undefined
    const call = vi.fn(async (_channel: string, _endpoint: string, _payload: unknown, signal?: AbortSignal) => {
      calls += 1
      if (calls === 1) return { ok: true, value: { kind: 'VIEW', view: browserView({ sessionId: 'session-a', findings: [browserFinding()] }) } }
      pendingSignal = signal
      return await new Promise(resolve => signal?.addEventListener('abort', () => resolve({ ok: true, value: { kind: 'NOT_FOUND' } }), { once: true }))
    })
    const client = new OnlineCorrectionClient({ rpc: { call }, generation: generation.service })
    const store = client.getSource('session-a')
    client.retain('session-a')
    await flushMicrotasks()
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW' })
    expect(generation.subscribe).toHaveBeenCalledTimes(1)
    expect(generation.active()).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
    await vi.advanceTimersByTimeAsync(1000)
    expect(call).toHaveBeenCalledTimes(2)
    client.release('session-a')
    expect(pendingSignal?.aborted).toBe(true)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(generation.active()).toBe(0)
    expect(generation.unsubscribes).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
    await flushMicrotasks()
    client.dispose()
  })

  it('L4 duplicate retain calls share one poll/subscription and only final release stops them', async () => {
    vi.useFakeTimers()
    const generation = makeGeneration()
    const call = vi.fn(async () => ({ ok: true, value: { kind: 'VIEW', view: browserView({ sessionId: 'session-a', findings: [browserFinding()] }) } }))
    const client = new OnlineCorrectionClient({ rpc: { call }, generation: generation.service })
    const store = client.getSource('session-a')
    client.retain('session-a')
    client.retain('session-a')
    await flushMicrotasks()
    expect(call).toHaveBeenCalledTimes(1)
    expect(generation.subscribe).toHaveBeenCalledTimes(1)
    expect(generation.active()).toBe(1)
    client.release('session-a')
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW' })
    expect(generation.active()).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
    client.release('session-a')
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(generation.active()).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
    client.dispose()
  })

  it('L5 re-retain restarts the same Store with one fresh poll and generation subscription', async () => {
    vi.useFakeTimers()
    const generation = makeGeneration()
    const call = vi.fn(async () => ({ ok: true, value: { kind: 'VIEW', view: browserView({ sessionId: 'session-a', findings: [browserFinding()] }) } }))
    const client = new OnlineCorrectionClient({ rpc: { call }, generation: generation.service })
    const firstSource = client.getSource('session-a')
    client.retain('session-a')
    await flushMicrotasks()
    client.release('session-a')
    expect(firstSource.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(generation.active()).toBe(0)
    generation.set(2)
    client.retain('session-a')
    await flushMicrotasks()
    expect(client.getSource('session-a')).toBe(firstSource)
    expect(call).toHaveBeenCalledTimes(2)
    expect(generation.subscribe).toHaveBeenCalledTimes(2)
    expect(generation.active()).toBe(1)
    expect(firstSource.getSnapshot()).toMatchObject({ status: 'VIEW' })
    client.release('session-a')
    client.dispose()
  })

  it('L6 keeps Session A and B Stores, refcounts, polling, and subscriptions independent', async () => {
    vi.useFakeTimers()
    const generation = makeGeneration()
    const call = vi.fn(async (_channel: string, _endpoint: string, payload: unknown) => ({
      ok: true,
      value: { kind: 'VIEW', view: browserView({ sessionId: (payload as { sessionId: string }).sessionId, findings: [browserFinding()] }) },
    }))
    const client = new OnlineCorrectionClient({ rpc: { call }, generation: generation.service })
    const storeA = client.getSource('session-a')
    const storeB = client.getSource('session-b')
    client.retain('session-a')
    await flushMicrotasks()
    expect(call.mock.calls.map(args => (args[2] as { sessionId: string }).sessionId)).toEqual(['session-a'])
    client.retain('session-b')
    await flushMicrotasks()
    expect(call.mock.calls.map(args => (args[2] as { sessionId: string }).sessionId)).toEqual(['session-a', 'session-b'])
    expect(generation.active()).toBe(2)
    client.release('session-a')
    expect(storeA.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(storeB.getSnapshot()).toMatchObject({ status: 'VIEW' })
    expect(generation.active()).toBe(1)
    expect(vi.getTimerCount()).toBe(1)
    client.release('session-b')
    client.dispose()
  })

  it('L7 Client disposal drains every active and inactive cached Store', async () => {
    vi.useFakeTimers()
    const generation = makeGeneration()
    let pendingSignal: AbortSignal | undefined
    let pendingCount = 0
    const call = vi.fn(async (_channel: string, _endpoint: string, payload: unknown, signal?: AbortSignal) => {
      if ((payload as { sessionId: string }).sessionId === 'inactive') return { ok: true, value: { kind: 'NOT_FOUND' } }
      if ((payload as { sessionId: string }).sessionId === 'timer') return { ok: true, value: { kind: 'VIEW', view: browserView({ sessionId: 'timer', findings: [browserFinding()] }) } }
      pendingSignal = signal
      pendingCount += 1
      return await new Promise(resolve => signal?.addEventListener('abort', () => {
        pendingCount -= 1
        resolve({ ok: true, value: { kind: 'NOT_FOUND' } })
      }, { once: true }))
    })
    const client = new OnlineCorrectionClient({ rpc: { call }, generation: generation.service })
    const inactive = client.getSource('inactive')
    const timerStore = client.getSource('timer')
    const pendingStore = client.getSource('pending')
    client.retain('timer')
    client.retain('pending')
    await flushMicrotasks()
    expect(timerStore.getSnapshot()).toMatchObject({ status: 'VIEW' })
    expect(pendingCount).toBe(1)
    expect(generation.active()).toBe(2)
    expect(vi.getTimerCount()).toBe(1)
    client.dispose()
    await flushMicrotasks()
    expect(inactive.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(timerStore.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(pendingStore.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(pendingSignal?.aborted).toBe(true)
    expect(pendingCount).toBe(0)
    expect(generation.active()).toBe(0)
    expect(generation.unsubscribes).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
    expect(() => client.getSource('after-dispose')).toThrow('online correction client disposed')
  })

  it('L8 keeps Dock lookup render-pure and retains/releases only in an effect', async () => {
    const source = await readFile(join(process.cwd(), 'src/client/OnlineCorrectionDock.tsx'), 'utf8')
    expect(source).toContain('onlineCorrectionClient.getSource(sessionId)')
    expect(source).toContain('onlineCorrectionClient.retain(sessionId)')
    expect(source).toContain('onlineCorrectionClient.release(sessionId)')
    expect(source).not.toContain('onlineCorrectionClient.createStore')
    expect(source).not.toContain('useMemo')
  })

  it('L9 retains all U1-U22 focused regressions for the required verification run', async () => {
    const source = await readFile(join(process.cwd(), 'tests/p12-2-online-correction.spec.tsx'), 'utf8')
    expect(source.match(/it\('U\d{1,2}\b/g)).toHaveLength(22)
  })
})
