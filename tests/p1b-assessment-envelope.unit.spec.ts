import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'
import type { FoundationDiagnostics } from '../src/host/operation-foundation.ts'
import {
  ApprovalAssessmentCoordinator,
  type AssessmentDiagnostic,
} from '../src/host/assessment-envelope.ts'

function fakeSession(id: string): Session {
  return { id } as unknown as Session
}

function fakeExecution(session: Session, callId: string, name = 'probe'): ToolExecution {
  return {
    callId: callId as ToolCallId,
    name,
    arguments: {},
    signal: new AbortController().signal,
    token: Symbol('execution'),
    agent: { session } as unknown as Agent,
  } as ToolExecution
}

function asked(id: string, toolName: string, callId?: string): SessionEvent {
  return { type: 'approval/asked', data: { id, toolName, ...(callId === undefined ? {} : { callId: callId as ToolCallId }) } } as never
}

function decided(id: string, outcome: string): SessionEvent {
  return { type: 'approval/decided', data: { id, outcome } } as never
}

function foundation(status: 'CAPTURED' | 'DEGRADED' | 'NOT_FOUND' = 'CAPTURED'): FoundationDiagnostics {
  return {
    get: (id: string) => ({
      executionId: id,
      status,
      toolKind: 'unknown',
      reasonCodes: [],
      boundary: {
        workspaceContained: 'unknown',
        targetScope: 'unknown',
        sandboxActive: 'unknown',
        sandboxCovered: 'unknown',
        rollbackAvailable: 'unknown',
        checkpointAvailable: 'unknown',
      },
    }),
  } as FoundationDiagnostics
}

function setup(status: 'CAPTURED' | 'DEGRADED' | 'NOT_FOUND' = 'CAPTURED') {
  const session = fakeSession('assessment-session')
  const index = new ActiveExecutionIndex()
  const exec = fakeExecution(session, 'call-1')
  const executionId = index.observePreExecute(exec)!
  const coordinator = new ApprovalAssessmentCoordinator(foundation(status))
  return { session, index, exec, executionId, coordinator }
}

function get(coordinator: ApprovalAssessmentCoordinator, session: Session, id: string): AssessmentDiagnostic {
  return coordinator.diagnostics.getForApproval(session, id)
}

describe('Phase 1B approval assessment envelope', () => {
  it('P1B-01 binds one exact live execution and immediately remains unavailable', () => {
    const { session, index, executionId, coordinator } = setup()
    expect(coordinator.observeSessionEvent(session, asked('approval-1', 'probe', 'call-1'), index)).toBe('RECORDED')
    const diagnostic = get(coordinator, session, 'approval-1')

    expect(diagnostic).toMatchObject({
      schemaVersion: 1,
      association: 'BOUND',
      status: 'unavailable',
      stage: 'not-started',
      executionId,
      closed: false,
    })
    expect(diagnostic.assessmentId).toMatch(/^ra-assessment-[0-9a-f-]{36}$/)
    expect(diagnostic.reasonCodes).toContain('ASSESSOR_NOT_IMPLEMENTED')
  })

  it('P1B-02 never falls back across Sessions, history, or a missing callId', () => {
    const { session, index, coordinator } = setup()
    const otherSession = fakeSession('assessment-session')
    expect(coordinator.observeSessionEvent(otherSession, asked('wrong-session', 'probe', 'call-1'), index)).toBe('RECORDED')
    expect(get(coordinator, otherSession, 'wrong-session').association).toBe('UNBOUND')
    expect(get(coordinator, otherSession, 'wrong-session')).not.toHaveProperty('executionId')
    expect(get(coordinator, otherSession, 'wrong-session').reasonCodes).toContain('NO_ACTIVE_EXECUTION')

    expect(coordinator.observeSessionEvent(session, asked('missing-call', 'probe'), index)).toBe('RECORDED')
    expect(get(coordinator, session, 'missing-call').association).toBe('UNBOUND')
    expect(get(coordinator, session, 'missing-call')).not.toHaveProperty('executionId')
    expect(get(coordinator, session, 'missing-call').reasonCodes).toContain('MISSING_CALL_ID')
  })

  it('P1B-03 preserves ambiguity and never chooses one same-callId candidate', () => {
    const session = fakeSession('ambiguous-session')
    const index = new ActiveExecutionIndex()
    index.observePreExecute(fakeExecution(session, 'same-call', 'first'))
    index.observePreExecute(fakeExecution(session, 'same-call', 'second'))
    const coordinator = new ApprovalAssessmentCoordinator(foundation())

    expect(coordinator.observeSessionEvent(session, asked('ambiguous', 'first', 'same-call'), index)).toBe('RECORDED')
    expect(get(coordinator, session, 'ambiguous').association).toBe('AMBIGUOUS')
    expect(get(coordinator, session, 'ambiguous')).not.toHaveProperty('executionId')
    expect(get(coordinator, session, 'ambiguous')).not.toHaveProperty('assessmentId')
    expect(get(coordinator, session, 'ambiguous').reasonCodes).toContain('AMBIGUOUS_EXECUTION')
  })

  it('P1B-04 makes duplicate asked idempotent, conflicts fail closed, and approval ids stay separate', () => {
    const { session, index, coordinator } = setup()
    expect(coordinator.observeSessionEvent(session, asked('same', 'probe', 'call-1'), index)).toBe('RECORDED')
    const first = get(coordinator, session, 'same')
    expect(coordinator.observeSessionEvent(session, asked('same', 'probe', 'call-1'), index)).toBe('DUPLICATE')
    expect(get(coordinator, session, 'same').assessmentId).toBe(first.assessmentId)
    expect(coordinator.observeSessionEvent(session, asked('same', 'other-tool', 'other-call'), index)).toBe('CONFLICT')
    const conflicted = get(coordinator, session, 'same')
    expect(conflicted).toMatchObject({ association: 'UNBOUND', status: 'unavailable', closed: false })
    expect(conflicted).not.toHaveProperty('executionId')
    expect(conflicted).not.toHaveProperty('assessmentId')
    expect(conflicted.reasonCodes).toContain('CORRELATION_CONFLICT')
    expect(coordinator.observeSessionEvent(session, decided('same', 'rejected'), index)).toBe('DECIDED')
    expect(get(coordinator, session, 'same')).toMatchObject({ association: 'UNBOUND', closed: true, observedOutcome: 'rejected' })
    expect(get(coordinator, session, 'same')).not.toHaveProperty('executionId')
    expect(get(coordinator, session, 'same')).not.toHaveProperty('assessmentId')
    expect(coordinator.observeSessionEvent(session, asked('second', 'probe', 'call-1'), index)).toBe('RECORDED')
    expect(get(coordinator, session, 'second').assessmentId).not.toBe(first.assessmentId)
  })

  it('P1B-05 distinguishes Foundation completeness without fabricating operationHash or readiness', () => {
    const degraded = setup('DEGRADED')
    degraded.coordinator.observeSessionEvent(degraded.session, asked('degraded', 'probe', 'call-1'), degraded.index)
    expect(get(degraded.coordinator, degraded.session, 'degraded')).toMatchObject({ association: 'BOUND', status: 'unavailable' })
    expect(get(degraded.coordinator, degraded.session, 'degraded').reasonCodes).toContain('FOUNDATION_DEGRADED')
    expect(get(degraded.coordinator, degraded.session, 'degraded')).not.toHaveProperty('operationHash')
    expect(get(degraded.coordinator, degraded.session, 'degraded')).not.toHaveProperty('ready')

    const unavailable = setup('NOT_FOUND')
    unavailable.coordinator.observeSessionEvent(unavailable.session, asked('missing-foundation', 'probe', 'call-1'), unavailable.index)
    expect(get(unavailable.coordinator, unavailable.session, 'missing-foundation').reasonCodes).toContain('FOUNDATION_UNAVAILABLE')
  })

  it('P1B-06 closes on the observed native outcome and ignores later updates', () => {
    const { session, index, coordinator } = setup()
    coordinator.observeSessionEvent(session, asked('close-me', 'probe', 'call-1'), index)
    expect(coordinator.observeSessionEvent(session, decided('close-me', 'allowed-once'), index)).toBe('DECIDED')
    const closed = get(coordinator, session, 'close-me')
    expect(closed).toMatchObject({ closed: true, observedOutcome: 'allowed-once', status: 'unavailable' })
    expect(coordinator.observeSessionEvent(session, decided('close-me', 'rejected'), index)).toBe('CLOSED')
    expect(coordinator.observeSessionEvent(session, asked('close-me', 'changed', 'different'), index)).toBe('CLOSED')
    expect(get(coordinator, session, 'close-me')).toEqual(closed)
  })

  it('P1B-07 ignores orphan decisions and generation disposal prevents revival', () => {
    const { session, index, coordinator } = setup()
    expect(coordinator.observeSessionEvent(session, decided('orphan', 'rejected'), index)).toBe('ORPHAN_DECISION')
    for (let i = 0; i < 1000; i += 1) coordinator.observeSessionEvent(session, decided(`orphan-${i}`, 'rejected'), index)
    expect(coordinator.getIssueSummary()).toMatchObject({
      orphanDecisions: 1001,
      capacityExceeded: 0,
      reasonCodes: ['ORPHAN_DECISION'],
    })
    expect(get(coordinator, session, 'orphan').status).toBe('not-found')
    coordinator.observeSessionEvent(session, asked('late', 'probe', 'call-1'), index)
    coordinator.dispose()
    expect(get(coordinator, session, 'late')).toMatchObject({ status: 'not-found', reasonCodes: ['NOT_FOUND'] })
    expect(coordinator.observeSessionEvent(session, decided('late', 'allowed-once'), index)).toBe('IGNORED')
  })

  it('P1B-08 owns records by exact Session object and disposes only that Session', () => {
    const { session, index, coordinator } = setup()
    const sameTextSession = fakeSession(session.id)
    coordinator.observeSessionEvent(session, asked('owned', 'probe', 'call-1'), index)
    expect(get(coordinator, sameTextSession, 'owned').status).toBe('not-found')
    coordinator.observeSessionDisposed(session)
    expect(get(coordinator, session, 'owned').status).toBe('not-found')
  })

  it('P1B-09 evicts closed records, expires them by clock, and refuses all-active overflow', () => {
    let now = 0
    const session = fakeSession('capacity-session')
    const index = new ActiveExecutionIndex()
    const firstExec = fakeExecution(session, 'first')
    const secondExec = fakeExecution(session, 'second')
    const thirdExec = fakeExecution(session, 'third')
    index.observePreExecute(firstExec)
    index.observePreExecute(secondExec)
    index.observePreExecute(thirdExec)
    const coordinator = new ApprovalAssessmentCoordinator(foundation(), { clock: () => now, maxRecords: 2, completedTtlMs: 10 })
    coordinator.observeSessionEvent(session, asked('first', 'first', 'first'), index)
    coordinator.observeSessionEvent(session, asked('second', 'second', 'second'), index)
    expect(coordinator.observeSessionEvent(session, asked('third', 'third', 'third'), index)).toBe('CAPACITY_EXCEEDED')
    coordinator.observeSessionEvent(session, decided('first', 'rejected'), index)
    expect(coordinator.observeSessionEvent(session, asked('third', 'third', 'third'), index)).toBe('RECORDED')
    expect(get(coordinator, session, 'first').status).toBe('not-found')
    coordinator.observeSessionEvent(session, decided('second', 'rejected'), index)
    now = 10
    expect(get(coordinator, session, 'second').status).toBe('not-found')

    const activeCoordinator = new ApprovalAssessmentCoordinator(foundation(), { maxRecords: 1 })
    const activeSession = fakeSession('all-active')
    const activeIndex = new ActiveExecutionIndex()
    activeIndex.observePreExecute(fakeExecution(activeSession, 'active'))
    activeCoordinator.observeSessionEvent(activeSession, asked('active', 'probe', 'active'), activeIndex)
    expect(activeCoordinator.observeSessionEvent(activeSession, asked('overflow', 'probe', 'missing'), activeIndex)).toBe('CAPACITY_EXCEEDED')
    expect(activeCoordinator.getIssueSummary()).toMatchObject({
      orphanDecisions: 0,
      capacityExceeded: 1,
      reasonCodes: ['CAPACITY_EXCEEDED'],
    })
    expect(get(activeCoordinator, activeSession, 'active').association).toBe('BOUND')
    expect(get(activeCoordinator, activeSession, 'overflow').status).toBe('not-found')
  })

  it('P1B-10 returns detached frozen diagnostics, ignores reason payloads, and contains clock faults', () => {
    const session = fakeSession('privacy-session')
    const index = new ActiveExecutionIndex()
    index.observePreExecute(fakeExecution(session, 'private-call'))
    const coordinator = new ApprovalAssessmentCoordinator(foundation(), { clock: () => { throw new Error('private clock') } })
    const data = { id: 'private-approval', toolName: 'probe', callId: 'private-call' } as Record<string, unknown>
    Object.defineProperty(data, 'reason', { get: () => { throw new Error('reason must not be read') } })
    expect(() => coordinator.observeSessionEvent(session, { type: 'approval/asked', data } as never)).not.toThrow()
    const diagnostic = get(coordinator, session, 'private-approval')
    expect(Object.isFrozen(diagnostic)).toBe(true)
    expect(Object.isFrozen(diagnostic.reasonCodes)).toBe(true)
    expect(JSON.stringify(diagnostic)).not.toContain('private clock')
    expect(() => { (diagnostic as { status: string }).status = 'pending' }).toThrow()
  })

  it('P1B-12 preserves completed TTL timestamps across a NaN clock fault', () => {
    let now = 10_000
    let fault = false
    const session = fakeSession('clock-session')
    const index = new ActiveExecutionIndex()
    index.observePreExecute(fakeExecution(session, 'clock-call'))
    const coordinator = new ApprovalAssessmentCoordinator(foundation(), {
      clock: () => fault ? Number.NaN : now,
      completedTtlMs: 10,
    })

    coordinator.observeSessionEvent(session, asked('clocked', 'probe', 'clock-call'), index)
    const started = get(coordinator, session, 'clocked')
    fault = true
    coordinator.observeSessionEvent(session, decided('clocked', 'allowed-once'), index)
    const closed = get(coordinator, session, 'clocked')
    expect(closed.updatedAt).toBeGreaterThanOrEqual(started.startedAt)
    expect(closed.observedOutcome).toBe('allowed-once')

    fault = false
    now = started.startedAt + 9
    expect(get(coordinator, session, 'clocked').status).toBe('unavailable')
    now = started.startedAt + 10
    expect(get(coordinator, session, 'clocked').status).toBe('not-found')
  })
})
