import { describe, expect, it } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { EvidenceTargetSeedRegistry } from '../src/host/evidence-target.ts'

function session(id = 's'): Session { return { id, header: { cwd: 'C:/workspace' } } as unknown as Session }
function exec(name: string, args: unknown, current: Session): ToolExecution { return { name, arguments: args, callId: `${name}-${Math.random()}`, rootCallId: 'root', signal: new AbortController().signal, token: Symbol() as never, agent: { session: current } } as unknown as ToolExecution }

describe('Phase 8 EvidenceTargetSeed', () => {
  it('accepts the pinned per-tool argument schemas without retaining non-semantic fields', () => {
    const registry = new EvidenceTargetSeedRegistry(() => 1)
    const s = session()
    const read = exec('read', { file_path: 'src/a.ts', offset: 3, limit: 7 }, s)
    registry.capture(read, 'read')
    expect(registry.takeById('read')).toMatchObject({ requestedPaths: ['src/a.ts'], operationClass: 'direct-file' })
    const bash = exec('bash', { command: 'mkdir build', description: 'Create build directory', timeoutMs: 1000, run_in_background: false }, s)
    registry.capture(bash, 'bash')
    expect(registry.takeById('bash')).toMatchObject({ requestedPaths: ['build'], operationClass: 'simple-shell-file' })
    const pwsh = exec('pwsh', { command: 'mkdir build', description: 'Create build directory', timeoutMs: 1000, run_in_background: false, sandbox_permissions: 'workspace-write', justification: 'Required by the bounded operation' }, s)
    registry.capture(pwsh, 'pwsh')
    expect(registry.takeById('pwsh')).toMatchObject({ requestedPaths: ['build'], operationClass: 'simple-shell-file', requestedPermission: 'workspace-write' })
    const write = exec('write', { file_path: 'src/a.ts', content: 'x', sandbox_permissions: 'workspace-write', justification: 'Write the requested file' }, s)
    registry.capture(write, 'write')
    expect(registry.takeById('write')).toMatchObject({ requestedPaths: ['src/a.ts'], requestedPermission: 'workspace-write' })
  })

  it('captures only own data properties and keeps unsupported/accessor inputs path-free', () => {
    const registry = new EvidenceTargetSeedRegistry(() => 1)
    const s = session()
    const direct = exec('write', { file_path: 'src/a.ts', content: 'x' }, s)
    registry.capture(direct, 'e1')
    expect(registry.has('e1')).toBe(true)
    const accessorArgs = Object.defineProperty({}, 'file_path', { get: () => 'secret.ts' })
    const bad = exec('write', accessorArgs, s)
    registry.capture(bad, 'e2')
    expect(registry.takeById('e2')?.requestedPaths).toEqual([])
    expect(registry.takeById('e1')?.requestedPaths).toEqual(['src/a.ts'])
  })

  it('rejects unknown extra fields and expires raw seeds before take', () => {
    let now = 1
    const registry = new EvidenceTargetSeedRegistry(() => now)
    const s = session()
    const unknown = exec('read', { file_path: 'secret.txt', offset: 1, extra: 'must-not-pass' }, s)
    registry.capture(unknown, 'unknown')
    expect(registry.takeById('unknown')?.requestedPaths).toEqual([])
    const expiring = exec('write', { file_path: 'ttl.txt', content: 'x' }, s)
    registry.capture(expiring, 'expiring')
    now += 5 * 60 * 1000
    expect(registry.take(expiring)).toBeUndefined()
  })

  it('enforces the exact 128 per-session raw seed bound and one-shot consumption', () => {
    const registry = new EvidenceTargetSeedRegistry(() => 1)
    const s = session()
    for (let i = 0; i < 129; i += 1) registry.capture(exec('write', { file_path: `f-${i}.txt`, content: 'x' }, s), `e-${i}`)
    expect(registry.has('e-0')).toBe(false)
    expect(registry.has('e-1')).toBe(true)
    expect(registry.has('e-128')).toBe(true)
    expect(registry.takeById('e-1')).toBeDefined()
    expect(registry.takeById('e-1')).toBeUndefined()
  })

  it('uses the shared shell parser and refuses expansion or explicit workdir hard targets', () => {
    const registry = new EvidenceTargetSeedRegistry(() => 1)
    const s = session()
    const dynamic = exec('bash', { command: 'mkdir $HOME/x' }, s)
    registry.capture(dynamic, 'dynamic')
    expect(registry.takeById('dynamic')?.requestedPaths).toEqual([])
    const explicit = exec('bash', { command: 'mkdir build', workdir: 'other' }, s)
    registry.capture(explicit, 'explicit')
    expect(registry.takeById('explicit')).toMatchObject({ explicitWorkdir: true, requestedPaths: ['build'] })
  })
})
