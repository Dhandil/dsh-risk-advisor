import { describe, expect, it } from 'vitest'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult, ToolExecutionToken } from '@deepseek-ai/dsh-tools'
import { RetryEscalationAnalyzer } from '../src/host/retry-escalation.ts'

function session(id: string): Session {
  return { id } as unknown as Session
}

function execution(
  owner: Session,
  id: string,
  name: string,
  args: unknown,
): ToolExecution {
  return {
    callId: id,
    rootCallId: id,
    name,
    arguments: args,
    agent: { session: owner } as unknown as Agent,
    signal: new AbortController().signal,
    token: Symbol(id) as ToolExecutionToken,
  } as ToolExecution
}

function failure(code?: string): ToolExecutionResult {
  return {
    isError: true,
    content: [],
    error: {
      message: 'private failure text',
      ...(code === undefined ? {} : { info: { name: 'HarnessError', code, reason: 'private reason' } }),
    },
  } as ToolExecutionResult
}

function success(value: unknown = 'ok'): ToolExecutionResult {
  return { isError: false, content: [], value } as ToolExecutionResult
}

function shell(exitCode: number | null, mode?: string, denied = false): ToolExecutionResult {
  return {
    isError: false,
    content: [],
    value: {
      kind: 'foreground',
      exitCode,
      sandbox: mode === undefined ? undefined : { mode, denied, enforcement: 'full' },
      stdout: { text: 'private stdout', spillPath: 'private path' },
      stderr: { text: 'private stderr' },
    },
  } as unknown as ToolExecutionResult
}

function observe(
  analyzer: RetryEscalationAnalyzer,
  owner: Session,
  id: string,
  name: string,
  args: unknown,
  result?: ToolExecutionResult,
): ToolExecution {
  const exec = execution(owner, id, name, args)
  analyzer.observePreExecute(exec, id)
  if (result !== undefined) analyzer.observeResult(exec, result)
  return exec
}

describe('Phase 3 retry/escalation analyzer', () => {
  it('P3-01/P3-02 keeps read and write fingerprints stable while ignoring retry-variant fields', () => {
    const owner = session('p3-fingerprint')
    const analyzer = new RetryEscalationAnalyzer()
    observe(analyzer, owner, 'read-1', 'read', { limit: 2, file_path: 'a', offset: 1 }, failure('TOOL_TIMEOUT'))
    observe(analyzer, owner, 'read-2', 'read', { file_path: 'a', offset: 1, limit: 2 })
    expect(analyzer.diagnostics.get('read-2')).toMatchObject({ retryOf: 'read-1' })

    observe(analyzer, owner, 'write-1', 'write', { file_path: 'a', content: 'x', sandbox_permissions: 'workspace-write', justification: 'one' }, failure('TOOL_TIMEOUT'))
    observe(analyzer, owner, 'write-2', 'write', { file_path: 'a', content: 'x', sandbox_permissions: 'danger-full-access', justification: 'two' })
    expect(analyzer.diagnostics.get('write-2')).toMatchObject({ retryOf: 'write-1', permissionEscalation: true })
    observe(analyzer, owner, 'write-3', 'write', { file_path: 'a', content: 'y' })
    expect(analyzer.diagnostics.get('write-3').retryOf).toBeUndefined()
  })

  it('P3-03/P3-04 ignores shell presentation/retry controls but distinguishes command, workdir, and background', () => {
    const owner = session('p3-shell-fingerprint')
    const analyzer = new RetryEscalationAnalyzer()
    const base = { command: 'pnpm test', description: 'one', timeoutMs: 1000, workdir: 'D:\\repo', run_in_background: false, sandbox_permissions: 'workspace-write', justification: 'a' }
    observe(analyzer, owner, 'bash-1', 'bash', base, failure('TOOL_TIMEOUT'))
    observe(analyzer, owner, 'bash-2', 'bash', { ...base, description: 'two', timeoutMs: 2000, sandbox_permissions: 'danger-full-access', justification: 'b' })
    expect(analyzer.diagnostics.get('bash-2')).toMatchObject({ retryOf: 'bash-1' })
    observe(analyzer, owner, 'bash-3', 'bash', { ...base, command: 'pnpm test --force' })
    observe(analyzer, owner, 'bash-4', 'bash', { ...base, workdir: 'D:\\other' })
    observe(analyzer, owner, 'bash-5', 'bash', { ...base, run_in_background: true })
    for (const id of ['bash-3', 'bash-4', 'bash-5']) expect(analyzer.diagnostics.get(id).retryOf).toBeUndefined()
  })

  it('P3-05 rejects unknown, extra, malformed, accessor, and oversized arguments', () => {
    const owner = session('p3-unsupported')
    const analyzer = new RetryEscalationAnalyzer()
    const accessor = Object.defineProperty({ file_path: 'a' }, 'offset', { get: () => 1 })
    observe(analyzer, owner, 'extra', 'read', { file_path: 'a', extra: true })
    observe(analyzer, owner, 'accessor', 'read', accessor)
    observe(analyzer, owner, 'oversized', 'write', { file_path: 'a', content: 'x'.repeat(8_193) })
    observe(analyzer, owner, 'unknown', 'rm', { file_path: 'a' })
    for (const id of ['extra', 'accessor', 'oversized', 'unknown']) expect(analyzer.diagnostics.get(id).status).toBe('UNSUPPORTED')
  })

  it('P3-06/P3-07 binds only the nearest earlier proven failure and blocks older failures with success or pending evidence', () => {
    const owner = session('p3-nearest')
    const analyzer = new RetryEscalationAnalyzer()
    const args = { file_path: 'a' }
    observe(analyzer, owner, 'old-failure', 'read', args, failure('TOOL_TIMEOUT'))
    observe(analyzer, owner, 'nearest-success', 'read', args, success())
    observe(analyzer, owner, 'blocked-by-success', 'read', args, failure('TOOL_TIMEOUT'))
    expect(analyzer.diagnostics.get('blocked-by-success').retryOf).toBeUndefined()

    observe(analyzer, owner, 'pending', 'read', { file_path: 'b' })
    observe(analyzer, owner, 'blocked-by-pending', 'read', { file_path: 'b' }, failure('TOOL_TIMEOUT'))
    expect(analyzer.diagnostics.get('blocked-by-pending').retryOf).toBeUndefined()
    expect(analyzer.diagnostics.get('blocked-by-pending').status).toBe('DEGRADED')
  })

  it('P3-08/P3-09 keeps overlapping calls and equal session-id text isolated', () => {
    const analyzer = new RetryEscalationAnalyzer()
    const firstSession = session('same-text')
    const secondSession = session('same-text')
    const args = { file_path: 'a' }
    const first = execution(firstSession, 'overlap-1', 'read', args)
    const second = execution(firstSession, 'overlap-2', 'read', args)
    analyzer.observePreExecute(first, 'overlap-1')
    analyzer.observePreExecute(second, 'overlap-2')
    analyzer.observeResult(first, failure('TOOL_TIMEOUT'))
    analyzer.observeResult(second, failure('TOOL_TIMEOUT'))
    expect(analyzer.diagnostics.get('overlap-2').retryOf).toBeUndefined()

    observe(analyzer, secondSession, 'other-session', 'read', args, failure('TOOL_TIMEOUT'))
    expect(analyzer.diagnostics.get('other-session').retryOf).toBeUndefined()
  })

  it('P3-10 applies the five-minute boundary and never refreshes TTL on query', () => {
    let now = 0
    const owner = session('p3-ttl')
    const analyzer = new RetryEscalationAnalyzer({ clock: () => now })
    observe(analyzer, owner, 'ttl-first', 'read', { file_path: 'a' }, failure('TOOL_TIMEOUT'))
    now = 299_999
    expect(analyzer.diagnostics.get('ttl-first').status).toBe('READY')
    now = 300_000
    expect(analyzer.diagnostics.get('ttl-first').status).toBe('EXPIRED')
    now = 300_001
    observe(analyzer, owner, 'ttl-second', 'read', { file_path: 'a' })
    expect(analyzer.diagnostics.get('ttl-second')).toMatchObject({ status: 'DEGRADED', truncated: true })
    expect(analyzer.diagnostics.get('ttl-second').retryOf).toBeUndefined()
  })

  it('P3-11 derives a backward-only chain without touching structural execution ownership', () => {
    const owner = session('p3-chain')
    const analyzer = new RetryEscalationAnalyzer()
    const args = { file_path: 'a' }
    observe(analyzer, owner, 'chain-1', 'read', args, failure('TOOL_TIMEOUT'))
    observe(analyzer, owner, 'chain-2', 'read', args, failure('TOOL_TIMEOUT'))
    observe(analyzer, owner, 'chain-3', 'read', args, failure('TOOL_TIMEOUT'))
    const summary = analyzer.diagnostics.get('chain-3')
    expect(summary.retryOf).toBe('chain-2')
    expect(summary.retryCount).toBe(2)
    expect(summary.recent.map(entry => entry.executionId)).toEqual(['chain-1', 'chain-2', 'chain-3'])
    expect(summary.recent.map(entry => entry.failureKind)).toEqual(['TIMEOUT', 'TIMEOUT', 'TIMEOUT'])
  })

  it('P3-12 limits returned chains to eight and reports truncation', () => {
    const owner = session('p3-chain-limit')
    const analyzer = new RetryEscalationAnalyzer()
    const args = { file_path: 'a' }
    for (let index = 1; index <= 10; index += 1) observe(analyzer, owner, `chain-${index}`, 'read', args, failure('TOOL_TIMEOUT'))
    const summary = analyzer.diagnostics.get('chain-10')
    expect(summary.recent).toHaveLength(8)
    expect(summary.recent[0]!.executionId).toBe('chain-3')
    expect(summary.retryCount).toBe(7)
    expect(summary.truncated).toBe(true)
  })

  it('P3-13/P3-14 proves sameRootCause true, false, and unknown only from structured facts', () => {
    const owner = session('p3-root-cause')
    const args = { file_path: 'a' }
    const same = new RetryEscalationAnalyzer()
    observe(same, owner, 'same-1', 'read', args, failure('TOOL_TIMEOUT'))
    observe(same, owner, 'same-2', 'read', args, failure('TOOL_TIMEOUT'))
    expect(same.diagnostics.get('same-2').sameRootCause).toBe(true)

    const different = new RetryEscalationAnalyzer()
    observe(different, owner, 'different-1', 'read', args, failure('TOOL_TIMEOUT'))
    observe(different, owner, 'different-2', 'read', args, failure('ABORTED'))
    expect(different.diagnostics.get('different-2').sameRootCause).toBe(false)

    const unknown = new RetryEscalationAnalyzer()
    observe(unknown, owner, 'unknown-1', 'read', args, failure())
    observe(unknown, owner, 'unknown-2', 'read', args, failure())
    expect(unknown.diagnostics.get('unknown-2').sameRootCause).toBe('unknown')
    expect(JSON.stringify(unknown.diagnostics.get('unknown-2'))).not.toContain('private')
  })

  it('P3-15/P3-16 treats shell process failure as eligible and conflicts fail closed', () => {
    const owner = session('p3-shell-failure')
    const analyzer = new RetryEscalationAnalyzer()
    const args = { command: 'pnpm test' }
    observe(analyzer, owner, 'shell-1', 'bash', args, shell(7))
    observe(analyzer, owner, 'shell-2', 'bash', args)
    expect(analyzer.diagnostics.get('shell-2')).toMatchObject({ retryOf: 'shell-1' })
    expect(analyzer.diagnostics.get('shell-1').recent[0]).toMatchObject({ failureKind: 'PROCESS_FAILURE' })

    const conflict = new RetryEscalationAnalyzer()
    const conflicted = execution(owner, 'shell-conflict', 'bash', args)
    conflict.observePreExecute(conflicted, 'shell-conflict')
    conflict.observeResult(conflicted, shell(7))
    conflict.observeResult(conflicted, shell(0))
    observe(conflict, owner, 'shell-after-conflict', 'bash', args, shell(7))
    expect(conflict.diagnostics.get('shell-after-conflict')).toMatchObject({ status: 'DEGRADED', truncated: false })
    expect(conflict.diagnostics.get('shell-after-conflict').retryOf).toBeUndefined()
  })

  it('P3-17/P3-19 computes structured permission escalation, equality, narrowing, and unknown', () => {
    const owner = session('p3-permission')
    const args = { command: 'echo safe', sandbox_permissions: 'workspace-write' }
    const wider = new RetryEscalationAnalyzer()
    observe(wider, owner, 'perm-1', 'bash', args, failure('TOOL_TIMEOUT'))
    observe(wider, owner, 'perm-2', 'bash', { command: 'echo safe', sandbox_permissions: 'danger-full-access' })
    expect(wider.diagnostics.get('perm-2').permissionEscalation).toBe(true)

    const narrower = new RetryEscalationAnalyzer()
    observe(narrower, owner, 'narrow-1', 'bash', { command: 'echo safe', sandbox_permissions: 'danger-full-access' }, failure('TOOL_TIMEOUT'))
    observe(narrower, owner, 'narrow-2', 'bash', { command: 'echo safe', sandbox_permissions: 'workspace-write' })
    expect(narrower.diagnostics.get('narrow-2').permissionEscalation).toBe(false)

    const unknown = new RetryEscalationAnalyzer()
    observe(unknown, owner, 'mode-1', 'bash', { command: 'echo safe' }, shell(7, 'read-only'))
    observe(unknown, owner, 'mode-2', 'bash', { command: 'echo safe' })
    expect(unknown.diagnostics.get('mode-2').permissionEscalation).toBe('unknown')
    expect(wider.diagnostics.get('perm-2').permissionEscalation).not.toBe('unknown')
  })

  it('P3-18 does not infer failures or permissions from approval/reason/stderr text', () => {
    const owner = session('p3-no-text')
    const analyzer = new RetryEscalationAnalyzer()
    observe(analyzer, owner, 'text-1', 'bash', { command: 'echo safe' }, {
      isError: true,
      content: [{ type: 'text', text: 'TOOL_TIMEOUT private stderr' }],
      error: { message: 'approval rejected: danger-full-access' },
    } as unknown as ToolExecutionResult)
    observe(analyzer, owner, 'text-2', 'bash', { command: 'echo safe' })
    const summary = analyzer.diagnostics.get('text-2')
    expect(summary.retryOf).toBe('text-1')
    expect(summary.sameRootCause).toBe('unknown')
    expect(summary.permissionEscalation).toBe('unknown')
  })

  it('P3-20/P3-21 refuses active overflow and marks bounded history loss', () => {
    const owner = session('p3-bounds')
    const perSession = new RetryEscalationAnalyzer({ maxPerSession: 2 })
    observe(perSession, owner, 'active-1', 'read', { file_path: 'a' })
    observe(perSession, owner, 'active-2', 'read', { file_path: 'b' })
    observe(perSession, owner, 'active-3', 'read', { file_path: 'c' })
    expect(perSession.diagnostics.get('active-3').status).toBe('CAPACITY_EXCEEDED')

    const global = new RetryEscalationAnalyzer({ maxGlobal: 2 })
    observe(global, session('g1'), 'g1', 'read', { file_path: 'a' })
    observe(global, session('g2'), 'g1', 'read', { file_path: 'a' })
    observe(global, session('g3'), 'g3', 'read', { file_path: 'a' })
    expect(global.diagnostics.get('g3').status).toBe('CAPACITY_EXCEEDED')
  })

  it('P3-22/P3-23 keeps dispose/HMR and durable-history recovery fail closed', () => {
    const owner = session('p3-dispose')
    const analyzer = new RetryEscalationAnalyzer()
    observe(analyzer, owner, 'old', 'read', { file_path: 'a' }, failure('TOOL_TIMEOUT'))
    analyzer.dispose()
    expect(analyzer.diagnostics.get('old')).toMatchObject({ status: 'NOT_FOUND' })
    const late = execution(owner, 'old', 'read', { file_path: 'a' })
    analyzer.observeResult(late, failure('TOOL_TIMEOUT'))
    expect(analyzer.diagnostics.get('durable-only')).toMatchObject({ status: 'NOT_FOUND' })
  })

  it('P3-24 freezes the detached privacy-safe summary and never exposes fingerprint inputs', () => {
    const owner = session('p3-privacy')
    const analyzer = new RetryEscalationAnalyzer()
    observe(analyzer, owner, 'privacy-1', 'write', {
      file_path: 'C:\\private\\secret.txt',
      content: 'secret content',
      sandbox_permissions: 'workspace-write',
      justification: 'private justification',
    }, failure('TOOL_TIMEOUT'))
    observe(analyzer, owner, 'privacy-2', 'write', {
      file_path: 'C:\\private\\secret.txt',
      content: 'secret content',
      sandbox_permissions: 'danger-full-access',
      justification: 'another private justification',
    })
    const summary = analyzer.diagnostics.get('privacy-2')
    expect(Object.isFrozen(summary)).toBe(true)
    expect(Object.isFrozen(summary.recent)).toBe(true)
    expect(JSON.stringify(summary)).not.toContain('secret')
    expect(JSON.stringify(summary)).not.toContain('private')
    expect(summary).not.toHaveProperty('operationFingerprint')
  })
})
