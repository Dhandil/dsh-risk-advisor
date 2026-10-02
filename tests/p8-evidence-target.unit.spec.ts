import { describe, expect, it } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { EvidenceTargetSeedRegistry } from '../src/host/evidence-target.ts'

function session(id = 's'): Session { return { id, header: { cwd: 'C:/workspace' } } as unknown as Session }
function exec(name: string, args: unknown, current: Session): ToolExecution { return { name, arguments: args, callId: `${name}-${Math.random()}`, rootCallId: 'root', signal: new AbortController().signal, token: Symbol() as never, agent: { session: current } } as unknown as ToolExecution }

describe('Phase 8 EvidenceTargetSeed', () => {
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
