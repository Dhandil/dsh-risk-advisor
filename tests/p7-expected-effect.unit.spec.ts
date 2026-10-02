import { describe, expect, it, vi } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import { PostconditionVerifier } from '../src/host/postcondition-verifier.ts'
import { parseSimpleShell } from '../src/host/shell-analysis.ts'

const session = { id: 'p7-session', header: { cwd: 'D:\\Harness\\p7-fixture' } } as unknown as Session

function exec(name: string, args: unknown, callId = `${name}-call`, owner: Session = session): ToolExecution {
  return { name, arguments: args, callId, rootCallId: callId, agent: { session: owner }, signal: new AbortController().signal, token: Symbol(callId) } as unknown as ToolExecution
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

  it('accepts only the frozen high-confidence shell subset and exact adapter grammar', () => {
    expect(parseSimpleShell('mkdir -p out', 'bash')).toMatchObject({ action: 'mkdir', args: ['-p', 'out'] })
    expect(parseSimpleShell('cp source.txt dest.txt', 'bash')).toMatchObject({ action: 'cp', args: ['source.txt', 'dest.txt'] })
    expect(parseSimpleShell('mkdir out && echo done', 'bash')).toBeUndefined()
    expect(parseSimpleShell('mkdir $(echo out)', 'bash')).toBeUndefined()
    expect(parseSimpleShell('mkdir out', 'pwsh')).toMatchObject({ action: 'mkdir', args: ['out'] })

    const valid = exec('bash', { command: 'git checkout -b feature-safe', description: 'fixture' }, 'checkout-b')
    const switchValid = exec('bash', { command: 'git switch -c feature-safe', description: 'fixture' }, 'switch-c')
    const checkoutWrong = exec('bash', { command: 'git checkout -c feature-safe', description: 'fixture' }, 'checkout-c')
    const switchWrong = exec('bash', { command: 'git switch -b feature-safe', description: 'fixture' }, 'switch-b')
    const registry = new ExpectedEffectRegistry()
    registry.capture(valid, 'checkout-b')
    registry.capture(switchValid, 'switch-c')
    registry.capture(checkoutWrong, 'checkout-c')
    registry.capture(switchWrong, 'switch-b')
    expect(registry.take(valid)?.adapterId).toBe('git.branch-switch.v1')
    expect(registry.take(switchValid)?.adapterId).toBe('git.branch-switch.v1')
    expect(registry.take(checkoutWrong)).toBeUndefined()
    expect(registry.take(switchWrong)).toBeUndefined()

    for (const [name, command] of [
      ['mkdir-option', 'mkdir -x'],
      ['cp-option-source', 'cp -T destination.txt'],
      ['cp-option-destination', 'cp source.txt -T'],
      ['pwsh-named', 'Copy-Item -Path source.txt destination.txt'],
    ] as const) {
      const value = exec(name === 'pwsh-named' ? 'pwsh' : 'bash', { command, description: 'fixture' }, name)
      registry.capture(value, name)
      expect(registry.take(value)).toBeUndefined()
    }

    expect(parseSimpleShell('Copy-Item "C:\\Program Files\\source.txt" "C:\\Program Files\\dest.txt"', 'pwsh')).toMatchObject({
      action: 'copy-item',
      args: ['C:\\Program Files\\source.txt', 'C:\\Program Files\\dest.txt'],
    })
    const pwshPath = exec('pwsh', { command: 'mkdir C:\\temp\\out', description: 'fixture' }, 'pwsh-path')
    registry.capture(pwshPath, 'pwsh-path')
    expect(registry.take(pwshPath)).toBeUndefined()
  })

  it('removes every raw lookup path on TTL expiry, session disposal, terminal take, and full disposal', () => {
    let now = 0
    const registry = new ExpectedEffectRegistry({ clock: () => now })
    const expired = exec('edit', { file_path: 'old.txt', old_string: 'old secret', new_string: 'new secret' }, 'expired')
    registry.capture(expired, 'expired')
    now = 5 * 60 * 1000
    const trigger = exec('write', { file_path: 'trigger.txt', content: 'trigger' }, 'trigger')
    registry.capture(trigger, 'trigger')
    expect(registry.take(expired)).toBeUndefined()

    const sessionDisposed = exec('bash', { command: 'git switch main', description: 'fixture' }, 'session-disposed')
    registry.capture(sessionDisposed, 'session-disposed')
    registry.disposeSession(session)
    expect(registry.take(sessionDisposed)).toBeUndefined()

    const terminal = exec('write', { file_path: 'terminal.txt', content: 'terminal' }, 'terminal')
    registry.capture(terminal, 'terminal')
    expect(registry.take(terminal)).toBeDefined()
    expect(registry.take(terminal)).toBeUndefined()

    const fullDispose = exec('edit', { file_path: 'dispose.txt', old_string: 'old', new_string: 'new' }, 'full-dispose')
    registry.capture(fullDispose, 'full-dispose')
    registry.dispose()
    expect(registry.take(fullDispose)).toBeUndefined()
  })

  it('bounds active raw effects to 128 per Session and 512 globally without invoking hostile getters', () => {
    const registry = new ExpectedEffectRegistry()
    const sessions = Array.from({ length: 5 }, (_, index) => ({ id: `bound-${index}`, header: { cwd: 'D:\\Harness\\p7-fixture' } } as unknown as Session))
    const executions: ToolExecution[] = []
    for (const [sessionIndex, owner] of sessions.entries()) {
      const count = sessionIndex < 4 ? 128 : 1
      for (let index = 0; index < count; index += 1) {
        const value = exec('edit', { file_path: `${sessionIndex}-${index}.txt`, old_string: `old-${index}`, new_string: `new-${index}` }, `bound-${sessionIndex}-${index}`, owner)
        executions.push(value)
        registry.capture(value, `bound-${sessionIndex}-${index}`)
      }
    }
    const retained = executions.filter(value => registry.take(value) !== undefined)
    expect(retained).toHaveLength(512)

    const getter = vi.fn(() => 'raw')
    const hostileArgs = Object.defineProperty({ file_path: 'hostile.txt' }, 'content', { enumerable: true, get: getter })
    const hostile = exec('write', hostileArgs, 'hostile')
    registry.capture(hostile, 'hostile')
    expect(getter).not.toHaveBeenCalled()
    expect(registry.take(hostile)).toBeUndefined()
  })
})
