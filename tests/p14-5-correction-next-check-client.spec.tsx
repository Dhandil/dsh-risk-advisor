import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BrowserOnlineCorrectionFindingV1 } from '../src/online-correction-contract.ts'
import type { CorrectionNextCheckReadV1 } from '../src/correction-next-check-contract.ts'
import { liveCorrectionFindingId } from '../src/host/live-correction.ts'
import { OnlineCorrectionDock } from '../src/client/OnlineCorrectionDock.tsx'
import { onlineCorrectionEn } from '../src/client/online-correction-locales.ts'
import { CorrectionNextCheckClient, CORRECTION_NEXT_CHECK_MAX_SESSION_STORES } from '../src/client/correction-next-check-client.ts'
import { CorrectionNextCheckStore, CORRECTION_NEXT_CHECK_MAX_FRESHNESS_MS } from '../src/client/correction-next-check-store.ts'
import { createCorrectionNextCheckBridgeClient } from '../src/client/correction-next-check-bridge.ts'
import type { CorrectionNextCheckBridgeClient } from '../src/client/correction-next-check-bridge.ts'

afterEach(() => cleanup())

class FakeClock {
  now = 0
  wall = 100_000
  private next = 0
  private readonly tasks = new Map<number, { readonly at: number; readonly callback: () => void }>()
  setTimer = (callback: () => void, delay: number): ReturnType<typeof setTimeout> => {
    const id = ++this.next
    this.tasks.set(id, { at: this.now + Math.max(0, delay), callback })
    return id as unknown as ReturnType<typeof setTimeout>
  }
  clearTimer = (id: ReturnType<typeof setTimeout>): void => { this.tasks.delete(id as unknown as number) }
  async advance(ms: number): Promise<void> {
    const end = this.now + ms
    while (true) {
      const next = [...this.tasks.entries()].filter(([, task]) => task.at <= end).sort((a, b) => a[1].at - b[1].at)[0]
      if (next === undefined) break
      const step = next[1].at - this.now
      this.now = next[1].at
      this.wall += step
      this.tasks.delete(next[0])
      next[1].callback()
      await flush()
    }
    const step = end - this.now
    this.now = end
    this.wall += step
    await flush()
  }
}

function nextCheckRead(sessionId: string, findingId: string, observedAt: number, overrides: Partial<CorrectionNextCheckReadV1> = {}): CorrectionNextCheckReadV1 {
  return Object.freeze({ schemaVersion: 1, kind: 'VIEW', sessionId, findingId,
    findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', checkCode: 'REVIEW_EXACT_RETRY_PREREQUISITES_V1',
    evidenceCode: 'F1_CONTIGUOUS_RETRY_FINDING_V1', observedAt, ...overrides }) as CorrectionNextCheckReadV1
}

function setupConnection(clock: FakeClock, read: (request: { sessionId: string; findingId: string }, signal?: AbortSignal) => Promise<unknown>) {
  const calls: Array<{ readonly sessionId: string; readonly findingId: string; readonly signal?: AbortSignal }> = []
  const generation = {
    value: 1,
    listeners: new Set<() => void>(),
    subscribeCalls: 0,
    getSnapshot() { return this.value },
    subscribe(listener: () => void) { this.subscribeCalls += 1; this.listeners.add(listener); return () => this.listeners.delete(listener) },
    advance() { this.value += 1; for (const listener of [...this.listeners]) listener() },
  }
  const connection = {
    generation,
    rpc: { call: async (_channel: string, _endpoint: string, payload: unknown, signal?: AbortSignal) => {
      const request = payload as { sessionId: string; findingId: string }
      calls.push({ ...request, ...(signal === undefined ? {} : { signal }) })
      return { ok: true, value: await read(request, signal) }
    } },
  }
  return { connection, generation, calls }
}

async function flush(): Promise<void> { for (let index = 0; index < 12; index += 1) await Promise.resolve() }

describe('Phase 14.5 bounded optional Client N9/N10', () => {
  it('N9 keeps 64 retained Session stores bounded and disables only the optional source at capacity', () => {
    const clock = new FakeClock()
    const env = setupConnection(clock, async target => nextCheckRead(target.sessionId, target.findingId, clock.wall))
    const client = new CorrectionNextCheckClient(env.connection as never, {
      setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    expect(CORRECTION_NEXT_CHECK_MAX_SESSION_STORES).toBe(64)
    const sources = Array.from({ length: 64 }, (_, index) => client.getSource(`n9-session-${index}`))
    for (let index = 0; index < 64; index += 1) expect(client.retain(`n9-session-${index}`)).toBe(true)
    const disabled = client.getSource('n9-session-over-capacity')
    expect(disabled.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(client.setFinding('n9-session-over-capacity', `ra-correction-v1_${'a'.repeat(64)}`)).toBe(false)
    expect(client.retain('n9-session-over-capacity')).toBe(false)
    expect(sources.every((source, index) => source === client.getSource(`n9-session-${index}`))).toBe(true)
    expect(env.generation.subscribeCalls).toBe(64)
    client.dispose()
    expect(client.retain('n9-session-0')).toBe(false)
    expect(client.getSource('n9-session-0').getSnapshot()).toEqual({ status: 'EMPTY' })
  })

  it('N9 recycles the least-recently-used idle source and keeps retained stores stable', () => {
    const clock = new FakeClock()
    const env = setupConnection(clock, async target => nextCheckRead(target.sessionId, target.findingId, clock.wall))
    const client = new CorrectionNextCheckClient(env.connection as never, {
      maxStores: 2, idleRetentionMs: 10_000, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    const a = client.getSource('n9-lru-a')
    const b = client.getSource('n9-lru-b')
    expect(client.retain('n9-lru-a')).toBe(true)
    expect(client.retain('n9-lru-b')).toBe(true)
    expect(client.release('n9-lru-a')).toBe(true)
    expect(client.getSource('n9-lru-b')).toBe(b)
    const c = client.getSource('n9-lru-c')
    expect(c).not.toBe(a)
    expect(client.getSource('n9-lru-b')).toBe(b)
    expect(client.retain('n9-lru-c')).toBe(true)
    client.release('n9-lru-b'); client.release('n9-lru-c'); client.dispose()
  })

  it('N9 bounds a long sequence of 256 Session switches and retains only recent idle identities', () => {
    const clock = new FakeClock()
    const env = setupConnection(clock, async target => nextCheckRead(target.sessionId, target.findingId, clock.wall))
    const client = new CorrectionNextCheckClient(env.connection as never, {
      maxStores: 8, idleRetentionMs: 60_000, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    let oldest: ReturnType<typeof client.getSource> | undefined
    let newest: ReturnType<typeof client.getSource> | undefined
    for (let index = 0; index < 256; index += 1) {
      const sessionId = `n9-switch-${index}`
      const source = client.getSource(sessionId)
      if (index === 0) oldest = source
      newest = source
      expect(client.retain(sessionId)).toBe(true)
      expect(client.release(sessionId)).toBe(true)
    }
    expect(client.getSource('n9-switch-0')).not.toBe(oldest)
    expect(client.getSource('n9-switch-255')).toBe(newest)
    client.dispose()
  })

  it('N9 getSource is inert, retain starts generation subscription, release stops and remount reuses the stable store', () => {
    const clock = new FakeClock()
    const env = setupConnection(clock, async target => nextCheckRead(target.sessionId, target.findingId, clock.wall))
    const client = new CorrectionNextCheckClient(env.connection as never, {
      idleRetentionMs: 10_000, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
    })
    const source = client.getSource('n9-restart')
    expect(env.generation.subscribeCalls).toBe(0)
    expect(client.getSource('n9-restart')).toBe(source)
    expect(client.setFinding('n9-restart', `ra-correction-v1_${'b'.repeat(64)}`)).toBe(true)
    expect(client.retain('n9-restart')).toBe(true)
    expect(env.generation.subscribeCalls).toBe(1)
    expect(client.release('n9-restart')).toBe(true)
    expect(env.generation.listeners.size).toBe(0)
    expect(client.getSource('n9-restart')).toBe(source)
    expect(client.retain('n9-restart')).toBe(true)
    expect(client.getSource('n9-restart')).toBe(source)
    client.release('n9-restart')
    client.dispose()
  })

  it('N10 enforces one in-flight request, one read per second, immediate target clearing and no late resurrection', async () => {
    const clock = new FakeClock()
    const deferred: Array<{ resolve: (value: unknown) => void; signal?: AbortSignal; target: { sessionId: string; findingId: string } }> = []
    const env = setupConnection(clock, (target, signal) => new Promise(resolve => deferred.push({ resolve, signal, target })))
    const store = new CorrectionNextCheckStore(createCorrectionNextCheckBridgeClient(env.connection.rpc), 'n10-session', env.connection as never,
      { clock: () => clock.now, wallClock: () => clock.wall, setTimer: clock.setTimer, clearTimer: clock.clearTimer })
    const first = `ra-correction-v1_${'1'.repeat(64)}`
    const second = `ra-correction-v1_${'2'.repeat(64)}`
    store.setFinding(first); store.start()
    await clock.advance(0)
    expect(deferred).toHaveLength(1)
    store.setFinding(second)
    expect(deferred[0]!.signal?.aborted).toBe(true)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    await clock.advance(999)
    expect(deferred).toHaveLength(1)
    await clock.advance(1)
    expect(deferred).toHaveLength(2)
    deferred[0]!.resolve({ schemaVersion: 1, kind: 'VIEW', sessionId: 'n10-session', findingId: first,
      findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', checkCode: 'REVIEW_EXACT_RETRY_PREREQUISITES_V1', evidenceCode: 'F1_CONTIGUOUS_RETRY_FINDING_V1', observedAt: clock.wall })
    deferred[1]!.resolve({ schemaVersion: 1, kind: 'VIEW', sessionId: 'n10-session', findingId: second,
      findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', checkCode: 'REVIEW_EXACT_RETRY_PREREQUISITES_V1', evidenceCode: 'F1_CONTIGUOUS_RETRY_FINDING_V1', observedAt: clock.wall })
    await flush()
    expect(store.getSnapshot()).toMatchObject({ status: 'VIEW', findingId: second })
    expect(env.calls).toHaveLength(2)
    store.setFinding(undefined)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    store.stop()
  })

  it('N10 accepts host age 1499ms, rejects 1500ms and expires without a new base render', async () => {
    expect(CORRECTION_NEXT_CHECK_MAX_FRESHNESS_MS).toBe(1500)
    for (const age of [1499, 1500]) {
      const clock = new FakeClock()
      const findingId = `ra-correction-v1_${String(age).padStart(64, '0')}`
      const bridge: CorrectionNextCheckBridgeClient = { read: async target => nextCheckRead(target.sessionId, target.findingId, clock.wall - age) }
      const store = new CorrectionNextCheckStore(bridge, `n10-age-${age}`, undefined,
        { clock: () => clock.now, wallClock: () => clock.wall, setTimer: clock.setTimer, clearTimer: clock.clearTimer })
      store.setFinding(findingId); store.start()
      await clock.advance(0)
      if (age === 1499) {
        expect(store.getSnapshot()).toMatchObject({ status: 'VIEW', findingId })
        await clock.advance(1)
        expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
      } else expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
      store.stop()
    }
  })

  it('N10 aborts and fences a late response after a connection generation replacement', async () => {
    const clock = new FakeClock()
    const deferred: Array<{ resolve: (value: unknown) => void; signal?: AbortSignal }> = []
    const env = setupConnection(clock, (_target, signal) => new Promise(resolve => deferred.push({ resolve, signal })))
    const store = new CorrectionNextCheckStore(createCorrectionNextCheckBridgeClient(env.connection.rpc), 'n10-generation', env.connection as never,
      { clock: () => clock.now, wallClock: () => clock.wall, setTimer: clock.setTimer, clearTimer: clock.clearTimer })
    const findingId = `ra-correction-v1_${'3'.repeat(64)}`
    store.setFinding(findingId); store.start(); await clock.advance(0)
    env.generation.advance()
    expect(deferred[0]!.signal?.aborted).toBe(true)
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    deferred[0]!.resolve({ schemaVersion: 1, kind: 'VIEW', sessionId: 'n10-generation', findingId,
      findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', checkCode: 'REVIEW_EXACT_RETRY_PREREQUISITES_V1', evidenceCode: 'F1_CONTIGUOUS_RETRY_FINDING_V1', observedAt: clock.wall })
    await flush()
    expect(store.getSnapshot()).toEqual({ status: 'EMPTY' })
    store.stop()
  })

  it('N6 bridge sends only Session/Finding selectors and rejects malformed or foreign DTOs', async () => {
    const sessionId = 'n6-client-session'
    const findingId = `ra-correction-v1_${'4'.repeat(64)}`
    let captured: unknown
    const bridge = createCorrectionNextCheckBridgeClient({ call: async (channel, endpoint, payload) => {
      expect(channel).toBe('/api'); expect(endpoint).toBe('risk-advisor/correction-next-check')
      captured = payload
      return { ok: true, value: nextCheckRead(sessionId, findingId, Date.now()) }
    } })
    expect(await bridge.read({ sessionId, findingId })).toMatchObject({ kind: 'VIEW', findingId })
    expect(captured).toEqual({ sessionId, findingId })
    const malformed = createCorrectionNextCheckBridgeClient({ call: async () => ({ ok: true,
      value: { ...nextCheckRead(sessionId, findingId, Date.now()), executionId: 'raw-execution' } }) })
    expect(await malformed.read({ sessionId, findingId })).toMatchObject({ kind: 'CLIENT_UNAVAILABLE', reason: 'PROTOCOL_INVALID' })
  })
})

describe('Phase 14.5 isolated optional UI N8/N9/N11', () => {
  const sessionId = 'n11-ui-session'
  const findingId = liveCorrectionFindingId('n11-ui-exec', 'REPEATED_FAILURE_WITHOUT_PROGRESS')
  const finding: BrowserOnlineCorrectionFindingV1 = Object.freeze({ findingId,
    kind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', diagnosis: 'REPEATED_SAME_SIGNATURE_FAILURE', disposition: 'ADVISE',
    advisoryCode: 'STOP_EXACT_RETRY_PATH_V1', observedAt: Date.now() })
  const checkView = nextCheckRead(sessionId, findingId, Date.now())
  const historyView = Object.freeze({ schemaVersion: 1, kind: 'VIEW', sessionId, findingId,
    findingKind: finding.kind, observedAt: Date.now(), historical: Object.freeze({ title: 'Historical title', observation: 'Historical observation',
      contextCaveat: 'History is advisory.', nextCheck: 'Historical check.', authorityNotice: 'No authority.' }) })
  const baseSnapshot = Object.freeze({ status: 'VIEW' as const,
    view: Object.freeze({ schemaVersion: 1 as const, sessionId, findings: Object.freeze([finding]), truncated: false, reasonCodes: Object.freeze([]) }) })
  const historySnapshot = Object.freeze({ status: 'VIEW' as const, findingId, view: historyView })
  const checkSnapshot = Object.freeze({ status: 'VIEW' as const, findingId, view: checkView })
  const baseSource = { getSnapshot: () => baseSnapshot,
  subscribe: () => () => undefined }
  const historySource = { getSnapshot: () => historySnapshot, subscribe: () => () => undefined }
  const baseClient = {
    getSource: () => baseSource,
    retain: () => undefined, release: () => undefined,
  }
  const historyClient = {
    getSource: () => historySource,
    setFinding: () => true, retain: () => true, release: () => true,
  }

  it('N8 renders next-check directly under the newest fixed Finding and before separate Phase 14.4 history', async () => {
    const source = { getSnapshot: () => checkSnapshot, subscribe: () => () => undefined }
    const nextClient = { getSource: () => source, setFinding: () => true, retain: () => true, release: () => true }
    render(<OnlineCorrectionDock sessionId={sessionId} onlineCorrectionClient={baseClient as never}
      correctionHistoricalContextClient={historyClient as never} correctionNextCheckClient={nextClient as never}
      t={key => onlineCorrectionEn[key]} />)
    await waitFor(() => expect(screen.getByText('Evidence-grounded next check — advisory only')).toBeTruthy())
    expect(screen.getByText('Manual inspection only. The cause, target and corrective action are not verified.')).toBeTruthy()
    expect(screen.getByText('The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.')).toBeTruthy()
    const check = document.querySelector('[data-correction-next-check]')
    const history = document.querySelector('[data-correction-history]')
    expect(check).not.toBeNull(); expect(history).not.toBeNull()
    expect(check!.compareDocumentPosition(history!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect((check as HTMLDetailsElement).open).toBe(false)
  })

  it('N8 renders the fixed F2 mapping and keeps the advice non-actionable', async () => {
    const postFinding: BrowserOnlineCorrectionFindingV1 = Object.freeze({ ...finding,
      findingId: liveCorrectionFindingId('n11-ui-f2-exec', 'POSTCONDITION_NOT_SATISFIED'),
      kind: 'POSTCONDITION_NOT_SATISFIED', diagnosis: 'VERIFIED_POSTCONDITION_MISMATCH',
      advisoryCode: 'INSPECT_UNSATISFIED_POSTCONDITION_V1' })
    const postView = nextCheckRead(sessionId, postFinding.findingId, Date.now(), {
      findingKind: 'POSTCONDITION_NOT_SATISFIED', checkCode: 'INSPECT_WRITTEN_CONTENT_V1', evidenceCode: 'F2_CURRENT_VERIFIED_MISMATCH_V1',
    } as Partial<CorrectionNextCheckReadV1>)
    const postSnapshot = Object.freeze({ status: 'VIEW' as const, findingId: postFinding.findingId, view: postView })
    const postBaseSnapshot = Object.freeze({ status: 'VIEW' as const,
      view: Object.freeze({ schemaVersion: 1 as const, sessionId, findings: Object.freeze([postFinding]), truncated: false, reasonCodes: Object.freeze([]) }) })
    const postBaseSource = { getSnapshot: () => postBaseSnapshot, subscribe: () => () => undefined }
    const base = { getSource: () => postBaseSource,
    retain: () => undefined, release: () => undefined }
    const nextSource = { getSnapshot: () => postSnapshot, subscribe: () => () => undefined }
    const next = { getSource: () => nextSource, setFinding: () => true, retain: () => true, release: () => true }
    render(<OnlineCorrectionDock sessionId={sessionId} onlineCorrectionClient={base as never}
      correctionNextCheckClient={next as never} t={key => onlineCorrectionEn[key]} />)
    await waitFor(() => expect(screen.getByText('Independently inspect the final content against the intended write result.')).toBeTruthy())
    expect(screen.getByText('Based on a current verified postcondition mismatch.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('N11 keeps the original Dock and Phase 14.4 history available when the optional dependency is absent', async () => {
    render(<OnlineCorrectionDock sessionId={sessionId} onlineCorrectionClient={baseClient as never}
      correctionHistoricalContextClient={historyClient as never} t={key => onlineCorrectionEn[key]} />)
    expect(screen.getByText('The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.')).toBeTruthy()
    expect(screen.getByText('Historical title')).toBeTruthy()
    expect(screen.queryByText('Evidence-grounded next check — advisory only')).toBeNull()
  })

  it.each(['getSource', 'setFinding', 'retain', 'getSnapshot', 'subscribe'] as const)(
    'N9/N11 isolates optional %s failure while preserving F1 and Phase 14.4 history', async failure => {
      const source = {
        getSnapshot: () => { if (failure === 'getSnapshot') throw new Error('optional source failure'); return checkSnapshot },
        subscribe: () => { if (failure === 'subscribe') throw new Error('optional subscription failure'); return () => undefined },
      }
      const nextClient = {
        getSource: () => { if (failure === 'getSource') throw new Error('disposed'); return source },
        setFinding: () => { if (failure === 'setFinding') throw new Error('disposed'); return true },
        retain: () => { if (failure === 'retain') throw new Error('disposed'); return true },
        release: () => { if (failure === 'release') throw new Error('disposed'); return false },
      }
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      try {
        render(<OnlineCorrectionDock sessionId={sessionId} onlineCorrectionClient={baseClient as never}
          correctionHistoricalContextClient={historyClient as never} correctionNextCheckClient={nextClient as never}
          t={key => onlineCorrectionEn[key]} />)
        expect(screen.getByText('The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.')).toBeTruthy()
        expect(screen.getByText('Historical title')).toBeTruthy()
        if (failure === 'getSource' || failure === 'getSnapshot' || failure === 'subscribe' || failure === 'setFinding' || failure === 'retain') {
          expect(screen.queryByText('Evidence-grounded next check — advisory only')).toBeNull()
        }
      } finally { spy.mockRestore() }
    },
  )

  it('N11 contains a render-time locale failure inside the optional subtree; the original Dock and historical note remain', async () => {
    const source = { getSnapshot: () => checkSnapshot, subscribe: () => () => undefined }
    const nextClient = { getSource: () => source, setFinding: () => true, retain: () => true, release: () => true }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      render(<OnlineCorrectionDock sessionId={sessionId} onlineCorrectionClient={baseClient as never}
        correctionHistoricalContextClient={historyClient as never} correctionNextCheckClient={nextClient as never}
        t={key => { if (key.startsWith('nextCheck.')) throw new Error('optional subtree rendering failure'); return onlineCorrectionEn[key] }} />)
      await waitFor(() => expect(screen.getByText('Historical title')).toBeTruthy())
      expect(screen.getByText('The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.')).toBeTruthy()
      expect(screen.queryByText('Evidence-grounded next check — advisory only')).toBeNull()
    } finally { spy.mockRestore() }
  })

  it('N9/N11 contains a release exception when the newest Finding changes; the Dock continues with the new F2', async () => {
    const postFinding: BrowserOnlineCorrectionFindingV1 = Object.freeze({ ...finding,
      findingId: liveCorrectionFindingId('n11-release-f2', 'POSTCONDITION_NOT_SATISFIED'),
      kind: 'POSTCONDITION_NOT_SATISFIED', diagnosis: 'VERIFIED_POSTCONDITION_MISMATCH',
      advisoryCode: 'INSPECT_UNSATISFIED_POSTCONDITION_V1', observedAt: finding.observedAt + 1 })
    let baseSnapshot: { readonly status: 'VIEW'; readonly view: { readonly schemaVersion: 1; readonly sessionId: string;
      readonly findings: readonly BrowserOnlineCorrectionFindingV1[]; readonly truncated: boolean; readonly reasonCodes: readonly [] } } = {
      status: 'VIEW', view: { schemaVersion: 1, sessionId, findings: [finding], truncated: false, reasonCodes: [] },
    }
    const baseListeners = new Set<() => void>()
    const mutableBase = { getSnapshot: () => baseSnapshot, subscribe: (listener: () => void) => { baseListeners.add(listener); return () => baseListeners.delete(listener) } }
    const mutableBaseClient = { getSource: () => mutableBase, retain: () => undefined, release: () => undefined }
    let checkSnapshot = Object.freeze({ status: 'VIEW' as const, findingId, view: checkView })
    const checkSource = { getSnapshot: () => checkSnapshot, subscribe: () => () => undefined }
    let releaseCalls = 0
    const throwingReleaseClient = { getSource: () => checkSource, setFinding: () => true, retain: () => true,
      release: () => { releaseCalls += 1; throw new Error('disposed optional client') } }
    const view = render(<OnlineCorrectionDock sessionId={sessionId} onlineCorrectionClient={mutableBaseClient as never}
      correctionHistoricalContextClient={historyClient as never} correctionNextCheckClient={throwingReleaseClient as never}
      t={key => onlineCorrectionEn[key]} />)
    expect(screen.getByText('The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.')).toBeTruthy()
    const f2Check = nextCheckRead(sessionId, postFinding.findingId, Date.now(), {
      findingKind: 'POSTCONDITION_NOT_SATISFIED', checkCode: 'INSPECT_WRITTEN_CONTENT_V1', evidenceCode: 'F2_CURRENT_VERIFIED_MISMATCH_V1',
    } as Partial<CorrectionNextCheckReadV1>)
    await act(async () => {
      baseSnapshot = { status: 'VIEW', view: { schemaVersion: 1, sessionId, findings: [postFinding], truncated: false, reasonCodes: [] } }
      checkSnapshot = Object.freeze({ status: 'VIEW', findingId: postFinding.findingId, view: f2Check })
      for (const listener of [...baseListeners]) listener()
      view.rerender(<OnlineCorrectionDock sessionId={sessionId} onlineCorrectionClient={mutableBaseClient as never}
        correctionHistoricalContextClient={historyClient as never} correctionNextCheckClient={throwingReleaseClient as never}
        t={key => onlineCorrectionEn[key]} />)
    })
    expect(releaseCalls).toBeGreaterThan(0)
    expect(screen.getByText('The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.')).toBeTruthy()
    expect(screen.getByText('Independently inspect the final content against the intended write result.')).toBeTruthy()
  })
})
