import { describe, expect, it } from 'vitest'
import { parseBridgeRead, type RiskAdvisorBridgeViewV4 } from '../src/bridge-contract.ts'
import { PresentationStore } from '../src/client/presentation-store.ts'

describe('Phase 9 Bridge V4', () => {
  it('accepts deep pending views and keeps older protocol stages intact', () => {
    const view: RiskAdvisorBridgeViewV4 = { schemaVersion: 4, sessionId: 's', callId: 'c', association: 'BOUND', status: 'pending', stage: 'deep', reasonCodes: ['DEEP_JUDGE_CAPABILITY_UNAVAILABLE'], updatedAt: 1 }
    expect(parseBridgeRead({ kind: 'VIEW', view })).toMatchObject({ kind: 'VIEW', view: { schemaVersion: 4, stage: 'deep' } })
    expect(parseBridgeRead({ kind: 'VIEW', view: { schemaVersion: 3, sessionId: 's', callId: 'c', association: 'BOUND', status: 'pending', stage: 'evidence', reasonCodes: ['EVIDENCE_PENDING'], updatedAt: 1 } })).toMatchObject({ kind: 'VIEW', view: { schemaVersion: 3 } })
    expect(parseBridgeRead({ kind: 'VIEW', view: { ...view, stage: 'unknown' } })).toBeUndefined()
  })

  it('polls deep without overlap and stops at complete', async () => {
    let calls = 0
    const timers: Array<() => void> = []
    const store = new PresentationStore({
      active: async () => {
        calls += 1
        return { kind: 'VIEW' as const, view: { schemaVersion: 4 as const, sessionId: 's', callId: 'c', association: 'BOUND' as const, status: calls < 2 ? 'pending' as const : 'ready' as const, stage: calls < 2 ? 'deep' as const : 'complete' as const, ...(calls < 2 ? {} : { assessmentId: 'a' }), reasonCodes: [], updatedAt: calls } }
      },
      assessment: async () => ({ kind: 'NOT_FOUND' as const }),
    }, 's', 'c', undefined, { setTimer: callback => { timers.push(callback); return timers.length as unknown as ReturnType<typeof setTimeout> }, clearTimer: () => undefined, now: () => 1 })
    store.start()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(calls).toBe(1)
    timers.shift()?.()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(calls).toBe(2)
    expect(store.getSnapshot().status).toBe('READY')
    expect(timers).toHaveLength(0)
    store.dispose()
  })
})
