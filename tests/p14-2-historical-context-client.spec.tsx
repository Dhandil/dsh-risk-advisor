import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { BrowserRiskAssessmentV1, RuntimeRiskAwarenessReadV1 } from '../src/bridge-contract.ts'
import type { HistoricalContextReadV1 } from '../src/historical-context-contract.ts'
import { HistoricalContextClient } from '../src/client/historical-context-client.ts'
import { HistoricalContextStore, HISTORICAL_CONTEXT_MAX_FRESHNESS_MS } from '../src/client/historical-context-store.ts'
import { createHistoricalContextBridgeClient } from '../src/client/historical-context-bridge.ts'
import type { HistoricalContextBridgeClient } from '../src/client/historical-context-bridge.ts'
import { RuntimeRiskClient } from '../src/client/runtime-risk-client.ts'
import { RuntimeRiskAwarenessDock } from '../src/client/RuntimeRiskAwarenessDock.tsx'
import { runtimeRiskEn } from '../src/client/runtime-risk-locales.ts'

function historicalRead(sessionId: string, executionId: string, assessmentId: string, observedAt = Date.now()): Extract<HistoricalContextReadV1, { kind: 'VIEW' }> {
  const patternHash = 'a'.repeat(64)
  const guidanceHash = 'b'.repeat(64)
  return Object.freeze({
    schemaVersion: 1,
    kind: 'VIEW',
    sessionId,
    executionId,
    assessmentId,
    observedAt,
    historical: Object.freeze({
      guidanceId: `ra-guidance-v1_${guidanceHash}`,
      guidanceRevisionId: `ra-guidance-v1_${guidanceHash}_00000001`,
      patternId: `ra-pattern-v1_${patternHash}`,
      patternRevisionId: `ra-pattern-v1_${patternHash}_00000001`,
      patternProvenanceDigest: 'c'.repeat(64),
      evidenceStrength: 'QUALIFIED_PATTERN',
      supportCount: 3,
      supportUtcDateCount: 2,
      title: 'Verified historical pattern',
      observation: 'A qualified verified-success pattern covers 3 distinct Episodes across 2 UTC dates.',
      contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.',
      nextCheck: 'Independently verify the current target and expected postcondition.',
      authorityNotice: 'This guidance does not determine risk or grant permission or approval.',
    }),
  }) as Extract<HistoricalContextReadV1, { kind: 'VIEW' }>
}

function carrier(value: unknown) { return Object.freeze({ ok: true, value }) }

class Clockwork {
  now = 0
  readonly baseWall = Date.now()
  private serial = 0
  private readonly timers = new Map<number, { readonly at: number; readonly callback: () => void }>()
  readonly setTimer = (callback: () => void, delay: number) => {
    const id = ++this.serial
    this.timers.set(id, { at: this.now + Math.max(0, delay), callback })
    return id as unknown as ReturnType<typeof setTimeout>
  }
  readonly clearTimer = (timer: ReturnType<typeof setTimeout>) => { this.timers.delete(timer as unknown as number) }
  readonly wallClock = () => this.baseWall + this.now
  async advance(milliseconds: number): Promise<void> {
    const target = this.now + milliseconds
    for (;;) {
      const next = [...this.timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]
      if (next === undefined || next[1].at > target) break
      this.now = next[1].at
      this.timers.delete(next[0])
      next[1].callback()
      await flush()
    }
    this.now = target
    await flush()
  }
}

async function flush(): Promise<void> { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

const statusListeners = new Set<() => void>()
let statusSnapshot = new Map<string, unknown>()
function useSessionStatus<T>(selector: (snapshot: ReadonlyMap<string, unknown>) => T): T {
  const snapshot = useSyncExternalStore(listener => { statusListeners.add(listener); return () => statusListeners.delete(listener) }, () => statusSnapshot, () => statusSnapshot)
  return selector(snapshot)
}
function setPending(pending: unknown): void {
  statusSnapshot = pending === undefined ? new Map() : new Map([['p14-2-ui-session', { pendingInteraction: pending }]])
  for (const listener of [...statusListeners]) listener()
}
function translate(key: keyof typeof runtimeRiskEn): string { return runtimeRiskEn[key] }

function runtimeView(overrides: Partial<Extract<RuntimeRiskAwarenessReadV1, { kind: 'VIEW' }>> = {}): Extract<RuntimeRiskAwarenessReadV1, { kind: 'VIEW' }> {
  return Object.freeze({
    schemaVersion: 1,
    kind: 'VIEW',
    sessionId: 'p14-2-ui-session',
    executionId: 'ra-execution-p14-2-ui',
    callId: 'p14-2-ui-call',
    assessmentId: 'ra-assessment-p14-2-ui',
    timing: 'PRE_EXECUTION_EVIDENCE',
    status: 'PENDING',
    stage: 'CAPTURED',
    capturedAt: 100,
    updatedAt: 100,
    reasonCodes: Object.freeze([]),
    ...overrides,
  }) as Extract<RuntimeRiskAwarenessReadV1, { kind: 'VIEW' }>
}

function completedAssessment(assessmentId: string): BrowserRiskAssessmentV1 {
  const dimension = (verdict: string) => ({ verdict, source: 'RULE' as const, evidenceQuality: 'HIGH' as const, reasons: Object.freeze([]) })
  return Object.freeze({
    schemaVersion: 1,
    assessmentId,
    status: 'COMPLETE',
    dimensions: {
      risk: dimension('HIGH'), authorization: dimension('UNKNOWN'), necessity: dimension('UNKNOWN'),
      privilege: dimension('UNKNOWN'), alternatives: dimension('UNKNOWN'), evidenceQuality: dimension('HIGH'),
    },
    aggregate: { recommendation: 'APPROVE_WITH_CAUTION', hazardLevel: 'HIGH', attention: 'ELEVATED', primaryReasonCodes: ['HIGH_HAZARD_UNRESOLVED_CONTEXT'] },
    findings: Object.freeze([{ code: 'HIGH_HAZARD', title: 'Review the current target', detail: 'Synthetic assessment evidence.', dimension: 'RISK', severity: 'WARNING', strength: 'DETERMINISTIC' }]),
    uncertainties: Object.freeze([]),
    alternatives: Object.freeze([]),
    evidence: { ledgerHealth: 'HEALTHY' },
    judgeAssisted: false,
  }) as BrowserRiskAssessmentV1
}

function readyRuntimeView(sessionId: string, executionId: string, assessmentId: string) {
  return runtimeView({
    sessionId,
    executionId,
    assessmentId,
    status: 'READY',
    stage: 'COMPLETE',
    assessment: completedAssessment(assessmentId),
  })
}

describe('Phase 14.2 historical Client H5/H6/H7/H10', () => {
  afterEach(() => { cleanup(); setPending(undefined); vi.restoreAllMocks(); vi.useRealTimers() })

  it('H5/H10 scopes reads to exact current identity, enforces one read/second and 1.5s freshness, aborts stale replies and restarts', async () => {
    const clock = new Clockwork()
    const first = Promise.withResolvers<HistoricalContextReadV1>()
    const second = Promise.withResolvers<HistoricalContextReadV1>()
    const third = Promise.withResolvers<HistoricalContextReadV1>()
    const signals: AbortSignal[] = []
    const requests: string[] = []
    const bridge: HistoricalContextBridgeClient = {
      read: (request, signal) => {
        requests.push(request.executionId)
        if (signal !== undefined) signals.push(signal)
        return requests.length === 1 ? first.promise : requests.length === 2 ? second.promise : third.promise
      },
    }
    let connectionGeneration = 1
    const generationListeners = new Set<() => void>()
    const store = new HistoricalContextStore(bridge, 'p14-2-session', {
      rpc: { call: async () => undefined },
      generation: {
        getSnapshot: () => connectionGeneration,
        subscribe: listener => { generationListeners.add(listener); return () => generationListeners.delete(listener) },
      },
    }, { clock: () => clock.now, wallClock: clock.wallClock, setTimer: clock.setTimer, clearTimer: clock.clearTimer })
    const targetA = { sessionId: 'p14-2-session', executionId: 'ra-execution-a', assessmentId: 'ra-assessment-a' }
    const targetB = { sessionId: 'p14-2-session', executionId: 'ra-execution-b', assessmentId: 'ra-assessment-b' }
    store.setTarget(targetA)
    store.start()
    await clock.advance(0)
    expect(requests).toEqual(['ra-execution-a'])
    store.setTarget(targetB)
    expect(signals[0]?.aborted).toBe(true)
    first.resolve(historicalRead(targetA.sessionId, targetA.executionId, targetA.assessmentId, clock.wallClock()))
    await flush()
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    await clock.advance(999)
    expect(requests).toHaveLength(1)
    await clock.advance(1)
    expect(requests).toEqual(['ra-execution-a', 'ra-execution-b'])
    second.resolve(historicalRead(targetB.sessionId, targetB.executionId, targetB.assessmentId, clock.wallClock()))
    await flush()
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW', view: { executionId: targetB.executionId, assessmentId: targetB.assessmentId } })
    expect(generationListeners.size).toBe(1)

    await clock.advance(999)
    expect(requests).toHaveLength(2)
    await clock.advance(1)
    expect(requests).toHaveLength(3)
    connectionGeneration += 1
    for (const listener of [...generationListeners]) listener()
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(signals[2]?.aborted).toBe(true)
    await clock.advance(HISTORICAL_CONTEXT_MAX_FRESHNESS_MS)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    store.stop()
    expect(generationListeners.size).toBe(0)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    store.setTarget(targetB)
    store.start()
    await clock.advance(1000)
    expect(requests.length).toBeGreaterThan(3)
    store.dispose()
    expect(generationListeners.size).toBe(0)
  })

  it('H10 suppresses a delayed point-in-time Host snapshot older than the freshness budget', async () => {
    const clock = new Clockwork()
    const response = Promise.withResolvers<HistoricalContextReadV1>()
    const bridge: HistoricalContextBridgeClient = { read: () => response.promise }
    const store = new HistoricalContextStore(bridge, 'p14-2-slow-session', undefined, {
      clock: () => clock.now, wallClock: clock.wallClock, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    const target = { sessionId: 'p14-2-slow-session', executionId: 'ra-execution-slow', assessmentId: 'ra-assessment-slow' }
    store.setTarget(target)
    store.start()
    await clock.advance(0)
    const hostReadTime = clock.wallClock()
    await clock.advance(HISTORICAL_CONTEXT_MAX_FRESHNESS_MS + 1)
    response.resolve(historicalRead(target.sessionId, target.executionId, target.assessmentId, hostReadTime))
    await flush()
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    store.dispose()
  })

  it('H10 expires a delayed Host snapshot from observedAt, not response receipt', async () => {
    const clock = new Clockwork()
    const response = Promise.withResolvers<HistoricalContextReadV1>()
    const bridge: HistoricalContextBridgeClient = { read: () => response.promise }
    const store = new HistoricalContextStore(bridge, 'p14-2-near-expiry-session', undefined, {
      clock: () => clock.now, wallClock: clock.wallClock, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    const target = { sessionId: 'p14-2-near-expiry-session', executionId: 'ra-execution-near-expiry', assessmentId: 'ra-assessment-near-expiry' }
    const observedAt = clock.wallClock()
    store.setTarget(target)
    store.start()
    await clock.advance(0)
    await clock.advance(HISTORICAL_CONTEXT_MAX_FRESHNESS_MS - 1)

    response.resolve(historicalRead(target.sessionId, target.executionId, target.assessmentId, observedAt))
    await flush()
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW', view: { executionId: target.executionId } })

    await clock.advance(1)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    store.dispose()
  })

  it('H10 rejects a Host snapshot at the exact 1.5s age boundary', async () => {
    const clock = new Clockwork()
    const response = Promise.withResolvers<HistoricalContextReadV1>()
    const bridge: HistoricalContextBridgeClient = { read: () => response.promise }
    const store = new HistoricalContextStore(bridge, 'p14-2-boundary-session', undefined, {
      clock: () => clock.now, wallClock: clock.wallClock, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    const target = { sessionId: 'p14-2-boundary-session', executionId: 'ra-execution-boundary', assessmentId: 'ra-assessment-boundary' }
    const observedAt = clock.wallClock()
    store.setTarget(target)
    store.start()
    await clock.advance(0)
    await clock.advance(HISTORICAL_CONTEXT_MAX_FRESHNESS_MS)

    response.resolve(historicalRead(target.sessionId, target.executionId, target.assessmentId, observedAt))
    await flush()
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    store.dispose()
  })

  it('H6 renders unchanged Guidance beneath the single ordinary risk card and suppresses late approval responses', async () => {
    const pendingHistory = Promise.withResolvers<unknown>()
    const historySignals: AbortSignal[] = []
    let historyCalls = 0
    const rpc = async (_channel: string, endpoint: string, _payload: unknown, signal?: AbortSignal): Promise<unknown> => {
      if (endpoint === 'risk-advisor/runtime-risk') return carrier(runtimeView())
      historyCalls += 1
      if (signal !== undefined) historySignals.push(signal)
      return pendingHistory.promise
    }
    const riskClient = new RuntimeRiskClient({ rpc: { call: rpc } })
    const contextClient = new HistoricalContextClient({ rpc: { call: rpc } })
    const view = render(<RuntimeRiskAwarenessDock
      sessionId={'p14-2-ui-session' as never}
      session={{} as never} input={{} as never}
      useSession={(() => ({}) as never) as never}
      useProjection={(() => undefined) as never}
      useSessions={(() => ({})) as never}
      useSessionStatus={useSessionStatus as never}
      useSessionRetainInfo={(() => ({})) as never}
      runtimeRiskClient={riskClient}
      historicalContextClient={contextClient}
      t={translate as never}
    />)
    await vi.waitFor(() => expect(historyCalls).toBe(1))
    expect(view.container.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(view.container.querySelector('dialog')).toBeNull()
    act(() => setPending({ kind: 'approval', sessionId: 'p14-2-ui-session', key: 'approval-p14-2', callId: 'p14-2-ui-call' }))
    expect(historySignals[0]?.aborted).toBe(true)
    pendingHistory.resolve(carrier(historicalRead('p14-2-ui-session', 'ra-execution-p14-2-ui', 'ra-assessment-p14-2-ui')))
    await act(async () => { await flush() })
    expect(screen.queryByText(runtimeRiskEn.historicalSummary)).toBeNull()
    expect(view.container.querySelectorAll('[role="status"]')).toHaveLength(0)
    contextClient.dispose()
    riskClient.dispose()
  })

  it('I1 keeps history collapsed by default and reveals every original source field unchanged on disclosure', async () => {
    const rpc = async (_channel: string, endpoint: string): Promise<unknown> => endpoint === 'risk-advisor/runtime-risk'
      ? carrier(runtimeView())
      : carrier(historicalRead('p14-2-ui-session', 'ra-execution-p14-2-ui', 'ra-assessment-p14-2-ui'))
    const riskClient = new RuntimeRiskClient({ rpc: { call: rpc as never } })
    const contextClient = new HistoricalContextClient({ rpc: { call: rpc as never } })
    const view = render(<RuntimeRiskAwarenessDock
      sessionId={'p14-2-ui-session' as never}
      session={{} as never} input={{} as never}
      useSession={(() => ({}) as never) as never}
      useProjection={(() => undefined) as never}
      useSessions={(() => ({})) as never}
      useSessionStatus={useSessionStatus as never}
      useSessionRetainInfo={(() => ({})) as never}
      runtimeRiskClient={riskClient}
      historicalContextClient={contextClient}
      t={translate as never}
    />)
    await screen.findByText(runtimeRiskEn.historicalSummary)
    const disclosure = view.container.querySelector('details[aria-label]') as HTMLDetailsElement
    expect(disclosure.open).toBe(false)
    expect(disclosure.querySelectorAll('summary')).toHaveLength(1)
    expect(disclosure.querySelector('summary')?.tagName).toBe('SUMMARY')
    expect(disclosure.textContent).toContain('Historical context')
    expect(disclosure.textContent).toContain('current applicability unverified')
    expect(view.container.querySelector('[role="status"]')?.textContent).toContain('Assessment is being prepared from evidence captured before execution.')
    fireEvent.click(disclosure.querySelector('summary')!)
    expect(disclosure.open).toBe(true)
    expect(disclosure.querySelector('strong')?.textContent).toBe(runtimeRiskEn.historicalOriginal)
    expect(disclosure.textContent).toContain('Verified historical pattern')
    expect(disclosure.textContent).toContain('A qualified verified-success pattern covers 3 distinct Episodes across 2 UTC dates.')
    expect(disclosure.textContent).toContain('Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.')
    expect(disclosure.textContent).toContain('Independently verify the current target and expected postcondition.')
    expect(disclosure.textContent).toContain('This guidance does not determine risk or grant permission or approval.')
    expect(Array.from(disclosure.children).slice(3).map(item => item.textContent)).toEqual([
      'Verified historical pattern',
      'A qualified verified-success pattern covers 3 distinct Episodes across 2 UTC dates.',
      'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.',
      'Independently verify the current target and expected postcondition.',
      'This guidance does not determine risk or grant permission or approval.',
    ])
    expect(view.container.querySelectorAll('[role="status"]')).toHaveLength(1)
    expect(view.container.querySelector('dialog')).toBeNull()
    contextClient.dispose()
    riskClient.dispose()
  })

  it('I2 resets an open disclosure across real Client A→B→A and ignores delayed stale history after the Session switch', async () => {
    const historyRequests: Array<{
      readonly request: { readonly sessionId: string; readonly executionId: string; readonly assessmentId: string }
      readonly resolve: (value: unknown) => void
      readonly signal: AbortSignal | undefined
    }> = []
    const runtimeViews = new Map([
      ['p15-3c-session-a', readyRuntimeView('p15-3c-session-a', 'p15-3c-execution-a1', 'p15-3c-assessment-a1')],
      ['p15-3c-session-b', readyRuntimeView('p15-3c-session-b', 'p15-3c-execution-b1', 'p15-3c-assessment-b1')],
    ])
    const rpc = async (_channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<unknown> => {
      const request = payload as { readonly sessionId: string; readonly executionId?: string; readonly assessmentId?: string }
      if (endpoint === 'risk-advisor/runtime-risk') {
        const view = runtimeViews.get(request.sessionId)
        return carrier(view ?? { schemaVersion: 1, kind: 'NOT_FOUND', sessionId: request.sessionId })
      }
      return await new Promise(resolve => historyRequests.push({
        request: request as { readonly sessionId: string; readonly executionId: string; readonly assessmentId: string },
        resolve,
        signal,
      }))
    }
    const riskClient = new RuntimeRiskClient({ rpc: { call: rpc } })
    const contextClient = new HistoricalContextClient({ rpc: { call: rpc } })
    const renderSession = (sessionId: string) => <RuntimeRiskAwarenessDock
      sessionId={sessionId as never}
      session={{} as never} input={{} as never}
      useSession={(() => ({}) as never) as never}
      useProjection={(() => undefined) as never}
      useSessions={(() => ({})) as never}
      useSessionStatus={useSessionStatus as never}
      useSessionRetainInfo={(() => ({})) as never}
      runtimeRiskClient={riskClient}
      historicalContextClient={contextClient}
      t={translate as never}
    />
    const view = render(renderSession('p15-3c-session-a'))
    await vi.waitFor(() => expect(historyRequests).toHaveLength(1))
    await act(async () => { historyRequests[0]!.resolve(carrier(historicalRead('p15-3c-session-a', 'p15-3c-execution-a1', 'p15-3c-assessment-a1'))); await flush() })
    await screen.findByText(runtimeRiskEn.historicalSummary)
    let disclosure = view.container.querySelector('details[aria-label]') as HTMLDetailsElement
    expect(disclosure.open).toBe(false)
    fireEvent.click(disclosure.querySelector('summary')!)
    expect(disclosure.open).toBe(true)

    view.rerender(renderSession('p15-3c-session-b'))
    await vi.waitFor(() => expect(historyRequests).toHaveLength(2))
    expect(view.container.querySelector('details[aria-label]')).toBeNull()
    // Keep B's real store request in flight while returning to A, then deliver B late.
    view.rerender(renderSession('p15-3c-session-a'))
    await vi.waitFor(() => expect(historyRequests).toHaveLength(3), { timeout: 4000 })
    expect(historyRequests[1]?.signal?.aborted).toBe(true)
    await act(async () => { historyRequests[1]!.resolve(carrier(historicalRead('p15-3c-session-b', 'p15-3c-execution-b1', 'p15-3c-assessment-b1'))); await flush() })
    expect(view.container.querySelector('details[aria-label]')).toBeNull()
    await act(async () => { historyRequests[2]!.resolve(carrier(historicalRead('p15-3c-session-a', 'p15-3c-execution-a1', 'p15-3c-assessment-a1'))); await flush() })
    await screen.findByText(runtimeRiskEn.historicalSummary)
    disclosure = view.container.querySelector('details[aria-label]') as HTMLDetailsElement
    expect(disclosure.open).toBe(false)
    fireEvent.click(disclosure.querySelector('summary')!)
    expect(disclosure.open).toBe(true)

    // An execution identity change re-fetches history and starts a closed disclosure.
    runtimeViews.set('p15-3c-session-a', readyRuntimeView('p15-3c-session-a', 'p15-3c-execution-a2', 'p15-3c-assessment-a1'))
    act(() => riskClient.refresh('p15-3c-session-a'))
    await vi.waitFor(() => expect(historyRequests).toHaveLength(4), { timeout: 4000 })
    expect(view.container.querySelector('details[aria-label]')).toBeNull()
    await act(async () => { historyRequests[3]!.resolve(carrier(historicalRead('p15-3c-session-a', 'p15-3c-execution-a2', 'p15-3c-assessment-a1'))); await flush() })
    await screen.findByText(runtimeRiskEn.historicalSummary)
    disclosure = view.container.querySelector('details[aria-label]') as HTMLDetailsElement
    expect(disclosure.open).toBe(false)
    fireEvent.click(disclosure.querySelector('summary')!)
    expect(disclosure.open).toBe(true)

    // An assessment-only change also starts a fresh closed disclosure.
    runtimeViews.set('p15-3c-session-a', readyRuntimeView('p15-3c-session-a', 'p15-3c-execution-a2', 'p15-3c-assessment-a2'))
    act(() => riskClient.refresh('p15-3c-session-a'))
    await vi.waitFor(() => expect(historyRequests).toHaveLength(5), { timeout: 4000 })
    expect(view.container.querySelector('details[aria-label]')).toBeNull()
    await act(async () => { historyRequests[4]!.resolve(carrier(historicalRead('p15-3c-session-a', 'p15-3c-execution-a2', 'p15-3c-assessment-a2'))); await flush() })
    await screen.findByText(runtimeRiskEn.historicalSummary)
    disclosure = view.container.querySelector('details[aria-label]') as HTMLDetailsElement
    expect(disclosure.open).toBe(false)
    fireEvent.click(disclosure.querySelector('summary')!)
    expect(disclosure.open).toBe(true)

    // A history withdrawal removes the open disclosure instead of reviving it.
    runtimeViews.set('p15-3c-session-a', readyRuntimeView('p15-3c-session-a', 'p15-3c-execution-a2', 'p15-3c-assessment-a3'))
    act(() => riskClient.refresh('p15-3c-session-a'))
    await vi.waitFor(() => expect(historyRequests).toHaveLength(6), { timeout: 4000 })
    expect(view.container.querySelector('details[aria-label]')).toBeNull()
    await act(async () => { historyRequests[5]!.resolve(carrier({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId: 'p15-3c-session-a' })); await flush() })
    expect(view.container.querySelector('details[aria-label]')).toBeNull()
    contextClient.dispose()
    riskClient.dispose()
  })

  it('I2 removes an open disclosure when the real history store freshness timer expires', async () => {
    let historyReads = 0
    const rpc = async (_channel: string, endpoint: string, payload: unknown, signal?: AbortSignal): Promise<unknown> => {
      const request = payload as { readonly sessionId: string; readonly executionId?: string; readonly assessmentId?: string }
      if (endpoint === 'risk-advisor/runtime-risk') return carrier(readyRuntimeView('p15-3c-expiry-session', 'p15-3c-expiry-execution', 'p15-3c-expiry-assessment'))
      historyReads += 1
      if (historyReads === 1) return carrier(historicalRead(request.sessionId, request.executionId!, request.assessmentId!))
      return await new Promise(resolve => signal?.addEventListener('abort', () => {
        resolve(carrier({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId: request.sessionId }))
      }, { once: true }))
    }
    const riskClient = new RuntimeRiskClient({ rpc: { call: rpc } })
    const contextClient = new HistoricalContextClient({ rpc: { call: rpc } })
    const view = render(<RuntimeRiskAwarenessDock
      sessionId={'p15-3c-expiry-session' as never}
      session={{} as never} input={{} as never}
      useSession={(() => ({}) as never) as never}
      useProjection={(() => undefined) as never}
      useSessions={(() => ({})) as never}
      useSessionStatus={useSessionStatus as never}
      useSessionRetainInfo={(() => ({})) as never}
      runtimeRiskClient={riskClient}
      historicalContextClient={contextClient}
      t={translate as never}
    />)
    await screen.findByText(runtimeRiskEn.historicalSummary)
    expect(view.container.querySelector('details[aria-label]')).not.toBeNull()
    const disclosure = view.container.querySelector('details[aria-label]') as HTMLDetailsElement
    fireEvent.click(disclosure.querySelector('summary')!)
    expect(disclosure.open).toBe(true)
    await vi.waitFor(() => expect(view.container.querySelector('details[aria-label]')).toBeNull(), { timeout: 2500, interval: 25 })
    expect(historyReads).toBeGreaterThanOrEqual(2)
    contextClient.dispose()
    riskClient.dispose()
  })

  it('H7 bridge rejects a mismatched late Host identity rather than presenting it', async () => {
    const bridge = createHistoricalContextBridgeClient({
      call: async () => carrier(historicalRead('p14-2-session', 'ra-execution-other', 'ra-assessment-other')),
    })
    await expect(bridge.read({ sessionId: 'p14-2-session', executionId: 'ra-execution-current', assessmentId: 'ra-assessment-current' })).resolves.toEqual({ kind: 'CLIENT_UNAVAILABLE', reason: 'PROTOCOL_INVALID' })
  })
})
