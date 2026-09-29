import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '@deepseek-ai/dsh-session'
import {
  PTC_REPLAY_LIMITS,
  replayPtcSnapshot,
  type PtcReplayProjection,
} from '../src/index.ts'

type SourceEvent = { type: string; data: Record<string, unknown> }

function events(...sources: SourceEvent[]): readonly SessionEvent[] {
  return sources.map((source, seq) => ({
    type: source.type,
    data: source.data,
    seq,
    time: seq,
  }) as unknown as SessionEvent)
}

function bracket(body: SourceEvent[]): readonly SessionEvent[] {
  return events(
    { type: 'turn/start', data: { turn: 1 } },
    { type: 'step/start', data: { turn: 1, step: 1 } },
    ...body,
    { type: 'step/end', data: { turn: 1, step: 1 } },
    { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
  )
}

function call(callId: string, name = 'run_code'): SourceEvent {
  return { type: 'tool/call', data: { turn: 1, step: 1, callId, name, arguments: '{"secret":"do-not-export"}' } }
}

function start(
  rootCallId: string,
  parentCallId: string,
  subCallId: string,
  name = 'echo',
): SourceEvent {
  return {
    type: 'tool/ptc-dispatch-start',
    data: {
      rootCallId, parentCallId, subCallId, name,
      arguments: { secret: 'do-not-export' },
    },
  }
}

function settle(
  rootCallId: string,
  parentCallId: string,
  subCallId: string,
  name = 'echo',
  isError = false,
): SourceEvent {
  return {
    type: 'tool/ptc-dispatch',
    data: {
      rootCallId, parentCallId, subCallId, name, isError,
      arguments: { secret: 'do-not-export' },
      content: [{ type: 'text', text: 'do-not-export' }],
      error: { name: 'HiddenError', code: 'HIDDEN', reason: 'do-not-export' },
    },
  }
}

function validProjection(body: SourceEvent[]): PtcReplayProjection {
  return replayPtcSnapshot('session-r3', bracket(body))
}

describe('T03 R3 durable PTC replay projection', () => {
  it('R3-01 recovers one root/child and pairs terminal provenance', () => {
    const projection = validProjection([
      call('root'),
      start('root', 'root', 'child-1'),
      settle('root', 'root', 'child-1'),
    ])
    expect(projection.status).toBe('COMPLETE')
    expect(projection.occurrences).toHaveLength(1)
    expect(projection.occurrences[0]).toMatchObject({
      occurrence: { kind: 'tool/ptc-dispatch-start', seq: 3, callId: 'child-1' },
      parent: { status: 'RECOVERED', target: { kind: 'tool/call', seq: 2, callId: 'root' } },
      root: { status: 'RECOVERED', target: { kind: 'tool/call', seq: 2, callId: 'root' } },
      settlement: { status: 'PAIRED', settlement: { seq: 4 }, isError: false },
    })
  })

  it('R3-02 keeps siblings on one root without making either the other parent', () => {
    const projection = validProjection([
      call('root'),
      start('root', 'root', 'sibling-a'),
      start('root', 'root', 'sibling-b'),
      settle('root', 'root', 'sibling-a'),
      settle('root', 'root', 'sibling-b'),
    ])
    expect(projection.occurrences).toHaveLength(2)
    for (const occurrence of projection.occurrences) {
      expect(occurrence.parent).toMatchObject({ status: 'RECOVERED', target: { seq: 2, callId: 'root' } })
      expect(occurrence.root).toMatchObject({ status: 'RECOVERED', target: { seq: 2, callId: 'root' } })
    }
  })

  it('R3-03 resolves a nested parent separately from the root', () => {
    const projection = validProjection([
      call('root'),
      start('root', 'root', 'parent-child'),
      settle('root', 'root', 'parent-child'),
      start('root', 'parent-child', 'nested-child'),
      settle('root', 'parent-child', 'nested-child'),
    ])
    expect(projection.occurrences[1]).toMatchObject({
      parent: { status: 'RECOVERED', target: { kind: 'tool/ptc-dispatch-start', seq: 3 } },
      root: { status: 'RECOVERED', target: { kind: 'tool/call', seq: 2 } },
    })
    expect(projection.occurrences[1]!.root).not.toMatchObject({ target: { seq: 5 } })
  })

  it('R3-04 is deterministic across repeated replay and never mints a live ExecutionId', () => {
    const source = bracket([call('root'), start('root', 'root', 'child'), settle('root', 'root', 'child')])
    const first = replayPtcSnapshot('session-r3', source)
    const second = replayPtcSnapshot('session-r3', source)
    expect(second).toEqual(first)
    expect(JSON.stringify(first)).not.toContain('executionId')
    expect(JSON.stringify(first)).not.toContain('ra-execution-')
  })

  it('R3-05 scopes reused parent and child IDs to different steps', () => {
    const source = events(
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'step/start', data: { turn: 1, step: 1 } },
      call('root'), start('root', 'root', 'reused'), settle('root', 'root', 'reused'),
      { type: 'step/end', data: { turn: 1, step: 1 } },
      { type: 'step/start', data: { turn: 1, step: 2 } },
      { type: 'tool/call', data: { turn: 1, step: 2, callId: 'root', name: 'run_code', arguments: '{}' } },
      start('root', 'root', 'reused'), settle('root', 'root', 'reused'),
      { type: 'step/end', data: { turn: 1, step: 2 } },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
    )
    const projection = replayPtcSnapshot('session-r3', source)
    expect(projection.status).toBe('COMPLETE')
    expect(projection.occurrences.map(item => item.occurrence.seq)).toEqual([3, 8])
    expect(projection.occurrences.map(item => item.parent.status)).toEqual(['RECOVERED', 'RECOVERED'])
    expect(projection.occurrences[0]!.parent).toMatchObject({ target: { seq: 2, step: 1 } })
    expect(projection.occurrences[1]!.parent).toMatchObject({ target: { seq: 7, step: 2 } })
  })

  it('R3-06 reports duplicate parent occurrences as AMBIGUOUS', () => {
    const projection = validProjection([
      call('root'), call('root'), start('root', 'root', 'child'), settle('root', 'root', 'child'),
    ])
    expect(projection.occurrences[0]!.parent).toMatchObject({
      status: 'AMBIGUOUS', candidates: [{ seq: 2 }, { seq: 3 }],
    })
    expect(projection.occurrences[0]!.root).toMatchObject({ status: 'AMBIGUOUS' })
  })

  it('R3-07 refuses to pair duplicate starts and duplicate settles', () => {
    const projection = validProjection([
      call('root'),
      start('root', 'root', 'duplicate'), start('root', 'root', 'duplicate'),
      settle('root', 'root', 'duplicate'), settle('root', 'root', 'duplicate'),
    ])
    expect(projection.occurrences).toHaveLength(2)
    expect(projection.occurrences.every(item => item.settlement.status === 'AMBIGUOUS')).toBe(true)
    expect(projection.orphanSettlements).toHaveLength(2)
    expect(projection.orphanSettlements.every(item => item.resolution.status === 'AMBIGUOUS')).toBe(true)
  })

  it('R3-08 distinguishes START_ONLY, SETTLE_ONLY, and missing parent evidence', () => {
    const projection = validProjection([
      call('root'),
      start('root', 'root', 'start-only'),
      settle('root', 'root', 'settle-only'),
      start('root', 'missing-parent', 'orphan-child'),
    ])
    expect(projection.occurrences[0]!.settlement.status).toBe('START_ONLY')
    expect(projection.occurrences[1]!.parent).toMatchObject({ status: 'UNRESOLVED', reason: 'NO_PARENT_OCCURRENCE' })
    expect(projection.orphanSettlements[0]!.resolution.status).toBe('SETTLE_ONLY')
  })

  it('R3-09 fails closed for inconsistent roots and missing step scope', () => {
    const malformed = events(
      { type: 'turn/start', data: { turn: 1 } },
      start('wrong-root', 'wrong-root', 'out-of-step'),
      { type: 'step/start', data: { turn: 1, step: 1 } },
      call('root'),
      start('wrong-root', 'wrong-root', 'bad-root'),
    )
    const projection = replayPtcSnapshot('session-r3', malformed)
    expect(projection.status).toBe('DEGRADED')
    expect(projection.issues.map(issue => issue.reason)).toContain('PTC_OUT_OF_SCOPE')
    expect(projection.occurrences[0]!.root).toMatchObject({ status: 'UNRESOLVED' })
  })

  it('R3-10 validates sequence/limits and returns detached sanitized output', () => {
    const source = bracket([call('root'), start('root', 'root', 'child'), settle('root', 'root', 'child', 'echo', true)])
    const projection = replayPtcSnapshot('session-r3', source)
    expect(JSON.stringify(projection)).not.toContain('do-not-export')
    expect(Object.isFrozen(projection)).toBe(true)
    expect(Object.isFrozen(projection.occurrences)).toBe(true)
    expect(Object.isFrozen(projection.occurrences[0])).toBe(true)
    expect(Object.isFrozen(projection.occurrences[0]!.parent)).toBe(true)
    expect(() => { (projection.occurrences as PtcReplayProjection['occurrences'] & { length: number }).length = 0 }).toThrow()

    const duplicateSeq = source.map(event => ({ ...event }))
    ;(duplicateSeq[3] as { seq: number }).seq = 2
    expect(replayPtcSnapshot('session-r3', duplicateSeq).status).toBe('DEGRADED')
    expect(replayPtcSnapshot('session-r3', Array.from({ length: PTC_REPLAY_LIMITS.maxSourceEvents + 1 }, () => source[0]!)).degradation)
      .toMatchObject({ reason: 'LIMIT_EXCEEDED' })
  })

  it('R3-11 exposes structural edges only and never semantic retry/escalation links', () => {
    const projection = validProjection([
      call('root'), start('root', 'root', 'retry-shaped'), settle('root', 'root', 'retry-shaped'),
      start('root', 'root', 'escalation-shaped'), settle('root', 'root', 'escalation-shaped'),
    ])
    expect(projection.occurrences[0]).not.toHaveProperty('retryOf')
    expect(projection.occurrences[0]).not.toHaveProperty('escalatesFrom')
    expect(projection.occurrences[0]!.parent).toMatchObject({ status: 'RECOVERED' })
    expect(projection.occurrences[1]!.root).toMatchObject({ status: 'RECOVERED' })
  })

  it('R3-12 isolates two Session snapshots with equal textual IDs', () => {
    const first = replayPtcSnapshot('same-session-id', bracket([
      call('root-a'), start('root-a', 'root-a', 'child-a'), settle('root-a', 'root-a', 'child-a'),
    ]))
    const second = replayPtcSnapshot('same-session-id', bracket([
      call('root-b'), start('root-b', 'root-b', 'child-b'), settle('root-b', 'root-b', 'child-b'),
    ]))
    expect(first.occurrences[0]!.root).toMatchObject({ target: { callId: 'root-a' } })
    expect(second.occurrences[0]!.root).toMatchObject({ target: { callId: 'root-b' } })
    expect(JSON.stringify(first)).not.toContain('root-b')
    expect(JSON.stringify(second)).not.toContain('root-a')
  })
})
