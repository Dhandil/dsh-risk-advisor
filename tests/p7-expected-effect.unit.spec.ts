import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import { PostconditionVerifier } from '../src/host/postcondition-verifier.ts'
import { parseSimpleShell } from '../src/host/shell-analysis.ts'

const session = { id: 'p7-session', header: { cwd: 'D:\\Harness\\p7-fixture' } } as unknown as Session

function exec(name: string, args: unknown, callId = `${name}-call`): ToolExecution {
  return { name, arguments: args, callId, rootCallId: callId, agent: { session }, signal: new AbortController().signal, token: Symbol(callId) } as unknown as ToolExecution
}

describe('Phase 7 ExpectedEffect capture', () => {
  it('captures direct write and reduces content to a digest-only terminal record', () => {
    const registry = new ExpectedEffectRegistry()
    const value = exec('write', { file_path: 'secret.txt', content: 'bounded content' })
    registry.capture(value, 'ra-write')
    const verifier = new PostconditionVerifier(registry)
    verifier.observeResult(value, { isError: false, value: { path: 'secret.txt', operation: 'update', before: 'old', after: 'bounded content' }, content: [] })
    const record = verifier.store.diagnostics.get('ra-write')
    expect(record).toMatchObject({ adapterId: 'tool.write.v1', status: 'MATCHED', semanticSuccess: true })
    expect(JSON.stringify(record)).not.toContain('secret.txt')
    expect(JSON.stringify(record)).not.toContain('bounded content')
    expect(JSON.stringify(record)).not.toContain('digest')
  })

  it('reports deterministic write mismatch but never upgrades a failed process', () => {
    const registry = new ExpectedEffectRegistry()
    const mismatch = exec('write', { file_path: 'a.txt', content: 'expected' }, 'mismatch')
    registry.capture(mismatch, 'mismatch')
    const verifier = new PostconditionVerifier(registry)
    verifier.observeResult(mismatch, { isError: false, value: { path: 'a.txt', operation: 'create', before: null, after: 'different' }, content: [] })
    expect(verifier.store.diagnostics.get('mismatch')).toMatchObject({ status: 'MISMATCHED', semanticSuccess: false, reasonCodes: ['POSTCONDITION_MISMATCH'] })

    const failed = exec('write', { file_path: 'a.txt', content: 'expected' }, 'failed')
    registry.capture(failed, 'failed')
    verifier.observeResult(failed, { isError: true, error: { message: 'tool failed', info: { name: 'ToolError', code: 'TOOL_ERROR' } }, content: [] })
    expect(verifier.store.diagnostics.get('failed')).toMatchObject({ status: 'UNKNOWN', semanticSuccess: 'unknown', reasonCodes: ['PROCESS_NOT_SUCCESSFUL'] })
  })

  it('captures edit with exact replacement semantics and fails closed for malformed results', () => {
    const registry = new ExpectedEffectRegistry()
    const edit = exec('edit', { file_path: 'a.txt', old_string: 'one', new_string: 'two' })
    registry.capture(edit, 'ra-edit')
    const verifier = new PostconditionVerifier(registry)
    verifier.observeResult(edit, { isError: false, value: { path: 'a.txt', before: 'one\none', after: 'two\none' }, content: [] })
    expect(verifier.store.diagnostics.get('ra-edit')).toMatchObject({ adapterId: 'tool.edit.v1', status: 'UNKNOWN', semanticSuccess: 'unknown' })

    const replace = exec('edit', { file_path: 'a.txt', old_string: 'one', new_string: 'two', replace_all: true }, 'edit-replace')
    registry.capture(replace, 'ra-edit-replace')
    verifier.observeResult(replace, { isError: false, value: { path: 'a.txt', before: 'one\none', after: 'two\ntwo' }, content: [] })
    expect(verifier.store.diagnostics.get('ra-edit-replace')).toMatchObject({ status: 'MATCHED', semanticSuccess: true })

    const lf = exec('edit', { file_path: 'line.txt', old_string: 'old\r\n', new_string: 'new\r\n' }, 'edit-lf')
    registry.capture(lf, 'ra-edit-lf')
    verifier.observeResult(lf, { isError: false, value: { path: 'line.txt', before: 'old\n', after: 'new\n' }, content: [] })
    expect(verifier.store.diagnostics.get('ra-edit-lf')).toMatchObject({ status: 'MATCHED', semanticSuccess: true })
  })

  it('does not invoke accessors and does not traverse unknown-tool arguments', () => {
    const registry = new ExpectedEffectRegistry()
    const getter = vi.fn(() => 'content')
    const accessorArgs = Object.defineProperty({ file_path: 'a.txt' }, 'content', { enumerable: true, get: getter })
    const accessorExec = exec('write', accessorArgs, 'accessor')
    registry.capture(accessorExec, 'accessor')
    expect(getter).not.toHaveBeenCalled()

    let touched = false
    const unknownArgs = new Proxy({}, { get() { touched = true; throw new Error('must not read') } })
    registry.capture(exec('unknown', unknownArgs, 'unknown'), 'unknown')
    expect(touched).toBe(false)
  })

  it('accepts only the frozen high-confidence shell subset', () => {
    expect(parseSimpleShell('mkdir -p out', 'bash')).toMatchObject({ action: 'mkdir', args: ['-p', 'out'] })
    expect(parseSimpleShell('cp source.txt dest.txt', 'bash')).toMatchObject({ action: 'cp', args: ['source.txt', 'dest.txt'] })
    expect(parseSimpleShell('mkdir out && echo done', 'bash')).toBeUndefined()
    expect(parseSimpleShell('mkdir $(echo out)', 'bash')).toBeUndefined()
    expect(parseSimpleShell('mkdir out', 'pwsh')).toMatchObject({ action: 'mkdir', args: ['out'] })
  })
})
