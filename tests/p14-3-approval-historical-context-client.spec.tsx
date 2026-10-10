import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { useSyncExternalStore } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApprovalHistoricalContextClient } from '../src/client/approval-historical-context-client.ts'
import { ApprovalHistoricalContextStore, APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS } from '../src/client/approval-historical-context-store.ts'
import type { ApprovalHistoricalContextBridgeClient } from '../src/client/approval-historical-context-bridge.ts'
import type { ApprovalHistoricalContextReadV1 } from '../src/approval-historical-context-contract.ts'
import { RiskAdvisorDetail } from '../src/client/RiskAdvisorDetail.tsx'
import { en } from '../src/client/locales.ts'

const sessionId = 'p14-3-client-session'
const callId = 'p14-3-client-call'
const observedAt = Date.now()

function historyView(overrides: Partial<Extract<ApprovalHistoricalContextReadV1, { kind: 'VIEW' }>> = {}): Extract<ApprovalHistoricalContextReadV1, { kind: 'VIEW' }> {
  const pattern = 'a'.repeat(64)
  const guidance = 'b'.repeat(64)
  return Object.freeze({
    schemaVersion: 1, kind: 'VIEW', sessionId, callId, approvalId: 'host-only-approval', executionId: 'ra-execution-p14-3',
    baseAssessmentId: 'ra-assessment-base', observedAt,
    historical: Object.freeze({
      guidanceId: `ra-guidance-v1_${guidance}`, guidanceRevisionId: `ra-guidance-v1_${guidance}_00000001`,
      patternId: `ra-pattern-v1_${pattern}`, patternRevisionId: `ra-pattern-v1_${pattern}_00000001`,
      patternProvenanceDigest: 'c'.repeat(64), evidenceStrength: 'QUALIFIED_PATTERN', supportCount: 3, supportUtcDateCount: 2,
      title: 'Verified historical pattern', observation: 'A qualified verified-success pattern covers 3 distinct Episodes across 2 UTC dates.',
      contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.',
      nextCheck: 'Independently verify the current target and expected postcondition.',
      authorityNotice: 'This guidance does not determine risk or grant permission or approval.',
    }),
    ...overrides,
  }) as Extract<ApprovalHistoricalContextReadV1, { kind: 'VIEW' }>
}
function carrier(value: unknown) { return Object.freeze({ ok: true, value }) }
async function flush(): Promise<void> { await Promise.resolve(); await Promise.resolve(); await Promise.resolve() }

class Clockwork {
  now = 0
  readonly baseWall = observedAt
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
    const end = this.now + milliseconds
    for (;;) {
      const next = [...this.timers.entries()].sort((a, b) => a[1].at - b[1].at)[0]
      if (next === undefined || next[1].at > end) break
      this.now = next[1].at
      this.timers.delete(next[0])
      next[1].callback()
      await flush()
    }
    this.now = end
    await flush()
  }
}

const statusListeners = new Set<() => void>()
let statusSnapshot = new Map<string, unknown>()
function useSessionStatus<T>(selector: (snapshot: ReadonlyMap<string, unknown>) => T): T {
  const snapshot = useSyncExternalStore(listener => { statusListeners.add(listener); return () => statusListeners.delete(listener) }, () => statusSnapshot, () => statusSnapshot)
  return selector(snapshot)
}
function setPending(pending: unknown): void {
  statusSnapshot = pending === undefined ? new Map() : new Map([[sessionId, { pendingInteraction: pending }]])
  for (const listener of [...statusListeners]) listener()
}
function t(key: string): string { return en[key as keyof typeof en] ?? key }
const fakeRiskView = Object.freeze({
  schemaVersion: 2, sessionId, callId, assessmentId: 'risk-assessment', association: 'BOUND', status: 'ready', stage: 'complete',
  operation: { schemaVersion: 1, kind: 'filesystem-read', toolName: 'read', title: 'Read a file', summary: 'Read a bounded file.', resources: [], parserConfidence: 'high', mutating: false, externalEffect: false, networkEffect: 'none', workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown' },
  assessment: { schemaVersion: 1, assessmentId: 'risk-assessment', status: 'PARTIAL', dimensions: Object.fromEntries(['risk', 'authorization', 'necessity', 'privilege', 'alternatives', 'evidenceQuality'].map(key => [key, { verdict: 'UNKNOWN', source: 'RULE', evidenceQuality: 'MEDIUM', reasons: [] }])), aggregate: { recommendation: 'NEED_MORE_INFORMATION', hazardLevel: 'UNKNOWN', attention: 'ELEVATED', primaryReasonCodes: [] }, findings: [], uncertainties: [], alternatives: [], evidence: { ledgerHealth: 'HEALTHY' }, judgeAssisted: false },
  failureContext: { schemaVersion: 1, retryCount: 0, recentFailureCount: 0, sameRootCause: false, permissionEscalation: 'unknown', truncated: false }, reasonCodes: [], updatedAt: 1,
})

describe('Phase 14.3 approval history client A6–A10', () => {
  afterEach(() => { cleanup(); setPending(undefined); vi.useRealTimers() })

  it('sends only exact Session/callId, fences local key changes, aborts stale responses, and caps reads at one per second', async () => {
    const clock = new Clockwork()
    const first = Promise.withResolvers<ApprovalHistoricalContextReadV1>()
    const second = Promise.withResolvers<ApprovalHistoricalContextReadV1>()
    const requests: Array<{ payload: unknown; signal?: AbortSignal }> = []
    const bridge: ApprovalHistoricalContextBridgeClient = { read: (payload, signal) => {
      requests.push({ payload, signal })
      return requests.length === 1 ? first.promise : second.promise
    } }
    const store = new ApprovalHistoricalContextStore(bridge, sessionId, callId, undefined, {
      clock: () => clock.now, wallClock: clock.wallClock, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    store.start()
    store.setTarget('approval:1')
    await clock.advance(0)
    expect(requests).toHaveLength(1)
    expect(requests[0]?.payload).toEqual({ sessionId, callId })
    expect(JSON.stringify(requests[0]?.payload)).not.toContain('approval:1')
    store.setTarget('approval:2')
    expect(requests[0]?.signal?.aborted).toBe(true)
    first.resolve(historyView())
    await flush()
    expect(store.getSnapshot().status).toBe('EMPTY')
    await clock.advance(999)
    expect(requests).toHaveLength(1)
    await clock.advance(1)
    expect(requests).toHaveLength(2)
    second.resolve(historyView())
    await flush()
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW', clientKey: 'approval:2' })
    store.clearTarget('approval:1')
    expect(store.getSnapshot().status).toBe('VIEW')
    store.clearTarget('approval:2')
    expect(store.getSnapshot().status).toBe('EMPTY')
    store.dispose()
  })

  it('applies observedAt freshness at 1499ms and rejects at 1500ms, including delayed replies', async () => {
    const clock = new Clockwork()
    const freshBridge: ApprovalHistoricalContextBridgeClient = { read: async request => ({ ...historyView({ observedAt: clock.wallClock() - 1499 }), sessionId: request.sessionId, callId: request.callId }) }
    const store = new ApprovalHistoricalContextStore(freshBridge, sessionId, callId, undefined, {
      clock: () => clock.now, wallClock: clock.wallClock, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    store.setTarget('approval:fresh')
    store.start()
    await clock.advance(0)
    expect(store.getSnapshot().status).toBe('VIEW')
    await clock.advance(1)
    expect(store.getSnapshot().status).toBe('EMPTY')
    store.dispose()

    const delayed = Promise.withResolvers<ApprovalHistoricalContextReadV1>()
    const lateStore = new ApprovalHistoricalContextStore({ read: () => delayed.promise }, sessionId, callId, undefined, {
      clock: () => clock.now, wallClock: clock.wallClock, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    lateStore.setTarget('approval:late')
    lateStore.start()
    await clock.advance(0)
    await clock.advance(APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS)
    delayed.resolve(historyView({ observedAt: clock.wallClock() - APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS }))
    await flush()
    expect(lateStore.getSnapshot().status).toBe('EMPTY')
    lateStore.dispose()
  })

  it('A8 clears and aborts on connection-generation reset, then restarts without accepting the old reply', async () => {
    const clock = new Clockwork()
    const first = Promise.withResolvers<ApprovalHistoricalContextReadV1>()
    const second = Promise.withResolvers<ApprovalHistoricalContextReadV1>()
    const requests: Array<{ signal?: AbortSignal }> = []
    const bridge: ApprovalHistoricalContextBridgeClient = { read: (_request, signal) => {
      requests.push({ signal })
      return requests.length === 1 ? first.promise : second.promise
    } }
    let generationValue = 1
    const listeners = new Set<() => void>()
    const store = new ApprovalHistoricalContextStore(bridge, sessionId, callId, {
      rpc: { call: async () => undefined },
      generation: { getSnapshot: () => generationValue, subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } } },
    }, { clock: () => clock.now, wallClock: clock.wallClock, setTimer: clock.setTimer, clearTimer: clock.clearTimer })
    store.setTarget('approval:generation')
    store.start()
    await clock.advance(0)
    expect(listeners.size).toBe(1)
    generationValue = 2
    for (const listener of [...listeners]) listener()
    expect(requests[0]?.signal?.aborted).toBe(true)
    expect(store.getSnapshot().status).toBe('EMPTY')
    first.resolve(historyView())
    await flush()
    expect(store.getSnapshot().status).toBe('EMPTY')
    await clock.advance(1000)
    expect(requests).toHaveLength(2)
    second.resolve(historyView())
    await flush()
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW', clientKey: 'approval:generation' })
    store.stop()
    expect(listeners.size).toBe(0)
    expect(store.getSnapshot().status).toBe('EMPTY')
    store.start()
    await clock.advance(0)
    expect(listeners.size).toBe(1)
    store.dispose()
    expect(listeners.size).toBe(0)
  })

  it('renders only beneath the existing READY/BOUND approval detail and clears on native decision', async () => {
    const decision = Promise.withResolvers<unknown>()
    const pending = Object.freeze({ kind: 'approval' as const, key: 'approval:local-1', sessionId, callId, result: decision.promise })
    setPending(pending)
    const connection = { rpc: { call: vi.fn(async (_channel: string, endpoint: string) => endpoint === 'risk-advisor/active'
      ? carrier({ kind: 'VIEW', view: fakeRiskView }) : carrier(historyView())) } }
    const readyPresentationSnapshot = Object.freeze({ status: 'READY' as const, view: fakeRiskView })
    const presentationStore = {
      subscribe: (listener: () => void) => { void listener; return () => undefined },
      getSnapshot: () => readyPresentationSnapshot,
    }
    const presentationClient = {
      getSource: () => presentationStore,
      retain: vi.fn(), release: vi.fn(),
    }
    const historyClient = new ApprovalHistoricalContextClient(connection)
    render(<RiskAdvisorDetail sessionId={sessionId as never} callId={callId as never} presentationClient={presentationClient as never}
      approvalHistoricalContextClient={historyClient} t={t as never} useSessionStatus={useSessionStatus as never} />)
    await waitFor(() => expect(screen.getByTestId('approval-historical-context')).toBeTruthy())
    expect(screen.getByText('Verified historical context — advisory only')).toBeTruthy()
    expect(screen.getByText('Host-storage-scoped history; target and Workspace applicability unproven.')).toBeTruthy()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: /approve|allow|reject/i })).toBeNull()
    expect(connection.rpc.call.mock.calls.some(call => JSON.stringify(call[2]).includes('approval:local-1'))).toBe(false)
    await act(async () => { decision.resolve('allowed-once'); await flush() })
    await waitFor(() => expect(screen.queryByTestId('approval-historical-context')).toBeNull())
    historyClient.dispose()
  })
})
