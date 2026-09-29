import { describe, expect, it } from 'vitest'
import { ToolCallId, createToolResultMessage } from '@deepseek-ai/dsh-llm'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult, ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import {
  foldLedgerSnapshot,
  LedgerController,
  type LedgerSnapshot,
} from '../src/host/ledger.ts'

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

function call(callId: string, name = 'r4-tool'): SourceEvent {
  return { type: 'tool/call', data: { turn: 1, step: 1, callId: ToolCallId(callId), name, arguments: '{"secret":"private"}' } }
}

function result(callId: string, isError = false): SourceEvent {
  return {
    type: 'tool/result',
    data: {
      turn: 1,
      step: 1,
      message: createToolResultMessage({
        callId: ToolCallId(callId),
        content: [{ type: 'text', text: 'private-output' }],
        isError,
      }),
    },
  }
}

function asked(id: string, callId?: string): SourceEvent {
  return {
    type: 'approval/asked',
    data: { id, toolName: 'r4-tool', ...callId === undefined ? {} : { callId: ToolCallId(callId) }, reason: 'private-reason' },
  }
}

function decided(id: string, outcome: 'allowed-once' | 'rejected' | 'cancelled' | 'unavailable'): SourceEvent {
  return { type: 'approval/decided', data: { id, outcome } }
}

function sessionWith(source: readonly SessionEvent[] = []): { session: Session; set: (next: readonly SessionEvent[]) => void } {
  let current = source
  const session = {
    id: 'r4-session',
    snapshotEvents: () => current,
  } as unknown as Session
  return { session, set: (next) => { current = next } }
}

function execution(session: Session, callId = 'live-call'): ToolExecution {
  return {
    callId: ToolCallId(callId),
    rootCallId: ToolCallId(callId),
    name: 'r4-tool',
    arguments: { secret: 'private-input' },
    agent: { session } as unknown as Agent,
    signal: new AbortController().signal,
    token: Symbol('r4-token') as ToolExecutionToken,
  }
}

function liveResult(isError = false): ToolExecutionResult {
  return {
    isError,
    content: [{ type: 'text', text: 'private-live-output' }],
    ...(isError ? { error: { message: 'private-live-error' } } : { value: 'private-live-value' }),
  } as ToolExecutionResult
}

function durableSnapshot(body: SourceEvent[], options?: { limit?: number }): LedgerSnapshot {
  return foldLedgerSnapshot('r4-session', bracket(body), options)
}

describe('T04 R4 bounded ledger fault folding', () => {
  it('F-001 recovers a full exact live final without inventing a START or ExecutionId', () => {
    const { session } = sessionWith()
    const controller = new LedgerController()
    controller.observeResult(execution(session), liveResult(true))
    const snapshot = controller.snapshot(session)
    expect(snapshot.health).toBe('RECOVERED')
    expect(snapshot.executions).toMatchObject([{
      lifecycle: 'SETTLED',
      health: 'RECOVERED',
      issueCodes: expect.arrayContaining(['MISSING_START', 'RECOVERED_FROM_FULL_EXEC']),
      terminal: { isError: true, provenance: 'LIVE_FINAL' },
    }])
    expect(JSON.stringify(snapshot)).not.toContain('executionId')
    expect(JSON.stringify(snapshot)).not.toContain('private-live')
  })

  it('F-002 keeps a START without a result incomplete and degraded', () => {
    const { session } = sessionWith()
    const controller = new LedgerController()
    controller.observePreExecute(execution(session))
    const snapshot = controller.snapshot(session)
    expect(snapshot.executions[0]).toMatchObject({ lifecycle: 'INCOMPLETE', health: 'DEGRADED' })
    expect(snapshot.executions[0]!.terminalClaims).toHaveLength(0)
  })

  it('F-003 deduplicates one source key but keeps equal payloads at distinct seqs', () => {
    const source = bracket([call('same')])
    const { session } = sessionWith(source)
    const controller = new LedgerController()
    controller.observeSessionEvent(session, source[2]!)
    controller.observeSessionEvent(session, source[2]!)
    expect(controller.snapshot(session).executions).toHaveLength(1)

    const distinct = durableSnapshot([call('same'), call('same')])
    expect(distinct.executions.map(item => item.occurrence.callSeq)).toEqual([2, 3])
    expect(durableSnapshot([call('same'), result('same'), result('same', true)]).executions[0]).toMatchObject({
      lifecycle: 'UNRESOLVED',
      issueCodes: ['TERMINAL_CONFLICT'],
      terminalClaims: [{ isError: false }, { isError: true }],
    })
    expect(durableSnapshot([call('same'), call('other')], { limit: 1 })).toMatchObject({
      truncated: true,
      executions: [{ occurrence: { callSeq: 2 } }],
    })
  })

  it('F-004 retains conflicting terminals without last-writer-wins', () => {
    const snapshot = durableSnapshot([call('conflict'), result('conflict'), result('conflict', true)])
    expect(snapshot.health).toBe('DEGRADED')
    expect(snapshot.executions[0]).toMatchObject({
      lifecycle: 'UNRESOLVED',
      terminalClaims: [{ isError: false }, { isError: true }],
      issueCodes: ['TERMINAL_CONFLICT'],
    })
    expect(snapshot.executions[0]).not.toHaveProperty('terminal')
  })

  it('F-005 leaves orphan, missing-callId, and colliding approvals unbound or ambiguous', () => {
    const orphan = durableSnapshot([decided('orphan', 'rejected')])
    expect(orphan.approvals[0]).toMatchObject({ lifecycle: 'UNBOUND', binding: 'AMBIGUOUS' })
    const colliding = durableSnapshot([asked('same-approval', 'one'), asked('same-approval', 'two')])
    expect(colliding.approvals[0]).toMatchObject({ lifecycle: 'AMBIGUOUS', binding: 'AMBIGUOUS' })
    const missingCallId = durableSnapshot([asked('no-call-id')])
    expect(missingCallId.approvals[0]).toMatchObject({ lifecycle: 'STALE', binding: 'UNBOUND' })
    expect(JSON.stringify(colliding)).not.toContain('private-reason')
  })

  it('F-006 folds live final plus unique durable confirmation into one execution', () => {
    const source = bracket([call('confirm'), result('confirm')])
    const { session } = sessionWith(source)
    const controller = new LedgerController()
    const exec = execution(session, 'confirm')
    controller.observePreExecute(exec)
    controller.observeResult(exec, liveResult(false))
    const snapshot = controller.snapshot(session)
    expect(snapshot.executions).toHaveLength(1)
    expect(snapshot.executions[0]).toMatchObject({
      lifecycle: 'SETTLED',
      provenance: 'LIVE_FINAL',
      terminal: { provenance: 'LIVE_FINAL', isError: false },
      terminalClaims: [{ provenance: 'LIVE_FINAL', isError: false }],
    })
    expect(snapshot.executions[0]!.confirmations).toHaveLength(1)
  })

  it('F-007 reports live/durable terminal disagreement as a bounded conflict', () => {
    const source = bracket([call('mismatch'), result('mismatch', true)])
    const { session } = sessionWith(source)
    const controller = new LedgerController()
    const exec = execution(session, 'mismatch')
    controller.observePreExecute(exec)
    controller.observeResult(exec, liveResult(false))
    const snapshot = controller.snapshot(session)
    expect(snapshot.executions).toHaveLength(1)
    expect(snapshot.executions[0]).toMatchObject({
      health: 'DEGRADED',
      terminal: { provenance: 'LIVE_FINAL', isError: false },
      issueCodes: expect.arrayContaining(['TERMINAL_CONFLICT']),
      terminalClaims: [{ provenance: 'LIVE_FINAL', isError: false }, { provenance: 'DURABLE_SOURCE', isError: true }],
    })
  })

  it('F-008 makes repeated idle recovery idempotent without duplicate history', () => {
    const source = bracket([call('idle'), result('idle')])
    const { session } = sessionWith(source)
    const first = new LedgerController()
    const before = first.snapshot(session)
    first.dispose()
    first.observeSessionEvent(session, source[2]!)
    const after = first.snapshot(session)
    const second = new LedgerController().snapshot(session)
    expect(after).toEqual(before)
    expect(second.executions).toHaveLength(1)
  })

  it('F-009 never revives a disposed live execution or pending approval', () => {
    const { session } = sessionWith()
    const controller = new LedgerController()
    const exec = execution(session, 'retired')
    controller.observePreExecute(exec)
    controller.dispose()
    controller.observeResult(exec, liveResult(false))
    expect(controller.snapshot(session).executions[0]).not.toHaveProperty('terminal')
    expect(new LedgerController().snapshot(session).executions).toHaveLength(0)
  })

  it('F-010 restores only minimal historical facts from a trusted Session snapshot', () => {
    const snapshot = durableSnapshot([call('restored'), result('restored')])
    expect(snapshot.sourceComplete).toBe(true)
    expect(snapshot.executions[0]).toMatchObject({
      occurrence: { kind: 'DURABLE', callSeq: 2 },
      provenance: 'DURABLE_SOURCE',
      lifecycle: 'SETTLED',
    })
    expect(snapshot.executions.every(item => item.occurrence.kind !== 'LIVE')).toBe(true)
  })

  it('F-011 repeats the same snapshot deterministically', () => {
    const source = bracket([call('repeat'), result('repeat')])
    expect(foldLedgerSnapshot('same-text-id', source)).toEqual(foldLedgerSnapshot('same-text-id', source))
    expect(foldLedgerSnapshot('same-text-id', source).executions).toHaveLength(1)
  })

  it('F-012 reconciles a bounded source gap only after a complete snapshot', () => {
    const source = bracket([call('gap'), result('gap')])
    const { session } = sessionWith(source)
    const controller = new LedgerController()
    controller.observeSessionEvent(session, source[3]!)
    controller.observeSessionEvent(session, source[2]!)
    const snapshot = controller.snapshot(session)
    expect(snapshot).toMatchObject({ health: 'RECOVERED', sourceComplete: true })
    expect(snapshot.issues).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SOURCE_GAP' })]))
  })

  it('F-013 folds snapshot/feed overlap once and does not omit committed facts', () => {
    const source = bracket([call('overlap'), result('overlap')])
    const { session } = sessionWith(source)
    const controller = new LedgerController()
    for (const event of source) controller.observeSessionEvent(session, event)
    const snapshot = controller.snapshot(session)
    expect(snapshot.executions).toHaveLength(1)
    expect(snapshot.issues).not.toEqual(expect.arrayContaining([expect.objectContaining({ code: 'SOURCE_CONFLICT' })]))
  })

  it('F-014 marks a replay-only pending approval stale rather than cancelling it', () => {
    const snapshot = durableSnapshot([asked('stale')])
    expect(snapshot.approvals[0]).toMatchObject({
      lifecycle: 'STALE',
      health: 'DEGRADED',
      issueCodes: ['STALE_PENDING_APPROVAL'],
    })
    expect(snapshot.approvals[0]).not.toHaveProperty('outcome')
  })

  it('F-015 preserves unresolved T03 parent/root evidence', () => {
    const source = events(
      { type: 'turn/start', data: { turn: 1 } },
      { type: 'step/start', data: { turn: 1, step: 1 } },
      call('root'),
      { type: 'tool/ptc-dispatch-start', data: { rootCallId: 'wrong', parentCallId: 'wrong', subCallId: 'child', name: 'echo', arguments: { secret: 'private' } } },
      { type: 'step/end', data: { turn: 1, step: 1 } },
      { type: 'turn/end', data: { turn: 1, reason: { kind: 'completed' } } },
    )
    const snapshot = foldLedgerSnapshot('r4-session', source)
    expect(snapshot.ptc?.occurrences[0]?.root).toMatchObject({ status: 'UNRESOLVED' })
    expect(snapshot.ptc?.occurrences[0]?.root).not.toMatchObject({ target: { seq: 2 } })
  })
})
