import { describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile, lstat, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve as resolvePath, relative } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
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

const execFileAsync = promisify(execFile)
function realFs(root: string): object {
  const target = (path: string) => ({ targetKey: path, displayPath: path })
  const full = (path: string, cwd = root) => resolvePath(cwd, path)
  return {
    resolve: async (path: string, options?: { cwd?: string }) => target(full(path, options?.cwd ?? root)),
    processPath: (value: { displayPath: string }) => value.displayPath,
    fileUrl: (value: { displayPath: string }) => `file://${value.displayPath}`,
    contains: (parent: { displayPath: string }, child: { displayPath: string }) => { const r = relative(parent.displayPath, child.displayPath); return r === '' || (!r.startsWith('..') && !r.startsWith('/') && !/^[A-Za-z]:/.test(r)) },
    lstat: async (path: string, options?: { cwd?: string }) => { try { const item = await lstat(full(path, options?.cwd ?? root)); return { version: item.mtimeMs.toString(), type: item.isSymbolicLink() ? 'symlink' : item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other', size: item.size } } catch { return undefined } },
    stat: async (value: { displayPath: string }) => { try { const item = await stat(value.displayPath); return { version: item.mtimeMs.toString(), type: item.isDirectory() ? 'directory' : item.isFile() ? 'file' : 'other', size: item.size } } catch { return undefined } },
    readBytes: async (value: { displayPath: string }) => new Uint8Array(await readFile(value.displayPath)),
    listDir: async (value: { displayPath: string }) => await readdir(value.displayPath),
  }
}

function realShell(): object {
  return {
    resolve: (request: Record<string, unknown>) => request,
    run: async (spec: unknown) => {
      const request = spec as { command: string; workdir: string; env?: Record<string, string> }
      const script = JSON.parse(request.command.slice('node -e '.length)) as string
      try {
        const output = await execFileAsync('node', ['-e', script], { cwd: request.workdir, env: { ...process.env, ...request.env }, maxBuffer: 4096 })
        return { exitCode: 0, stdout: { text: output.stdout } }
      } catch (error) {
        const failure = error as { code?: number; stdout?: string; stderr?: string }
        return { exitCode: typeof failure.code === 'number' ? failure.code : 1, stdout: { text: failure.stdout ?? '' }, stderr: { text: failure.stderr ?? '' } }
      }
    },
  }
}

function realExecution(s: Session, filePath: string, id: string): ToolExecution {
  return { name: 'write', arguments: { file_path: filePath, content: 'requested' }, callId: id, rootCallId: 'root', signal: new AbortController().signal, token: Symbol() as never, agent: { session: s } } as unknown as ToolExecution
}

async function collect(collector: EvidenceCollector, executionId: string): Promise<NonNullable<ReturnType<EvidenceCollector['diagnostics']['get']>>> {
  return await new Promise(resolve => collector.collect(executionId, resolve))
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

  it('uses the product Git checker for clean, dirty, untracked, and ignored states', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p8-git-'))
    try {
      const s = { id: 'git-session', header: { cwd: root } } as unknown as Session
      await writeFile(join(root, 'tracked.txt'), 'tracked')
      await execFileAsync('git', ['init', '--quiet'], { cwd: root })
      await execFileAsync('git', ['config', 'user.email', 'p8@example.invalid'], { cwd: root })
      await execFileAsync('git', ['config', 'user.name', 'Phase 8'], { cwd: root })
      await execFileAsync('git', ['add', 'tracked.txt'], { cwd: root })
      await execFileAsync('git', ['commit', '--quiet', '-m', 'fixture'], { cwd: root })
      const fsmonitorSentinel = join(root, 'fsmonitor-sentinel.txt')
      await execFileAsync('git', ['config', 'core.fsmonitor', "node -e \"require('node:fs').writeFileSync(process.env.P8_FSMONITOR_SENTINEL,'executed')\""], { cwd: root, env: { ...process.env, P8_FSMONITOR_SENTINEL: fsmonitorSentinel } })
      await writeFile(join(root, '.gitignore'), 'ignored.txt\n')
      await writeFile(join(root, 'untracked.txt'), 'u')
      await writeFile(join(root, 'ignored.txt'), 'i')
      const collector = new EvidenceCollector()
      collector.attachFs(realFs(root) as never); collector.attachShell(realShell() as never)
      const cases = [
        ['clean', 'tracked.txt'],
        ['dirty', 'tracked.txt'],
        ['untracked', 'untracked.txt'],
        ['ignored', 'ignored.txt'],
      ] as const
      const snapshots: Record<string, NonNullable<ReturnType<EvidenceCollector['diagnostics']['get']>>> = {}
      const execution = (id: string, path: string) => { const value = realExecution(s, path, id); collector.seeds.capture(value, id); return value }
      execution('clean', 'tracked.txt'); snapshots.clean = await collect(collector, 'clean')
      await writeFile(join(root, 'tracked.txt'), 'dirty')
      execution('dirty', 'tracked.txt'); snapshots.dirty = await collect(collector, 'dirty')
      execution('untracked', 'untracked.txt'); snapshots.untracked = await collect(collector, 'untracked')
      execution('ignored', 'ignored.txt'); snapshots.ignored = await collect(collector, 'ignored')
      expect(snapshots.clean.facts.versionControlled).toBe(true)
      expect(snapshots.clean.facts.exactTargetsClean).toBe(true)
      expect(snapshots.dirty.facts.exactTargetsClean).toBe(false)
      expect(snapshots.untracked.facts.versionControlled).toBe(false)
      expect(snapshots.ignored.facts.versionControlled).toBe(false)
      expect(await stat(fsmonitorSentinel).then(() => true).catch(() => false)).toBe(false)
      await collector.dispose()
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 30000)

  it('bounds directory evidence, package reads, and Session snapshot retention', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-risk-advisor-p8-bounds-'))
    try {
      const s = { id: 'bounds-session', header: { cwd: root } } as unknown as Session
      await mkdir(join(root, 'many'))
      for (let i = 0; i < 220; i += 1) await writeFile(join(root, 'many', `entry-${i}.txt`), 'x')
      const collector = new EvidenceCollector()
      collector.attachFs(realFs(root) as never)
      const dirExec = realExecution(s, 'many', 'directory')
      collector.seeds.capture(dirExec, 'directory')
      const directory = await collect(collector, 'directory')
      expect(directory.counts.directoryEntries).toBe(200)
      expect(directory.reasonCodes).toContain('DIRECTORY_ENTRY_LIMIT')
      for (let i = 0; i < 129; i += 1) {
        const path = `many/entry-${i}.txt`
        const value = realExecution(s, path, `retention-${i}`)
        collector.seeds.capture(value, `retention-${i}`)
        await collect(collector, `retention-${i}`)
      }
      expect(collector.diagnostics.snapshot().length).toBeLessThanOrEqual(128)
      collector.disposeSession(s)
      expect(collector.diagnostics.snapshot()).toEqual([])
      await collector.dispose()
    } finally { await rm(root, { recursive: true, force: true }) }
  }, 60000)

  it('keeps cancellation tombstones bounded, session-owned, and terminal', async () => {
    const collector = new EvidenceCollector()
    for (let i = 0; i < 700; i += 1) collector.cancel(`native-${i}`)
    const state = collector as unknown as { cancelled: Map<string, unknown> }
    expect(state.cancelled.size).toBeLessThanOrEqual(512)

    const s = session()
    const blocked = execution(s)
    collector.seeds.capture(blocked, 'blocked')
    collector.cancel('blocked')
    expect(state.cancelled.has('blocked')).toBe(true)
    const complete = vi.fn()
    collector.collect('blocked', complete)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(complete).not.toHaveBeenCalled()

    const sessionOnly = new EvidenceCollector()
    const sessionExecution = execution(s)
    sessionOnly.seeds.capture(sessionExecution, 'session-owned')
    sessionOnly.cancel('session-owned')
    const sessionState = sessionOnly as unknown as { cancelled: Map<string, unknown> }
    expect(sessionState.cancelled.has('session-owned')).toBe(true)
    sessionOnly.disposeSession(s)
    expect(sessionState.cancelled.size).toBe(0)
    await sessionOnly.dispose()
    expect(state.cancelled.size).toBeLessThanOrEqual(512)
    await collector.dispose()
    expect(state.cancelled.size).toBe(0)
  })
})
