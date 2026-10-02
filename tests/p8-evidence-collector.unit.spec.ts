import { describe, expect, it } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { EvidenceCollector } from '../src/host/evidence-collector.ts'

type Node = { type: 'file' | 'directory' | 'symlink' | 'other'; size?: number; bytes?: Uint8Array }
function session(): Session { return { id: 's', header: { cwd: '/workspace' } } as unknown as Session }
function execution(s: Session): ToolExecution { return { name: 'write', arguments: { file_path: 'src/a.txt', content: 'hello' }, callId: 'c', rootCallId: 'r', signal: new AbortController().signal, token: Symbol() as never, agent: { session: s } } as unknown as ToolExecution }
function fakeFs(nodes: Map<string, Node>): object {
  const target = (path: string) => ({ targetKey: path, displayPath: path })
  return {
    resolve: async (path: string, options?: { cwd?: string }) => target(path.startsWith('/') ? path : `${options?.cwd ?? '/workspace'}/${path}`),
    processPath: (value: { displayPath: string }) => value.displayPath,
    fileUrl: (value: { displayPath: string }) => `file://${value.displayPath}`,
    contains: (parent: { displayPath: string }, child: { displayPath: string }) => child.displayPath === parent.displayPath || child.displayPath.startsWith(`${parent.displayPath}/`),
    lstat: async (path: string, options?: { cwd?: string }) => { const full = path.startsWith('/') ? path : `${options?.cwd ?? '/workspace'}/${path}`; const n = nodes.get(full); return n === undefined ? undefined : { version: full, type: n.type === 'symlink' ? 'symlink' : n.type, size: n.size } },
    stat: async (value: { displayPath: string }) => { const n = nodes.get(value.displayPath); return n === undefined || n.type === 'symlink' ? undefined : { version: value.displayPath, type: n.type === 'symlink' ? 'other' : n.type, size: n.size } },
    readBytes: async (value: { displayPath: string }) => nodes.get(value.displayPath)?.bytes ?? new Uint8Array(),
    listDir: async () => [],
  }
}

describe('Phase 8 bounded collector', () => {
  it('uses canonical fs targets, preserves checkpoint unknown, and retains no path in the snapshot', async () => {
    const s = session()
    const nodes = new Map<string, Node>([['/workspace', { type: 'directory' }], ['/workspace/src/a.txt', { type: 'file', size: 5, bytes: new TextEncoder().encode('hello') }]])
    const collector = new EvidenceCollector({ clock: () => 10 })
    collector.attachFs(fakeFs(nodes) as never)
    const e = execution(s)
    collector.seeds.capture(e, 'e1')
    const snapshot = await new Promise<NonNullable<ReturnType<typeof collector.diagnostics.get>>>(resolve => collector.collect('e1', resolve))
    expect(snapshot.status).toBe('COMPLETE')
    expect(snapshot.facts.canonicalTargetsKnown).toBe(true)
    expect(snapshot.facts.workspaceContained).toBe(true)
    expect(snapshot.facts.checkpointAvailable).toBe('unknown')
    expect(JSON.stringify(snapshot)).not.toContain('/workspace')
    await collector.dispose()
  })

  it('fails closed on outside targets and bounds package evidence without content retention', async () => {
    const s = session()
    const nodes = new Map<string, Node>([['/workspace', { type: 'directory' }], ['/outside.txt', { type: 'file', size: 4, bytes: new TextEncoder().encode('oops') }]])
    const collector = new EvidenceCollector({ clock: () => 10 })
    collector.attachFs(fakeFs(nodes) as never)
    const e = { ...execution(s), arguments: { file_path: '/outside.txt', content: 'x' } } as unknown as ToolExecution
    collector.seeds.capture(e, 'outside')
    const snapshot = await new Promise<NonNullable<ReturnType<typeof collector.diagnostics.get>>>(resolve => collector.collect('outside', resolve))
    expect(snapshot.facts.workspaceContained).toBe(false)
    expect(snapshot.reasonCodes).toContain('OUTSIDE_WORKSPACE')
    expect(JSON.stringify(snapshot)).not.toContain('oops')
    await collector.dispose()
  })

  it('keeps underlying timed-out work owned until it settles', async () => {
    const { EvidenceScheduler } = await import('../src/host/evidence-scheduler.ts')
    const scheduler = new EvidenceScheduler(1, 1, 5)
    let settled = false
    const first = scheduler.enqueue('slow', async () => { await new Promise(resolve => setTimeout(resolve, 25)); settled = true; return 1 })
    await expect(first).resolves.toMatchObject({ ok: false, reason: 'TIMEOUT' })
    expect(settled).toBe(false)
    await new Promise(resolve => setTimeout(resolve, 30))
    expect(settled).toBe(true)
    await scheduler.dispose()
  })

  it('does not allow duplicate evidence keys to create competing work', async () => {
    const { EvidenceScheduler } = await import('../src/host/evidence-scheduler.ts')
    const scheduler = new EvidenceScheduler(1, 1, 50)
    const gate = new Promise<number>(resolve => setTimeout(() => resolve(1), 10))
    const first = scheduler.enqueue('same', async () => gate)
    const duplicate = await scheduler.enqueue('same', async () => 2)
    expect(duplicate).toMatchObject({ ok: false, reason: 'SATURATED' })
    await expect(first).resolves.toMatchObject({ ok: true, value: 1 })
    await scheduler.dispose()
  })
})
