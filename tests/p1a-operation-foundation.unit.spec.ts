import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { OperationFoundation } from '../src/host/operation-foundation.ts'

function fakeSession(id: string): Session {
  return { id, header: { cwd: 'D:\\Harness\\workspace' } } as unknown as Session
}

function fakeExecution(
  session: Session | undefined,
  callId: string | undefined,
  args: unknown,
  options: { name?: string; rootCallId?: string; parent?: symbol } = {},
): ToolExecution {
  const agent = session === undefined ? undefined : { session } as unknown as Agent
  return {
    callId: callId as ToolCallId,
    name: options.name ?? 'probe',
    arguments: args,
    signal: new AbortController().signal,
    token: Symbol('execution'),
    ...agent === undefined ? {} : { agent },
    ...options.rootCallId === undefined ? {} : { rootCallId: options.rootCallId as ToolCallId },
    ...options.parent === undefined ? {} : { parent: options.parent },
  } as ToolExecution
}

const result = {} as ToolExecutionResult

type InternalEntry = {
  readonly executionRef: WeakRef<ToolExecution>
  readonly snapshot: Record<string, unknown>
  readonly rawArguments?: unknown
  readonly active: boolean
}

function entries(foundation: OperationFoundation): Map<string, InternalEntry> {
  return (foundation as unknown as { snapshots: Map<string, InternalEntry> }).snapshots
}

describe('Phase 1A Operation Foundation', () => {
  it('captures one exact ID with a known read operation and keeps the public boundary unknown', () => {
    const foundation = new OperationFoundation({ clock: () => 100 })
    const exec = fakeExecution(fakeSession('s-01'), 'call-01', { file_path: 'D:\\Harness\\workspace\\a.txt', offset: 1, limit: 20 }, { name: 'read' })
    const captured = foundation.capture(exec, 'ra-execution-01')

    expect(captured).toMatchObject({ executionId: 'ra-execution-01', status: 'CAPTURED', reasonCodes: ['NAME_AND_SHAPE_ONLY'] })
    expect(foundation.diagnostics.get('ra-execution-01')).toMatchObject({
      executionId: 'ra-execution-01',
      status: 'CAPTURED',
      toolKind: 'filesystem-read',
      boundary: {
        workspaceContained: 'unknown',
        targetScope: 'unknown',
        sandboxActive: 'unknown',
        sandboxCovered: 'unknown',
        rollbackAvailable: 'unknown',
        checkpointAvailable: 'unknown',
      },
    })
    expect(JSON.stringify(foundation.diagnostics.get('ra-execution-01'))).not.toContain('workspace\\a.txt')
  })

  it('is idempotent per exact execution object and does not confuse a reason-shaped argument', () => {
    const foundation = new OperationFoundation()
    const exec = fakeExecution(fakeSession('s-02'), 'call-02', { reason: 'opaque' })
    const first = foundation.capture(exec, 'ra-execution-02')
    const second = foundation.capture(exec, 'ra-execution-other')

    expect(second).toBe(first)
    expect(second).toMatchObject({ executionId: 'ra-execution-02', reasonCodes: ['UNKNOWN_TOOL'] })
  })

  it('fails closed without fabricating identity when Session or callId is missing', () => {
    const foundation = new OperationFoundation()
    const noSession = fakeExecution(undefined, 'call-03', {})
    const noCall = fakeExecution(fakeSession('s-03'), undefined, {})

    expect(foundation.capture(noSession, 'ra-execution-03')).toMatchObject({ status: 'UNAVAILABLE' })
    expect(foundation.capture(noCall, 'ra-execution-04')).toMatchObject({ status: 'UNAVAILABLE' })
    expect(foundation.diagnostics.get('ra-execution-03').status).toBe('NOT_FOUND')
    expect(foundation.diagnostics.get('ra-execution-04').status).toBe('NOT_FOUND')
  })

  it('recognizes only the bounded read/write shapes and never publishes write payloads', () => {
    const foundation = new OperationFoundation()
    const read = fakeExecution(fakeSession('s-04'), 'read', { file_path: 'a', offset: 1, limit: 2 }, { name: 'read' })
    const write = fakeExecution(fakeSession('s-04'), 'write', {
      file_path: 'a', content: 'secret', sandbox_permissions: 'require_escalated', justification: 'test',
    }, { name: 'write' })
    const unknown = fakeExecution(fakeSession('s-04'), 'unknown', { file_path: 'a' }, { name: 'bash' })
    const invalid = fakeExecution(fakeSession('s-04'), 'invalid', { file_path: 'a', extra: true }, { name: 'read' })
    const protoKey = JSON.parse('{"file_path":"a","__proto__":{"unexpected":true}}')

    expect(foundation.capture(read, 'ra-execution-read').status).toBe('CAPTURED')
    expect(foundation.capture(write, 'ra-execution-write').status).toBe('CAPTURED')
    expect(foundation.capture(unknown, 'ra-execution-unknown').status).toBe('DEGRADED')
    expect(foundation.capture(invalid, 'ra-execution-invalid').status).toBe('DEGRADED')
    expect(foundation.capture(fakeExecution(fakeSession('s-04'), 'proto-key', protoKey, { name: 'read' }), 'ra-execution-proto-key').status).toBe('DEGRADED')
    const publicWrite = JSON.stringify(foundation.diagnostics.get('ra-execution-write'))
    expect(publicWrite).not.toContain('secret')
    expect(publicWrite).not.toContain('require_escalated')
  })

  it('bounds deep detachment and handles cycles, accessors, and oversized strings', () => {
    const foundation = new OperationFoundation()
    const cyclic: Record<string, unknown> = { file_path: 'a' }
    cyclic.self = cyclic
    const accessor = Object.defineProperty({ file_path: 'a' }, 'content', { get: () => 'secret' })
    const oversized = { file_path: 'a', content: 'x'.repeat(8_193) }

    expect(foundation.capture(fakeExecution(fakeSession('s-05'), 'cycle', cyclic, { name: 'write' }), 'ra-execution-cycle').status).toBe('DEGRADED')
    expect(foundation.capture(fakeExecution(fakeSession('s-05'), 'accessor', accessor, { name: 'write' }), 'ra-execution-accessor').status).toBe('DEGRADED')
    expect(foundation.capture(fakeExecution(fakeSession('s-05'), 'oversized', oversized, { name: 'write' }), 'ra-execution-oversized').status).toBe('DEGRADED')
  })

  it('hashes only a complete known operation with stable key order and retains raw data only while active', () => {
    const foundation = new OperationFoundation()
    const first = fakeExecution(fakeSession('s-06'), 'hash-1', { limit: 2, file_path: 'a', offset: 1 }, { name: 'read' })
    const second = fakeExecution(fakeSession('s-06'), 'hash-2', { offset: 1, file_path: 'a', limit: 2 }, { name: 'read' })
    foundation.capture(first, 'ra-execution-hash-1')
    foundation.capture(second, 'ra-execution-hash-2')
    const firstSnapshot = entries(foundation).get('ra-execution-hash-1')!.snapshot
    const secondSnapshot = entries(foundation).get('ra-execution-hash-2')!.snapshot

    expect(firstSnapshot.operationHash).toMatch(/^[0-9a-f]{64}$/)
    expect(secondSnapshot.operationHash).toBe(firstSnapshot.operationHash)
    expect(firstSnapshot.rawArguments).toBeDefined()
    foundation.retire(first)
    expect(entries(foundation).get('ra-execution-hash-1')!.rawArguments).toBeUndefined()
    expect(entries(foundation).get('ra-execution-hash-1')!.snapshot.rawArguments).toBeUndefined()
  })

  it('does not strongly retain a settled ToolExecution and expires only detached metadata', () => {
    let now = 0
    const foundation = new OperationFoundation({ clock: () => now, ttlMs: 10 })
    const exec = fakeExecution(fakeSession('s-f1'), 'f1-call', { file_path: 'private.txt' }, { name: 'read' })
    foundation.capture(exec, 'ra-execution-f1')
    foundation.retire(exec)

    const entry = entries(foundation).get('ra-execution-f1')!
    expect(entry).not.toHaveProperty('execution')
    expect(Object.keys(entry)).not.toContain('execution')
    expect(entry.executionRef).toBeInstanceOf(WeakRef)
    expect(entry.snapshot).not.toHaveProperty('rawArguments')
    expect(entry.snapshot).not.toHaveProperty('agent')
    expect(entry.snapshot).not.toHaveProperty('signal')
    expect(entry.snapshot).not.toHaveProperty('token')
    expect(foundation.diagnostics.get('ra-execution-f1').status).toBe('CAPTURED')

    now = 10
    expect(foundation.diagnostics.get('ra-execution-f1').status).toBe('EXPIRED')
    expect(foundation.diagnostics.get('ra-execution-f1').status).toBe('NOT_FOUND')
  })

  it('normalizes required fields from own properties only under ambient prototype pollution', () => {
    const foundation = new OperationFoundation()
    const originalFilePath = Object.getOwnPropertyDescriptor(Object.prototype, 'file_path')
    const originalContent = Object.getOwnPropertyDescriptor(Object.prototype, 'content')
    try {
      Object.defineProperty(Object.prototype, 'file_path', { value: 'polluted-path', configurable: true, writable: true })
      Object.defineProperty(Object.prototype, 'content', { value: 'polluted-content', configurable: true, writable: true })
      const missingRead = fakeExecution(fakeSession('s-f2'), 'missing-read', {}, { name: 'read' })
      const missingWrite = fakeExecution(fakeSession('s-f2'), 'missing-write', { file_path: 'a' }, { name: 'write' })

      expect(foundation.capture(missingRead, 'ra-execution-f2-read')).toMatchObject({ status: 'DEGRADED' })
      expect(foundation.capture(missingWrite, 'ra-execution-f2-write')).toMatchObject({ status: 'DEGRADED' })
      for (const id of ['ra-execution-f2-read', 'ra-execution-f2-write']) {
        const snapshot = entries(foundation).get(id)!.snapshot
        expect(snapshot.operationHash).toBeUndefined()
        expect((snapshot.normalizedOperation as { kind: string }).kind).toBe('unknown')
      }
    } finally {
      if (originalFilePath === undefined) delete (Object.prototype as Record<string, unknown>).file_path
      else Object.defineProperty(Object.prototype, 'file_path', originalFilePath)
      if (originalContent === undefined) delete (Object.prototype as Record<string, unknown>).content
      else Object.defineProperty(Object.prototype, 'content', originalContent)
    }
  })

  it('validates live scope before settled eviction or all-active capacity refusal', () => {
    const settledFoundation = new OperationFoundation({ maxEntries: 1 })
    const settled = fakeExecution(fakeSession('s-f3'), 'settled', { file_path: 'a' }, { name: 'read' })
    settledFoundation.capture(settled, 'ra-execution-f3-settled')
    settledFoundation.retire(settled)
    expect(settledFoundation.capture(fakeExecution(undefined, 'missing-session', {}), 'ra-execution-f3-missing-session').status).toBe('UNAVAILABLE')
    expect(settledFoundation.diagnostics.get('ra-execution-f3-settled').status).toBe('CAPTURED')

    const activeFoundation = new OperationFoundation({ maxEntries: 1 })
    const active = fakeExecution(fakeSession('s-f3-active'), 'active', { file_path: 'a' }, { name: 'read' })
    activeFoundation.capture(active, 'ra-execution-f3-active')
    expect(activeFoundation.capture(fakeExecution(fakeSession('s-f3-active'), undefined, {}), 'ra-execution-f3-missing-call').status).toBe('UNAVAILABLE')
    expect(activeFoundation.diagnostics.get('ra-execution-f3-active').status).toBe('CAPTURED')
    expect(activeFoundation.capture(fakeExecution(fakeSession('s-f3-active'), 'overflow', { file_path: 'b' }, { name: 'read' }), 'ra-execution-f3-overflow').status).toBe('CAPACITY_EXCEEDED')
  })

  it('records the exact parent witness without exposing it in diagnostics', () => {
    const foundation = new OperationFoundation()
    const parent = Symbol('parent')
    const child = fakeExecution(fakeSession('s-07'), 'child', { file_path: 'a' }, { name: 'read', parent })
    foundation.capture(child, 'ra-execution-child', 'ra-execution-parent')

    expect(entries(foundation).get('ra-execution-child')!.snapshot.parentExecutionId).toBe('ra-execution-parent')
    expect(foundation.diagnostics.get('ra-execution-child')).not.toHaveProperty('parentExecutionId')
  })

  it('evicts settled entries, rejects all-active overflow, and expires entries by the injected clock', () => {
    let now = 0
    const foundation = new OperationFoundation({ clock: () => now, maxEntries: 2, ttlMs: 10 })
    const first = fakeExecution(fakeSession('s-08'), 'one', { file_path: 'a' }, { name: 'read' })
    const second = fakeExecution(fakeSession('s-08'), 'two', { file_path: 'b' }, { name: 'read' })
    const third = fakeExecution(fakeSession('s-08'), 'three', { file_path: 'c' }, { name: 'read' })
    const fourth = fakeExecution(fakeSession('s-08'), 'four', { file_path: 'd' }, { name: 'read' })
    foundation.capture(first, 'ra-execution-one')
    foundation.capture(second, 'ra-execution-two')
    expect(foundation.capture(third, 'ra-execution-three')).toMatchObject({ status: 'CAPACITY_EXCEEDED' })
    foundation.retire(first)
    expect(foundation.capture(fourth, 'ra-execution-four')).toMatchObject({ status: 'CAPTURED' })
    expect(foundation.diagnostics.get('ra-execution-one').status).toBe('NOT_FOUND')

    now = 10
    expect(foundation.diagnostics.get('ra-execution-two').status).toBe('EXPIRED')
    expect(foundation.diagnostics.get('ra-execution-two').status).toBe('NOT_FOUND')
  })

  it('keeps sanitized metadata after result and clears the whole generation on dispose', () => {
    const foundation = new OperationFoundation()
    const exec = fakeExecution(fakeSession('s-09'), 'call-09', { file_path: 'a' }, { name: 'read' })
    foundation.capture(exec, 'ra-execution-09')
    foundation.retire(exec)
    expect(foundation.diagnostics.get('ra-execution-09').status).toBe('CAPTURED')
    foundation.dispose()
    expect(foundation.diagnostics.get('ra-execution-09').status).toBe('NOT_FOUND')
    expect(foundation.capture(exec, 'ra-execution-revived').status).toBe('NOT_FOUND')
  })
})
