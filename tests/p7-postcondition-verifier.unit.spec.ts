import { describe, expect, it } from 'vitest'
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
    for (const [id, output, expected] of [['git-malformed', 'not a branch?', 'main'], ['git-different', 'other-branch', 'main']] as const) {
      const registry = new ExpectedEffectRegistry()
      const value = exec('bash', { command: 'git switch main', description: 'fixture' }, id)
      registry.capture(value, id)
      const verifier = new PostconditionVerifier(registry)
      verifier.attach(shellFixture(output))
      verifier.observeResult(value, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(verifier.store.diagnostics.get(id)?.status).toBe(expected === 'main' && output === 'other-branch' ? 'MISMATCHED' : 'UNKNOWN')
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

  it('keeps copy access/race markers UNKNOWN and reserves mismatch for coherent absence/difference', async () => {
    for (const [id, output, status] of [
      ['copy-equal', 'MATCHED', 'MATCHED'],
      ['copy-different', 'MISMATCHED', 'MISMATCHED'],
      ['copy-absent', 'MISMATCHED', 'MISMATCHED'],
      ['copy-eacces', 'UNKNOWN', 'UNKNOWN'],
      ['copy-eperm', 'UNKNOWN', 'UNKNOWN'],
      ['copy-race', 'UNKNOWN', 'UNKNOWN'],
    ] as const) {
      const registry = new ExpectedEffectRegistry()
      const value = exec('bash', { command: 'cp source.txt destination.txt', description: 'fixture' }, id)
      registry.capture(value, id)
      const shell = shellFixture(output)
      const verifier = new PostconditionVerifier(registry)
      verifier.attach(shell)
      verifier.observeResult(value, { isError: false, value: { kind: 'foreground', exitCode: 0 }, content: [] })
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(verifier.store.diagnostics.get(id)).toMatchObject({ status, semanticSuccess: status === 'MATCHED' ? true : status === 'MISMATCHED' ? false : 'unknown' })
      if (id === 'copy-equal') {
        expect(String(shell.calls[0]!.command)).toContain("e&&e.code==='ENOENT'?'MISMATCHED':'UNKNOWN'")
        expect(String(shell.calls[0]!.command)).toContain('same=')
      }
      await verifier.dispose()
    }
  })
})
