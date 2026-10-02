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

function deferred<T = void>(): { readonly promise: Promise<T>; readonly resolve: (value: T | PromiseLike<T>) => void } {
  let resolve!: (value: T | PromiseLike<T>) => void
  const promise = new Promise<T>(value => { resolve = value })
  return { promise, resolve }
}

function target(path: string): { targetKey: string; displayPath: string } { return { targetKey: path, displayPath: path } }

function ignoringFs(gate: { readonly promise: Promise<void> } | undefined, started?: () => void): object {
  return {
    resolve: async (path: string, options?: { cwd?: string }) => target(path.startsWith('/') ? path : `${options?.cwd ?? '/workspace'}/${path}`),
    processPath: (value: { displayPath: string }) => value.displayPath,
    contains: () => true,
    lstat: async () => { started?.(); await gate?.promise; return { version: '1', type: 'file', size: 1 } },
    stat: async () => { await gate?.promise; return { version: '1', type: 'file', size: 1 } },
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

  it('cancels an abort-ignoring fs generation and publishes only the replacement result', async () => {
    const collector = new EvidenceCollector()
    const s = session()
    const oldGate = deferred<void>()
    let oldStarted!: () => void
    const started = new Promise<void>(resolve => { oldStarted = resolve })
    collector.attachFs(ignoringFs(oldGate, oldStarted) as never)
    const old = execution(s, 'old-ignore')
    collector.seeds.capture(old, 'old-ignore')
    const oldResult = new Promise<NonNullable<ReturnType<typeof collector.diagnostics.get>>>(resolve => collector.collect('old-ignore', resolve))
    await started

    collector.attachFs(fsFixture(false) as never)
    const current = execution(s, 'new-generation')
    collector.seeds.capture(current, 'new-generation')
    const currentResult = new Promise<NonNullable<ReturnType<typeof collector.diagnostics.get>>>(resolve => collector.collect('new-generation', resolve))
    oldGate.resolve()

    const [oldSnapshot, currentSnapshot] = await Promise.all([oldResult, currentResult])
    expect(oldSnapshot.status).toBe('CANCELLED')
    expect(oldSnapshot.reasonCodes).toContain('EVIDENCE_CANCELLED')
    expect(currentSnapshot.status).toBe('COMPLETE')
    await collector.dispose()
  }, 30000)

  it('fences an abort-ignoring shell Git checker and drains before replacement publication', async () => {
    const collector = new EvidenceCollector()
    const s = session()
    const shellGate = deferred<void>()
    let shellStarted!: () => void
    const started = new Promise<void>(resolve => { shellStarted = resolve })
    const fs = fsFixture(false)
    const oldShell = {
      resolve: (request: Record<string, unknown>) => request,
      run: async () => { shellStarted(); await shellGate.promise; return { exitCode: 0, stdout: { text: '{"repositoryAvailable":true,"tracked":true,"ignored":false,"clean":true}' } } },
    }
    const newShell = {
      resolve: (request: Record<string, unknown>) => request,
      run: async () => ({ exitCode: 0, stdout: { text: '{"repositoryAvailable":true,"tracked":true,"ignored":false,"clean":true}' } }),
    }
    collector.attachFs(fs as never)
    collector.attachShell(oldShell as never)
    const old = execution(s, 'old-shell')
    collector.seeds.capture(old, 'old-shell')
    const oldResult = new Promise<NonNullable<ReturnType<typeof collector.diagnostics.get>>>(resolve => collector.collect('old-shell', resolve))
    await started

    collector.attachShell(newShell as never)
    const current = execution(s, 'new-shell')
    collector.seeds.capture(current, 'new-shell')
    const currentResult = new Promise<NonNullable<ReturnType<typeof collector.diagnostics.get>>>(resolve => collector.collect('new-shell', resolve))
    shellGate.resolve()

    const [oldSnapshot, currentSnapshot] = await Promise.all([oldResult, currentResult])
    expect(oldSnapshot.status).toBe('CANCELLED')
    expect(currentSnapshot.status).toBe('COMPLETE')
    await collector.dispose()
  }, 30000)
})
