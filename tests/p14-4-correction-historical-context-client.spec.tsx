import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { BrowserOnlineCorrectionFindingV1, BrowserOnlineCorrectionViewV1 } from '../src/online-correction-contract.ts'
import type { CorrectionHistoricalContextReadV1 } from '../src/correction-historical-context-contract.ts'
import { CorrectionHistoricalContextStore } from '../src/client/correction-historical-context-store.ts'
import { CorrectionHistoricalContextClient } from '../src/client/correction-historical-context-client.ts'
import { OnlineCorrectionDock } from '../src/client/OnlineCorrectionDock.tsx'
import { liveCorrectionFindingId } from '../src/host/live-correction.ts'

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
      this.tasks.delete(next[0])
      this.now = next[1].at
      this.wall += Math.max(0, next[1].at - this.now)
      next[1].callback()
      await flush()
    }
    this.now = end
    this.wall += ms
    await flush()
  }
}

const historical = Object.freeze({
  guidanceId: `ra-guidance-v1_${'a'.repeat(64)}`,
  guidanceRevisionId: `ra-guidance-v1_${'a'.repeat(64)}_00000001`,
  patternId: `ra-pattern-v1_${'b'.repeat(64)}`,
  patternRevisionId: `ra-pattern-v1_${'b'.repeat(64)}_00000001`,
  patternProvenanceDigest: 'c'.repeat(64), evidenceStrength: 'QUALIFIED_PATTERN' as const,
  supportCount: 3, supportUtcDateCount: 2, title: 'Verified historical pattern' as const,
  observation: 'A qualified verified-success pattern covers 3 distinct Episodes across 2 UTC dates.',
  contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.' as const,
  nextCheck: 'Independently verify the current target and expected postcondition.' as const,
  authorityNotice: 'This guidance does not determine risk or grant permission or approval.' as const,
})

function historyRead(sessionId: string, findingId: string, observedAt: number): CorrectionHistoricalContextReadV1 {
  return Object.freeze({ schemaVersion: 1, kind: 'VIEW', sessionId, findingId,
    findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', historical, observedAt })
}

function finding(id: string, observedAt: number): BrowserOnlineCorrectionFindingV1 {
  return Object.freeze({ findingId: id, kind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', diagnosis: 'REPEATED_SAME_SIGNATURE_FAILURE',
    disposition: 'ADVISE', advisoryCode: 'STOP_EXACT_RETRY_PATH_V1', observedAt })
}

function correctionView(sessionId: string, findings: readonly BrowserOnlineCorrectionFindingV1[]): BrowserOnlineCorrectionViewV1 {
  return Object.freeze({ schemaVersion: 1, sessionId, findings, truncated: false, reasonCodes: Object.freeze([]) })
}

async function flush(): Promise<void> { for (let index = 0; index < 12; index += 1) await Promise.resolve() }

function setupStore(clock: FakeClock, read: (request: { sessionId: string; findingId: string }, signal?: AbortSignal) => Promise<unknown>) {
  const bridge = { read }
  let rpcCalls = 0
  const connection = {
    rpc: { call: async (_channel: string, _endpoint: string, payload: unknown, signal?: AbortSignal) => { rpcCalls += 1; return { ok: true, value: await read(payload as { sessionId: string; findingId: string }, signal) } } },
    generation: { value: 1, listeners: new Set<() => void>(),
      getSnapshot() { return this.value }, subscribe(listener: () => void) { this.listeners.add(listener); return () => this.listeners.delete(listener) },
      advance() { this.value += 1; for (const listener of [...this.listeners]) listener() } },
  }
  const store = new CorrectionHistoricalContextStore(bridge as never, 'p14-4-client-session', connection as never, {
    clock: () => clock.now, wallClock: () => clock.wall, setTimer: clock.setTimer, clearTimer: clock.clearTimer,
  })
  return { store, connection, get rpcCalls() { return rpcCalls } }
}

describe('Phase 14.4 Client C9/C10 cancellation, generation and freshness', () => {
  it('owns one stable source per Session and disposes all sources at Client teardown', async () => {
    const clock = new FakeClock()
    clock.wall = Date.now()
    const env = setupStore(clock, async target => historyRead(target.sessionId, target.findingId, Date.now()))
    const client = new CorrectionHistoricalContextClient(env.connection as never)
    const first = client.getSource('p14-4-client-session')
    expect(client.getSource('p14-4-client-session')).toBe(first)
    client.setFinding('p14-4-client-session', `ra-correction-v1_${'5'.repeat(64)}`)
    client.retain('p14-4-client-session')
    await waitFor(() => expect(env.rpcCalls).toBe(1))
    expect(first.getSnapshot()).toMatchObject({ status: 'VIEW' })
    client.dispose()
    expect(first.getSnapshot()).toEqual({ status: 'EMPTY' })
    expect(() => client.getSource('p14-4-client-session')).toThrow('correction historical context client disposed')
  })

  it('C9 synchronously clears on Finding switch, throttles at 1Hz, and ignores a late old response', async () => {
    const clock = new FakeClock()
    const deferred: Array<(value: unknown) => void> = []
    const store = setupStore(clock, (target) => new Promise(resolve => {
      deferred.push(value => resolve({ schemaVersion: 1, kind: 'VIEW', ...target,
        findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', historical, observedAt: clock.wall }))
    }))
    const first = `ra-correction-v1_${'1'.repeat(64)}`
    const second = `ra-correction-v1_${'2'.repeat(64)}`
    store.store.setFinding(first)
    store.store.start()
    await clock.advance(0)
    expect(deferred).toHaveLength(1)
    store.store.setFinding(second)
    expect(store.store.getSnapshot()).toEqual({ status: 'EMPTY' })
    await clock.advance(999)
    expect(deferred).toHaveLength(1)
    await clock.advance(1)
    expect(deferred).toHaveLength(2)
    deferred[0]!({ schemaVersion: 1, kind: 'VIEW', sessionId: 'p14-4-client-session', findingId: first,
      findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', historical, observedAt: clock.wall })
    deferred[1]!({ schemaVersion: 1, kind: 'VIEW', sessionId: 'p14-4-client-session', findingId: second,
      findingKind: 'REPEATED_FAILURE_WITHOUT_PROGRESS', historical, observedAt: clock.wall })
    await flush()
    expect(store.store.getSnapshot()).toMatchObject({ status: 'VIEW', findingId: second })
    store.store.setFinding(undefined)
    expect(store.store.getSnapshot()).toEqual({ status: 'EMPTY' })
    store.store.stop()
  })

  it('C10 accepts age 1499ms, expires at 1500ms without a rerender, and rejects age 1500ms', async () => {
    for (const age of [1499, 1500]) {
      const clock = new FakeClock()
      const findingId = `ra-correction-v1_${String(age).padStart(64, '0')}`
      const env = setupStore(clock, async target => ({ ...historyRead(target.sessionId, target.findingId, clock.wall - age) }))
      env.store.setFinding(findingId); env.store.start()
      await clock.advance(0)
      await flush()
      if (age === 1499) {
        expect(env.store.getSnapshot()).toMatchObject({ status: 'VIEW', findingId })
        await clock.advance(1)
        expect(env.store.getSnapshot()).toEqual({ status: 'EMPTY' })
      } else expect(env.store.getSnapshot()).toEqual({ status: 'EMPTY' })
      env.store.stop()
    }
  })

  it('C9 clears on connection generation replacement and restarts with the current Finding only', async () => {
    const clock = new FakeClock()
    const calls: string[] = []
    const env = setupStore(clock, async target => {
      calls.push(target.findingId)
      return historyRead(target.sessionId, target.findingId, clock.wall)
    })
    const target = `ra-correction-v1_${'4'.repeat(64)}`
    env.store.setFinding(target); env.store.start()
    await clock.advance(0)
    expect(env.store.getSnapshot()).toMatchObject({ status: 'VIEW', findingId: target })
    env.connection.generation.advance()
    expect(env.store.getSnapshot()).toEqual({ status: 'EMPTY' })
    await clock.advance(1000)
    expect(calls).toEqual([target, target])
    env.store.stop()
  })
})

describe('Phase 14.4 OnlineCorrectionDock additive display C11', () => {
  it('keeps the original top-three advisory text and displays history only under the matching newest Finding', async () => {
    const sessionId = 'p14-4-ui-session'
    const id1 = liveCorrectionFindingId('exec-a', 'REPEATED_FAILURE_WITHOUT_PROGRESS')
    const id2 = liveCorrectionFindingId('exec-b', 'REPEATED_FAILURE_WITHOUT_PROGRESS')
    let baseSnapshot: { readonly status: 'VIEW'; readonly view: BrowserOnlineCorrectionViewV1 } = {
      status: 'VIEW', view: correctionView(sessionId, [finding(id1, 100)]),
    }
    const baseListeners = new Set<() => void>()
    const baseClient = {
      getSource: () => ({ getSnapshot: () => baseSnapshot, subscribe: (listener: () => void) => { baseListeners.add(listener); return () => baseListeners.delete(listener) } }),
      retain: () => undefined, release: () => undefined,
    }
    const clock = new FakeClock()
    const env = setupStore(clock, async target => historyRead(target.sessionId, target.findingId, clock.wall))
    const historyClient = {
      getSource: () => env.store,
      setFinding: (_sessionId: string, findingId: string | undefined) => env.store.setFinding(findingId),
      retain: () => env.store.start(), release: () => env.store.stop(),
    }
    const t = (key: string) => ({
      title: 'Execution advisory', 'kind.f1': 'Repeated failure', 'kind.f2': 'Postcondition mismatch',
      overflow: '{n} more', degraded: 'Some execution advisories may be unavailable.',
      'history.label': 'Verified historical context — not a diagnosis or fix',
      'history.warning': 'Same operation class only. Current target, Workspace and failure cause are unverified.',
      'history.title': 'Historical note', 'history.observation': 'Evidence', 'history.caveat': 'Applicability caveat',
      'history.nextCheck': 'Independent check', 'history.authority': 'Authority boundary',
    } as Record<string, string>)[key]!
    const view = render(<OnlineCorrectionDock sessionId={sessionId} onlineCorrectionClient={baseClient as never}
      correctionHistoricalContextClient={historyClient as never} t={t as never} />)
    await act(async () => { await clock.advance(0) })
    await waitFor(() => expect(view.container.querySelector('[data-correction-history]')).not.toBeNull())
    expect(view.container.textContent).toContain('The same operation is repeatedly failing')
    expect(view.container.textContent).toContain('Same operation class only. Current target, Workspace and failure cause are unverified.')

    baseSnapshot = { status: 'VIEW', view: correctionView(sessionId, [finding(id1, 100), finding(id2, 200)]) }
    await act(async () => { for (const listener of [...baseListeners]) listener() })
    expect(view.container.querySelector('[data-correction-history]')).toBeNull()
    expect(view.container.textContent).toContain('The same operation is repeatedly failing')
    view.unmount()
  })
})
