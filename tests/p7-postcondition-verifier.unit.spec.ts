import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { ExpectedEffectRegistry } from '../src/host/expected-effect.ts'
import { PostconditionVerifier } from '../src/host/postcondition-verifier.ts'

const session = { id: 'p7-verifier-session', header: { cwd: 'D:\\Harness\\p7-fixture' } } as unknown as Session
function exec(name: string, args: unknown, callId: string): ToolExecution {
  return { name, arguments: args, callId, rootCallId: callId, agent: { session }, signal: new AbortController().signal, token: Symbol(callId) } as unknown as ToolExecution
}

function shellFixture(output: string, mode: 'unsandboxed' | 'sandboxed' = 'unsandboxed', runImpl?: (spec: Record<string, unknown>) => Promise<unknown>) {
  const calls: Record<string, unknown>[] = []
  return {
    calls,
    sandboxMode: mode === 'sandboxed' ? 'workspace-write' as const : undefined,
    resolve(request: Record<string, unknown>) { calls.push(request); return request },
    async run(spec: Record<string, unknown>) {
      if (runImpl !== undefined) return runImpl(spec)
      return { exitCode: 0, timedOut: false, aborted: false, stdout: { text: output, truncated: false }, stderr: { text: '', truncated: false } }
    },
  }
}

function stat(kind: 'file' | 'symlink' | 'directory' | 'special', size: number) {
  return {
    size,
    mtimeMs: 1,
    dev: 1,
    ino: 1,
    isSymbolicLink: () => kind === 'symlink',
    isFile: () => kind === 'file',
  }
}

function executeProductCopyChecker(spec: Record<string, unknown>, fixture: {
  readonly lstat: (path: string) => ReturnType<typeof stat>
  readonly read: (path: string) => Buffer
}): string {
  const command = String(spec.command)
  expect(command.startsWith('node -e ')).toBe(true)
  const source = JSON.parse(command.slice('node -e '.length)) as string
  let output = ''
  const exit = Symbol('checker-exit')
  const sandbox = {
    require: (name: string) => name === 'node:fs' ? {
      lstatSync: fixture.lstat,
      readFileSync: fixture.read,
    } : undefined,
    process: {
      env: spec.env,
      stdout: { write: (value: string) => { output += value } },
      exit: () => { throw exit },
    },
  }
  try { runInNewContext(source, sandbox) } catch (error) { if (error !== exit) throw error }
  return output
}

describe('Phase 7 bounded postcondition verifier', () => {
  it('runs shell-world mkdir through public resolve/run without a hidden Tool', async () => {
    const registry = new ExpectedEffectRegistry()
    const value = exec('bash', { command: 'mkdir out', description: 'fixture' }, 'mkdir')
    registry.capture(value, 'mkdir')
    const shell = shellFixture('MATCHED')
    const verifier = new PostconditionVerifier(registry)
    verifier.attach(shell)
    verifier.observeResult(value, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(verifier.store.diagnostics.get('mkdir')).toMatchObject({ adapterId: 'shell.mkdir.v1', status: 'MATCHED', semanticSuccess: true, evidenceQuality: 'medium' })
    expect(shell.calls).toHaveLength(1)
    expect(shell.calls[0]).toMatchObject({ timeoutMs: 5000, stdoutMaxBytes: 4096 })
    expect(String(shell.calls[0]!.command)).toContain('node -e')
    expect(String(shell.calls[0]!.command)).not.toContain('RA_TARGET=')
    expect(JSON.stringify(shell.calls[0]!.env)).toContain('out')
    await verifier.dispose()
  })

  it('uses same-or-narrower sandbox policy and fails closed on a world change', async () => {
    const registry = new ExpectedEffectRegistry()
    const value = exec('bash', { command: 'git switch main', description: 'fixture' }, 'git')
    registry.capture(value, 'git')
    const shell = shellFixture('main', 'sandboxed')
    const verifier = new PostconditionVerifier(registry)
    verifier.attach(shell, { resolve: ({ mode }: { mode: string }) => ({ mode, workspaceRoot: 'D:\\Harness\\p7-fixture' }) })
    verifier.observeResult(value, { isError: false, value: { kind: 'foreground', exitCode: 0, sandbox: { mode: 'workspace-write', denied: false } }, content: [] })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(verifier.store.diagnostics.get('git')).toMatchObject({ adapterId: 'git.branch-switch.v1', status: 'MATCHED' })

    const changed = exec('bash', { command: 'git switch main', description: 'fixture' }, 'git-changed')
    registry.capture(changed, 'git-changed')
    shell.sandboxMode = undefined as never
    verifier.observeResult(changed, { isError: false, value: { kind: 'foreground', exitCode: 0, sandbox: { mode: 'workspace-write', denied: false } }, content: [] })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(verifier.store.diagnostics.get('git-changed')).toMatchObject({ status: 'UNKNOWN', semanticSuccess: 'unknown', reasonCodes: ['VERIFIER_EXECUTION_WORLD_CHANGED'] })
    await verifier.dispose()
  })

  it('covers the closed copy and package adapters without interpolating raw data into checker code', async () => {
    const registry = new ExpectedEffectRegistry()
    const copy = exec('bash', { command: 'cp source.txt destination.txt', description: 'fixture' }, 'copy')
    registry.capture(copy, 'copy')
    const shell = shellFixture('MATCHED')
    const verifier = new PostconditionVerifier(registry)
    verifier.attach(shell)
    verifier.observeResult(copy, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(verifier.store.diagnostics.get('copy')).toMatchObject({ adapterId: 'shell.copy-file.v1', semanticSuccess: true })
    expect(String(shell.calls[0]!.command)).not.toContain('source.txt')
    expect(JSON.stringify(shell.calls[0]!.env)).toContain('destination.txt')

    const packageCall = exec('bash', { command: 'pnpm add local-package', description: 'fixture' }, 'package-positive')
    registry.capture(packageCall, 'package-positive')
    verifier.observeResult(packageCall, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(verifier.store.diagnostics.get('package-positive')).toMatchObject({ adapterId: 'package.node-resolve.v1', status: 'MATCHED', semanticSuccess: true })
    expect(String(shell.calls.at(-1)!.command)).not.toContain('local-package')
    expect(JSON.stringify(shell.calls.at(-1)!.env)).toContain('local-package')
    await verifier.dispose()
  })

  it('keeps shell failures, truncation, explicit workdir and unsupported forms unknown', async () => {
    const registry = new ExpectedEffectRegistry()
    const failed = exec('bash', { command: 'mkdir failed', description: 'fixture' }, 'shell-failed')
    registry.capture(failed, 'shell-failed')
    const verifier = new PostconditionVerifier(registry)
    verifier.attach(shellFixture('MATCHED'))
    verifier.observeResult(failed, { isError: false, value: { kind: 'foreground', exitCode: 1 }, content: [] })
    expect(verifier.store.diagnostics.get('shell-failed')).toMatchObject({ semanticSuccess: 'unknown', reasonCodes: ['PROCESS_NOT_SUCCESSFUL'] })

    const explicit = exec('bash', { command: 'mkdir explicit', description: 'fixture', workdir: 'D:\\other' }, 'explicit-workdir')
    registry.capture(explicit, 'explicit-workdir')
    expect(verifier.store.diagnostics.get('explicit-workdir')).toBeUndefined()
    await verifier.dispose()
  })

  it('never turns a process failure or package negative resolution into semantic failure', () => {
    const registry = new ExpectedEffectRegistry()
    const value = exec('bash', { command: 'pnpm add missing-package', description: 'fixture' }, 'package')
    registry.capture(value, 'package')
    const verifier = new PostconditionVerifier(registry)
    verifier.observeResult(value, { isError: true, error: { message: 'failure', info: { name: 'ToolError', code: 'TOOL_ERROR' } }, content: [] })
    expect(verifier.store.diagnostics.get('package')).toMatchObject({ status: 'UNKNOWN', semanticSuccess: 'unknown', reasonCodes: ['PROCESS_NOT_SUCCESSFUL'] })
  })

  it('fails closed for malformed Git output and preserves a valid-but-different branch as mismatch', async () => {
    for (const [id, output, expected, status] of [
      ['git-malformed', 'not a branch?', 'main', 'UNKNOWN'],
      ['git-different', 'other-branch', 'main', 'MISMATCHED'],
      ['git-space', ' main ', 'main', 'UNKNOWN'],
      ['git-multiline', 'main\nother', 'main', 'UNKNOWN'],
      ['git-valid-newline', 'main\n', 'main', 'MATCHED'],
      ['git-invalid-dot', '.foo', 'main', 'UNKNOWN'],
      ['git-invalid-slash', 'foo//bar', 'main', 'UNKNOWN'],
      ['git-invalid-lock', 'foo.lock', 'main', 'UNKNOWN'],
      ['git-del', `main\u007f`, 'main', 'UNKNOWN'],
    ] as const) {
      const registry = new ExpectedEffectRegistry()
      const value = exec('bash', { command: 'git switch main', description: 'fixture' }, id)
      registry.capture(value, id)
      const verifier = new PostconditionVerifier(registry)
      verifier.attach(shellFixture(output))
      verifier.observeResult(value, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(verifier.store.diagnostics.get(id)?.status).toBe(status)
      await verifier.dispose()
    }
  })

  it('detaches by aborting and joining the underlying shell work, then fences policy replacement', async () => {
    const registry = new ExpectedEffectRegistry()
    const oldRun = Promise.withResolvers<unknown>()
    const oldShell = shellFixture('MATCHED', 'sandboxed', async () => oldRun.promise)
    const oldPolicy = { resolve: () => ({ mode: 'workspace-write' as const, workspaceRoot: 'D:\\Harness\\old' }) }
    const verifier = new PostconditionVerifier(registry)
    verifier.attach(oldShell, oldPolicy)
    const old = exec('bash', { command: 'git switch main', description: 'old' }, 'old-generation')
    registry.capture(old, 'old-generation')
    verifier.observeResult(old, { isError: false, value: { kind: 'foreground', exitCode: 0, sandbox: { mode: 'workspace-write', denied: false } }, content: [] })
    await Promise.resolve()
    await Promise.resolve()

    let detached = false
    const detaching = verifier.detach().then(() => { detached = true })
    await Promise.resolve()
    expect(detached).toBe(false)
    oldRun.resolve({ exitCode: 0, timedOut: false, aborted: true, stdout: { text: 'main', truncated: false }, stderr: { text: '', truncated: false } })
    await detaching
    expect(detached).toBe(true)
    expect(verifier.scheduler.activeCount).toBe(0)

    const policyCalls: unknown[] = []
    const newShell = shellFixture('main', 'sandboxed')
    const newPolicy = { resolve: (request: unknown) => { policyCalls.push(request); return { mode: 'workspace-write' as const, workspaceRoot: 'D:\\Harness\\new' } } }
    await verifier.attachGeneration(newShell, newPolicy)
    const current = exec('bash', { command: 'git switch main', description: 'new' }, 'new-generation')
    registry.capture(current, 'new-generation')
    verifier.observeResult(current, { isError: false, value: { kind: 'foreground', exitCode: 0, sandbox: { mode: 'workspace-write', denied: false } }, content: [] })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(policyCalls).toHaveLength(1)
    expect(verifier.store.diagnostics.get('new-generation')).toMatchObject({ status: 'MATCHED' })
    expect(verifier.store.diagnostics.get('old-generation')).toMatchObject({ status: 'UNKNOWN', reasonCodes: ['VERIFIER_ABORTED'] })
    await verifier.dispose()
  })

  it('fences and drains an active old policy generation before attachGeneration replacement', async () => {
    const registry = new ExpectedEffectRegistry()
    const oldRun = Promise.withResolvers<unknown>()
    let oldAborted = false
    const oldShell = shellFixture('MATCHED', 'sandboxed', async spec => {
      const signal = spec.signal as AbortSignal | undefined
      signal?.addEventListener('abort', () => { oldAborted = true }, { once: true })
      return oldRun.promise
    })
    const oldPolicy = { resolve: () => ({ mode: 'workspace-write' as const, workspaceRoot: 'D:\\Harness\\old-policy' }) }
    const verifier = new PostconditionVerifier(registry)
    verifier.attach(oldShell, oldPolicy)
    const old = exec('bash', { command: 'git switch main', description: 'replacement-old' }, 'replacement-old')
    registry.capture(old, 'replacement-old')
    verifier.observeResult(old, { isError: false, value: { kind: 'foreground', exitCode: 0, sandbox: { mode: 'workspace-write', denied: false } }, content: [] })
    await Promise.resolve()
    await Promise.resolve()

    const policyCalls: unknown[] = []
    const newPolicy = { resolve: (request: unknown) => { policyCalls.push(request); return { mode: 'workspace-write' as const, workspaceRoot: 'D:\\Harness\\new-policy' } } }
    let replaced = false
    const replacement = verifier.attachGeneration(oldShell, newPolicy).then(() => { replaced = true })
    await Promise.resolve()
    expect(replaced).toBe(false)
    expect(oldAborted).toBe(true)
    oldRun.resolve({ exitCode: 0, timedOut: false, aborted: false, stdout: { text: 'main', truncated: false }, stderr: { text: '', truncated: false } })
    await replacement
    expect(replaced).toBe(true)

    const current = exec('bash', { command: 'git switch main', description: 'replacement-new' }, 'replacement-new')
    registry.capture(current, 'replacement-new')
    verifier.observeResult(current, { isError: false, value: { kind: 'foreground', exitCode: 0, sandbox: { mode: 'workspace-write', denied: false } }, content: [] })
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(policyCalls).toHaveLength(1)
    expect(verifier.store.diagnostics.get('replacement-old')).toMatchObject({ status: 'UNKNOWN', reasonCodes: ['VERIFIER_ABORTED'] })
    expect(verifier.store.diagnostics.get('replacement-new')).toMatchObject({ status: 'MATCHED' })
    await verifier.dispose()
  })

  it('executes the product COPY_CHECKER against every frozen local classification', async () => {
    const cases = [
      ['copy-equal', 'MATCHED', () => ({ lstat: () => stat('file', 4), read: () => Buffer.from('same') })],
      ['copy-different', 'MISMATCHED', () => ({ lstat: () => stat('file', 4), read: (path: string) => path.includes('source') ? Buffer.from('same') : Buffer.from('diff') })],
      ['copy-absent', 'MISMATCHED', () => ({ lstat: (path: string) => { if (path.includes('destination')) throw Object.assign(new Error('missing'), { code: 'ENOENT' }); return stat('file', 4) }, read: () => Buffer.from('same') })],
      ['copy-eacces', 'UNKNOWN', () => ({ lstat: (path: string) => { if (path.includes('destination')) throw Object.assign(new Error('denied'), { code: 'EACCES' }); return stat('file', 4) }, read: () => Buffer.from('same') })],
      ['copy-eperm', 'UNKNOWN', () => ({ lstat: (path: string) => { if (path.includes('destination')) throw Object.assign(new Error('forbidden'), { code: 'EPERM' }); return stat('file', 4) }, read: () => Buffer.from('same') })],
      ['copy-race', 'UNKNOWN', () => ({ lstat: () => stat('file', 4), read: (path: string) => { if (path.includes('destination')) throw Object.assign(new Error('race'), { code: 'ENOENT' }); return Buffer.from('same') } })],
      ['copy-source-access', 'UNKNOWN', () => ({ lstat: () => stat('file', 4), read: () => { throw Object.assign(new Error('source denied'), { code: 'EACCES' }) } })],
      ['copy-source-missing', 'UNKNOWN', () => ({ lstat: () => { throw Object.assign(new Error('source missing'), { code: 'ENOENT' }) }, read: () => Buffer.from('same') })],
      ['copy-source-symlink', 'UNKNOWN', () => ({ lstat: () => stat('symlink', 4), read: () => Buffer.from('same') })],
      ['copy-dest-symlink', 'UNKNOWN', () => ({ lstat: (path: string) => stat(path.includes('destination') ? 'symlink' : 'file', 4), read: () => Buffer.from('same') })],
      ['copy-directory', 'UNKNOWN', () => ({ lstat: () => stat('directory', 4), read: () => Buffer.from('same') })],
      ['copy-special', 'UNKNOWN', () => ({ lstat: () => stat('special', 4), read: () => Buffer.from('same') })],
      ['copy-exact-1MiB', 'MATCHED', () => ({ lstat: () => stat('file', 1024 * 1024), read: () => Buffer.alloc(1024 * 1024, 7) })],
      ['copy-over-1MiB', 'UNKNOWN', () => ({ lstat: () => stat('file', 1024 * 1024 + 1), read: () => Buffer.alloc(8) })],
    ] as const
    for (const [id, expectedStatus, fixtureFactory] of cases) {
      const registry = new ExpectedEffectRegistry()
      const value = exec('bash', { command: 'cp source.txt destination.txt', description: 'fixture' }, id)
      registry.capture(value, id)
      const shell = shellFixture('ignored', 'unsandboxed', async spec => ({ exitCode: 0, timedOut: false, aborted: false, stdout: { text: executeProductCopyChecker(spec, fixtureFactory()), truncated: false }, stderr: { text: '', truncated: false } }))
      const verifier = new PostconditionVerifier(registry)
      verifier.attach(shell)
      verifier.observeResult(value, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(verifier.store.diagnostics.get(id)).toMatchObject({ status: expectedStatus, semanticSuccess: expectedStatus === 'MATCHED' ? true : expectedStatus === 'MISMATCHED' ? false : 'unknown' })
      expect(JSON.stringify(verifier.store.diagnostics.get(id))).not.toMatch(/source\.txt|destination\.txt|EACCES|EPERM/)
      await verifier.dispose()
    }
  })
})
