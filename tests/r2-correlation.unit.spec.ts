import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import type { PreToolDecision, ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { ActiveExecutionIndex } from '../src/host/correlation.ts'

function fakeSession(id: string): Session {
  return { id } as unknown as Session
}

function fakeExecution(
  session: Session | undefined,
  callId: string | undefined,
  options: { name?: string; parent?: symbol; rootCallId?: string } = {},
): ToolExecution {
  const agent = session === undefined ? undefined : { session } as unknown as Agent
  return {
    callId: callId as ToolCallId,
    name: options.name ?? 'probe',
    arguments: { bounded: true },
    signal: new AbortController().signal,
    token: Symbol('execution'),
    ...agent === undefined ? {} : { agent },
    ...options.parent === undefined ? {} : { parent: options.parent },
    ...options.rootCallId === undefined ? {} : { rootCallId: options.rootCallId as ToolCallId },
  } as ToolExecution
}

const result = {} as ToolExecutionResult

async function observe(index: ActiveExecutionIndex, exec: ToolExecution): Promise<void> {
  await index.observePreExecuteAndContinue(exec, async (): Promise<PreToolDecision> => ({ kind: 'allow' }))
}

describe('T02 R2 ActiveExecutionIndex', () => {
  it('R2-01 captures one traversal once and finds the same-session approval', async () => {
    const index = new ActiveExecutionIndex()
    const session = fakeSession('s-01')
    const exec = fakeExecution(session, 'c-01')
    let nextCalls = 0
    await index.observePreExecuteAndContinue(exec, async () => {
      nextCalls += 1
      return { kind: 'allow' }
    })
    const first = index.observePreExecute(exec)
    expect(first).toBe('ra-execution-1')
    expect(nextCalls).toBe(1)
    index.observeSessionEvent(session, { type: 'approval/asked', data: { id: 'a-01', toolName: 'probe', callId: 'c-01' } } as never)
    expect(index.snapshotObservations()[0]?.lookup).toEqual({ status: 'FOUND', executionId: first })
  })

  it('R2-02 and R2-03 keep call and Session scope independent', async () => {
    const index = new ActiveExecutionIndex()
    const firstSession = fakeSession('s-01')
    const secondSession = fakeSession('s-02')
    const first = fakeExecution(firstSession, 'same')
    const second = fakeExecution(firstSession, 'other')
    const third = fakeExecution(secondSession, 'same')
    await Promise.all([observe(index, first), observe(index, second), observe(index, third)])
    expect(index.lookup(firstSession, 'same')).toEqual({ status: 'FOUND', executionId: 'ra-execution-1' })
    expect(index.lookup(firstSession, 'other')).toEqual({ status: 'FOUND', executionId: 'ra-execution-2' })
    expect(index.lookup(secondSession, 'same')).toEqual({ status: 'FOUND', executionId: 'ra-execution-3' })
  })

  it('R2-04 and R2-05 report ambiguity, then retire only the exact member', async () => {
    const index = new ActiveExecutionIndex()
    const session = fakeSession('collision')
    const first = fakeExecution(session, 'collision')
    const second = fakeExecution(session, 'collision')
    await observe(index, first)
    await observe(index, second)
    expect(index.lookup(session, 'collision')).toEqual({
      status: 'AMBIGUOUS', executionIds: ['ra-execution-1', 'ra-execution-2'],
    })
    index.observeResult(first, result)
    expect(index.lookup(session, 'collision')).toEqual({ status: 'FOUND', executionId: 'ra-execution-2' })
    index.observeResult(second, result)
    expect(index.lookup(session, 'collision')).toEqual({ status: 'NOT_FOUND', reason: 'NO_ACTIVE_EXECUTION' })
  })

  it('R2-06 retires old history before callId reuse', async () => {
    const index = new ActiveExecutionIndex()
    const session = fakeSession('reuse')
    const oldExec = fakeExecution(session, 'reused')
    await observe(index, oldExec)
    index.observeResult(oldExec, result)
    const newExec = fakeExecution(session, 'reused')
    await observe(index, newExec)
    expect(index.lookup(session, 'reused')).toEqual({ status: 'FOUND', executionId: 'ra-execution-2' })
  })

  it('R2-07 returns explicit causes for missing scope, callId, and orphan approvals', () => {
    const index = new ActiveExecutionIndex()
    const session = fakeSession('missing')
    expect(index.lookup(session, undefined)).toEqual({ status: 'NOT_FOUND', reason: 'MISSING_CALL_ID' })
    expect(index.lookup(undefined, 'c')).toEqual({ status: 'NOT_FOUND', reason: 'MISSING_SCOPE_IDENTITY' })
    index.observeSessionEvent(session, { type: 'approval/asked', data: { id: 'orphan', toolName: 'probe', callId: 'c' } } as never)
    expect(index.snapshotObservations()[0]?.lookup).toEqual({ status: 'NOT_FOUND', reason: 'NO_ACTIVE_EXECUTION' })
  })

  it('R2-08 keeps active state while an in-body approval is pending', async () => {
    const index = new ActiveExecutionIndex()
    const session = fakeSession('in-body')
    const exec = fakeExecution(session, 'body-call')
    await observe(index, exec)
    index.observeSessionEvent(session, { type: 'approval/asked', data: { id: 'body-approval', toolName: 'probe', callId: 'body-call' } } as never)
    expect(index.snapshotObservations()[0]?.lookup.status).toBe('FOUND')
    expect(index.lookup(session, 'body-call').status).toBe('FOUND')
    index.observeResult(exec, result)
    expect(index.lookup(session, 'body-call').status).toBe('NOT_FOUND')
  })

  it('R2-09 keeps nested/parent traversals distinct without root collapse', async () => {
    const index = new ActiveExecutionIndex()
    const session = fakeSession('nested')
    const parent = fakeExecution(session, 'parent', { rootCallId: 'root' })
    await observe(index, parent)
    const child = fakeExecution(session, 'child', { parent: parent.token, rootCallId: 'root' })
    await observe(index, child)
    expect(index.lookup(session, 'parent')).toEqual({ status: 'FOUND', executionId: 'ra-execution-1' })
    expect(index.lookup(session, 'child')).toEqual({ status: 'FOUND', executionId: 'ra-execution-2' })
  })

  it('R2-10 pairs decisions, makes duplicate asked idempotent, and flags contradictions', async () => {
    const index = new ActiveExecutionIndex()
    const session = fakeSession('approvals')
    const exec = fakeExecution(session, 'approval-call')
    await observe(index, exec)
    const asked = { type: 'approval/asked', data: { id: 'approval', toolName: 'probe', callId: 'approval-call' } } as never
    index.observeSessionEvent(session, asked)
    index.observeSessionEvent(session, asked)
    index.observeSessionEvent(session, { type: 'approval/decided', data: { id: 'approval', outcome: 'allowed-once' } } as never)
    index.observeSessionEvent(session, { type: 'approval/decided', data: { id: 'approval', outcome: 'rejected' } } as never)
    const observations = index.snapshotObservations()
    expect(observations).toHaveLength(1)
    expect(observations[0]).toMatchObject({ decidedOutcome: 'allowed-once', closed: true, conflict: true })
  })

  it('R2-11 deactivates one generation and cannot be revived by a late result', async () => {
    const oldIndex = new ActiveExecutionIndex()
    const session = fakeSession('generation')
    const oldExec = fakeExecution(session, 'late')
    await observe(oldIndex, oldExec)
    oldIndex.dispose()
    expect(oldIndex.lookup(session, 'late')).toEqual({ status: 'NOT_FOUND', reason: 'RUNTIME_STATE_LOST' })
    const newIndex = new ActiveExecutionIndex()
    newIndex.observeResult(oldExec, result)
    expect(newIndex.lookup(session, 'late')).toEqual({ status: 'NOT_FOUND', reason: 'NO_ACTIVE_EXECUTION' })
  })

  it('R2-12 remains observational for bypassed/native paths and preserves unknown', () => {
    const index = new ActiveExecutionIndex()
    const session = fakeSession('native')
    index.observeSessionEvent(session, { type: 'approval/asked', data: { id: 'native', toolName: 'probe' } } as never)
    expect(index.snapshotObservations()[0]?.lookup).toEqual({ status: 'NOT_FOUND', reason: 'MISSING_CALL_ID' })
  })
})
