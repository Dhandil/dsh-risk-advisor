import { describe, expect, it } from 'vitest'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import { EvidenceCollector } from '../src/host/evidence-collector.ts'

function session(): Session { return { id: 'lifecycle', header: { cwd: '/workspace' } } as unknown as Session }
function execution(s: Session, id: string): ToolExecution { return { name: 'write', arguments: { file_path: 'a.txt', content: 'x' }, callId: id, rootCallId: 'root', signal: new AbortController().signal, token: Symbol() as never, agent: { session: s } } as unknown as ToolExecution }
function fsFixture(slow = false): object {
  const target = (path: string) => ({ targetKey: path, displayPath: path })
  const wait = async () => { if (slow) await new Promise(resolve => setTimeout(resolve, 30)) }
  return {
    resolve: async (path: string, options?: { cwd?: string }) => { await wait(); return target(path.startsWith('/') ? path : `${options?.cwd ?? '/workspace'}/${path}`) },
    processPath: (value: { displayPath: string }) => value.displayPath,
    contains: () => true,
    lstat: async () => { await wait(); return { version: '1', type: 'file', size: 1 } },
    stat: async () => { await wait(); return { version: '1', type: 'file', size: 1 } },
    readBytes: async () => new Uint8Array([120]),
    listDir: async () => [],
  }
}

describe('Phase 8 lifecycle fences', () => {
  it('replacing a capability fences the old generation and disposal drains', async () => {
    const collector = new EvidenceCollector()
    const s = session()
    collector.attachFs(fsFixture(true) as never)
    const old = execution(s, 'old')
    collector.seeds.capture(old, 'old')
    const oldCompletion = new Promise<void>(resolve => collector.collect('old', () => resolve()))
    await new Promise(resolve => setTimeout(resolve, 5))
    collector.attachFs(fsFixture(false) as never)
    const current = execution(s, 'current')
    collector.seeds.capture(current, 'current')
    const currentSnapshot = await new Promise<NonNullable<ReturnType<typeof collector.diagnostics.get>>>(resolve => collector.collect('current', resolve))
    await oldCompletion
    expect(currentSnapshot.status).toBe('COMPLETE')
    expect(collector.diagnostics.get('old')).toBeDefined()
    await collector.detachFs()
    await collector.dispose()
    expect(collector.diagnostics.snapshot()).toEqual([])
  }, 30000)
})
