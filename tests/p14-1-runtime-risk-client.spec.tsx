import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSyncExternalStore } from 'react'
import type { BrowserRiskAssessmentV1, RuntimeRiskAwarenessReadV1 } from '../src/bridge-contract.ts'
import { RuntimeRiskClient } from '../src/client/runtime-risk-client.ts'
import { HistoricalContextClient } from '../src/client/historical-context-client.ts'
import { RuntimeRiskAwarenessDock } from '../src/client/RuntimeRiskAwarenessDock.tsx'
import { runtimeRiskEn } from '../src/client/runtime-risk-locales.ts'
import type { RuntimeRiskConnectionLike } from '../src/client/runtime-risk-store.ts'

function assessment(): BrowserRiskAssessmentV1 {
  const dimension = (verdict: string) => ({ verdict, source: 'RULE' as const, evidenceQuality: 'HIGH' as const, reasons: Object.freeze([]) })
  return Object.freeze({
    schemaVersion: 1,
    assessmentId: 'ra-assessment-00000000-0000-4000-8000-000000000000',
    status: 'COMPLETE',
    dimensions: {
      risk: dimension('CRITICAL'), authorization: dimension('UNKNOWN'), necessity: dimension('UNKNOWN'),
      privilege: dimension('UNKNOWN'), alternatives: dimension('UNKNOWN'), evidenceQuality: dimension('LOW'),
    },
    aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'CRITICAL', attention: 'URGENT', primaryReasonCodes: ['UNKNOWN_EVIDENCE'] },
    findings: Object.freeze([{ code: 'CRITICAL_RISK', title: 'Potentially critical operation', detail: 'Requires careful review.', dimension: 'RISK', severity: 'CRITICAL', strength: 'DETERMINISTIC' }]),
    uncertainties: Object.freeze([]),
    alternatives: Object.freeze([]),
    evidence: { ledgerHealth: 'HEALTHY' },
    judgeAssisted: false,
  }) as BrowserRiskAssessmentV1
}

function runtimeRead(overrides: Partial<Extract<RuntimeRiskAwarenessReadV1, { kind: 'VIEW' }>> = {}): Extract<RuntimeRiskAwarenessReadV1, { kind: 'VIEW' }> {
  return Object.freeze({
    schemaVersion: 1,
    kind: 'VIEW',
    sessionId: 'runtime-risk-ui-session',
    executionId: 'ra-execution-runtime-risk-ui',
    callId: 'runtime-risk-ui-call',
    assessmentId: 'ra-assessment-00000000-0000-4000-8000-000000000000',
    timing: 'PRE_EXECUTION_EVIDENCE',
    status: 'READY',
    stage: 'COMPLETE',
    capturedAt: 10,
    updatedAt: 11,
    reasonCodes: Object.freeze([]),
    assessment: assessment(),
    ...overrides,
  }) as Extract<RuntimeRiskAwarenessReadV1, { kind: 'VIEW' }>
}

function carrier(value: unknown) { return Object.freeze({ ok: true, value }) }

const listeners = new Set<() => void>()
let statusSnapshot = new Map<string, unknown>()
function useSessionStatus<T>(selector: (snapshot: ReadonlyMap<string, unknown>) => T): T {
  const snapshot = useSyncExternalStore(listener => {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }, () => statusSnapshot, () => statusSnapshot)
  return selector(snapshot)
}

function setPending(pending: unknown): void {
  statusSnapshot = pending === undefined ? new Map() : new Map([['runtime-risk-ui-session', { pendingInteraction: pending }]])
  for (const listener of [...listeners]) listener()
}

function translate(key: keyof typeof runtimeRiskEn): string { return runtimeRiskEn[key] }

function renderDock(client: RuntimeRiskClient) {
  const historicalContextClient = new HistoricalContextClient({ rpc: { call: async () => carrier({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId: 'runtime-risk-ui-session' }) } })
  return render(<RuntimeRiskAwarenessDock
    sessionId={'runtime-risk-ui-session' as never}
    session={{} as never}
    input={{} as never}
    useSession={(() => ({}) as never) as never}
    useProjection={(() => undefined) as never}
    useSessions={(() => ({})) as never}
    useSessionStatus={useSessionStatus as never}
    useSessionRetainInfo={(() => ({})) as never}
    runtimeRiskClient={client}
    historicalContextClient={historicalContextClient}
    t={translate as never}
  />)
}

function clientWithRpc(call: RuntimeRiskConnectionLike['rpc']['call']): RuntimeRiskClient {
  return new RuntimeRiskClient({ rpc: { call } })
}

afterEach(() => {
  cleanup()
  setPending(undefined)
})

describe('Phase 14.1 runtime-risk Client', () => {
  it('immediately hides a matching cached row during Native Approval and revalidates before showing after settlement', async () => {
    let resolveSecond: ((value: unknown) => void) | undefined
    const rpc = vi.fn((_channel: string, _endpoint: string, _payload: unknown) => {
      if (rpc.mock.calls.length === 1) return Promise.resolve(carrier(runtimeRead()))
      return new Promise(resolve => { resolveSecond = resolve })
    })
    const client = clientWithRpc(rpc as RuntimeRiskConnectionLike['rpc']['call'])
    const view = renderDock(client)
    await screen.findByText('Critical')
    expect(view.container.querySelector('[data-runtime-risk-dock]')).not.toBeNull()

    act(() => setPending({ kind: 'approval', sessionId: 'runtime-risk-ui-session', key: 'approval-a', callId: 'runtime-risk-ui-call' }))
    expect(view.container.querySelector('[data-runtime-risk-dock]')).toBeNull()

    act(() => setPending(undefined))
    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(2))
    expect(view.container.querySelector('[data-runtime-risk-dock]')).toBeNull()
    await act(async () => { resolveSecond?.(carrier({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId: 'runtime-risk-ui-session' })); await Promise.resolve() })
    expect(view.container.querySelector('[data-runtime-risk-dock]')).toBeNull()
    client.dispose()
  })

  it('keeps a different call visible but suppresses conservatively if either callId is missing', async () => {
    const client = clientWithRpc(async () => carrier(runtimeRead()))
    const view = renderDock(client)
    await screen.findByText('Critical')

    act(() => setPending({ kind: 'approval', sessionId: 'runtime-risk-ui-session', key: 'approval-other', callId: 'other-call' }))
    expect(view.container.querySelector('[data-runtime-risk-dock]')).not.toBeNull()

    act(() => setPending({ kind: 'approval', sessionId: 'runtime-risk-ui-session', key: 'approval-missing-call' }))
    expect(view.container.querySelector('[data-runtime-risk-dock]')).toBeNull()
    client.dispose()
  })

  it('shows a clear pre-execution caveat and only an inline details disclosure', async () => {
    const client = clientWithRpc(async () => carrier(runtimeRead()))
    const view = renderDock(client)
    await screen.findByText('Potentially critical operation')
    expect(screen.getByText('Based on evidence captured before execution.')).toBeTruthy()
    expect(screen.getByText('Advisory only. Harness execution and Native Approval remain authoritative.')).toBeTruthy()
    expect(screen.getByText('Details')).toBeTruthy()
    expect(view.container.querySelector('dialog')).toBeNull()
    expect(view.container.querySelector('button')).toBeNull()
    client.dispose()
  })

  it('keeps one render-pure store per Session and aborts/unsubscribes on release before a clean restart', async () => {
    const pending = Promise.withResolvers<unknown>()
    const listenersForGeneration = new Set<() => void>()
    const signals: AbortSignal[] = []
    let generationValue = 1
    let calls = 0
    const rpc: RuntimeRiskConnectionLike['rpc']['call'] = (_channel, _endpoint, _payload, signal) => {
      calls += 1
      if (signal !== undefined) signals.push(signal)
      return calls === 1 ? pending.promise : Promise.resolve(carrier({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId: 'runtime-risk-ui-session' }))
    }
    const client = new RuntimeRiskClient({
      rpc: { call: rpc },
      generation: {
        getSnapshot: () => generationValue,
        subscribe: listener => { listenersForGeneration.add(listener); return () => { listenersForGeneration.delete(listener) } },
      },
    })
    const store = client.getSource('runtime-risk-ui-session')
    expect(client.getSource('runtime-risk-ui-session')).toBe(store)
    expect(client.getSource('another-session')).not.toBe(store)
    expect(calls).toBe(0)
    expect(listenersForGeneration.size).toBe(0)

    client.retain('runtime-risk-ui-session')
    expect(calls).toBe(1)
    expect(listenersForGeneration.size).toBe(1)
    client.release('runtime-risk-ui-session')
    expect(signals[0]?.aborted).toBe(true)
    expect(listenersForGeneration.size).toBe(0)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })

    client.retain('runtime-risk-ui-session')
    await vi.waitFor(() => expect(store.getSnapshot()).toEqual({ status: 'NOT_FOUND' }))
    expect(calls).toBe(2)
    pending.resolve(carrier(runtimeRead()))
    await act(async () => { await Promise.resolve() })
    expect(store.getSnapshot()).toEqual({ status: 'NOT_FOUND' })
    client.release('runtime-risk-ui-session')
    expect(listenersForGeneration.size).toBe(0)
    client.dispose()
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })

    generationValue += 1
    for (const listener of listenersForGeneration) listener()
  })
})
