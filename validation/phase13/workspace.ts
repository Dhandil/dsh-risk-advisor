import { lstat, mkdir, readFile, realpath, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep, win32 } from 'node:path'

export class WorkspaceContainmentError extends Error {
  constructor(readonly reason: string) { super(`phase13-workspace-containment:${reason}`); this.name = 'WorkspaceContainmentError' }
}

const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const SCENARIO_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/

function within(root: string, target: string): boolean {
  const rel = relative(root, target)
  return rel === '' || (!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`))
}

function validateRelativePath(path: string): string {
  if (path.length === 0 || path.includes('\0') || isAbsolute(path) || win32.isAbsolute(path) || /^[A-Za-z]:/.test(path)) {
    throw new WorkspaceContainmentError('absolute-or-empty-path')
  }
  const normalized = path.replaceAll('\\', '/')
  const parts = normalized.split('/')
  if (parts.some(part => part === '..' || part === '.' || part.length === 0)) throw new WorkspaceContainmentError('traversal-or-ambiguous-path')
  return normalized
}

async function assertNoSymlink(root: string, target: string, includeTarget: boolean): Promise<void> {
  if (!within(root, target)) throw new WorkspaceContainmentError('outside-root')
  const rel = relative(root, target)
  const parts = rel === '' ? [] : rel.split(sep)
  let cursor = root
  const limit = includeTarget ? parts.length : Math.max(0, parts.length - 1)
  for (let i = 0; i < limit; i += 1) {
    cursor = join(cursor, parts[i]!)
    try {
      const stat = await lstat(cursor)
      if (stat.isSymbolicLink()) throw new WorkspaceContainmentError('symlink-ancestor')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') break
      throw error
    }
  }
  let ancestor = target
  while (true) {
    try {
      const canonical = await realpath(ancestor)
      if (!within(root, canonical)) throw new WorkspaceContainmentError('resolved-ancestor-outside-root')
      return
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      const parent = dirname(ancestor)
      if (parent === ancestor || !within(root, parent)) throw new WorkspaceContainmentError('no-contained-existing-ancestor')
      ancestor = parent
    }
  }
}

export class Phase13Workspace {
  private constructor(readonly root: string, private readonly canonicalRoot: string) {}

  static async create(campaignRunId: string): Promise<Phase13Workspace> {
    if (!RUN_ID.test(campaignRunId)) throw new WorkspaceContainmentError('run-id-invalid')
    const base = resolve(tmpdir(), 'dsh-risk-advisor-phase13')
    await mkdir(base, { recursive: true, mode: 0o700 })
    const baseReal = await realpath(base)
    const root = join(baseReal, campaignRunId)
    await mkdir(root, { mode: 0o700 })
    const rootStat = await lstat(root)
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new WorkspaceContainmentError('run-root-not-private-directory')
    const canonicalRoot = await realpath(root)
    if (canonicalRoot !== root || !within(baseReal, canonicalRoot)) throw new WorkspaceContainmentError('run-root-escape')
    return new Phase13Workspace(root, canonicalRoot)
  }

  static async openExisting(campaignRunId: string): Promise<Phase13Workspace> {
    if (!RUN_ID.test(campaignRunId)) throw new WorkspaceContainmentError('run-id-invalid')
    const baseReal = await realpath(join(tmpdir(), 'dsh-risk-advisor-phase13'))
    const root = join(baseReal, campaignRunId)
    const stat = await lstat(root)
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new WorkspaceContainmentError('existing-run-root-invalid')
    const canonicalRoot = await realpath(root)
    if (canonicalRoot !== root || !within(baseReal, canonicalRoot)) throw new WorkspaceContainmentError('existing-run-root-escape')
    return new Phase13Workspace(root, canonicalRoot)
  }

  scenarioRoot(scenarioId: string): string {
    if (!SCENARIO_ID.test(scenarioId)) throw new WorkspaceContainmentError('scenario-id-invalid')
    return join(this.root, scenarioId)
  }

  async resolveArtifactPath(name: string): Promise<string> {
    const safe = validateRelativePath(name)
    if (safe.includes('/')) throw new WorkspaceContainmentError('artifact-name-must-be-flat')
    const target = resolve(this.canonicalRoot, safe)
    await assertNoSymlink(this.canonicalRoot, target, false)
    return target
  }

  async writeArtifact(name: string, content: string): Promise<void> {
    if (content.length > 64 * 1024) throw new RangeError('artifact-content-cap')
    const target = await this.resolveArtifactPath(name)
    await assertNoSymlink(this.canonicalRoot, target, true)
    await writeFile(target, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
  }

  async createScenario(scenarioId: string): Promise<string> {
    const path = this.scenarioRoot(scenarioId)
    await assertNoSymlink(this.canonicalRoot, path, false)
    await mkdir(path, { recursive: false, mode: 0o700 })
    await assertNoSymlink(this.canonicalRoot, path, true)
    return path
  }

  async resolveScenarioPath(scenarioId: string, relativePath: string): Promise<string> {
    const scenario = this.scenarioRoot(scenarioId)
    const safe = validateRelativePath(relativePath)
    const target = resolve(scenario, safe)
    if (!within(scenario, target)) throw new WorkspaceContainmentError('scenario-escape')
    await assertNoSymlink(this.canonicalRoot, scenario, true)
    await assertNoSymlink(this.canonicalRoot, target, false)
    return target
  }

  async writeScenarioFile(scenarioId: string, relativePath: string, content: string): Promise<void> {
    const target = await this.resolveScenarioPath(scenarioId, relativePath)
    await mkdir(dirname(target), { recursive: true, mode: 0o700 })
    await assertNoSymlink(this.canonicalRoot, target, true)
    await writeFile(target, content, { encoding: 'utf8', flag: 'w', mode: 0o600 })
  }

  async readScenarioFile(scenarioId: string, relativePath: string): Promise<string> {
    const target = await this.resolveScenarioPath(scenarioId, relativePath)
    await assertNoSymlink(this.canonicalRoot, target, true)
    return readFile(target, 'utf8')
  }

  async resetScenario(scenarioId: string, baseline: Readonly<Record<string, string>>): Promise<void> {
    const path = this.scenarioRoot(scenarioId)
    await assertNoSymlink(this.canonicalRoot, path, false)
    try { await removeTreeRejectingSymlinks(this.canonicalRoot, path) }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error }
    await mkdir(path, { mode: 0o700 })
    for (const [relativePath, content] of Object.entries(baseline).sort(([a], [b]) => a.localeCompare(b))) {
      await this.writeScenarioFile(scenarioId, relativePath, content)
    }
  }

  async cleanup(): Promise<void> {
    await removeTreeRejectingSymlinks(dirname(this.canonicalRoot), this.canonicalRoot)
  }

  async cleanupScenarios(): Promise<void> {
    for (const name of await readdir(this.canonicalRoot)) {
      const target = join(this.canonicalRoot, name)
      const stat = await lstat(target)
      if (stat.isSymbolicLink()) throw new WorkspaceContainmentError('scenario-cleanup-symlink')
      if (stat.isDirectory()) await removeTreeRejectingSymlinks(this.canonicalRoot, target)
    }
  }
}

async function removeTreeRejectingSymlinks(root: string, target: string): Promise<void> {
  const initialStat = await lstat(target)
  if (initialStat.isSymbolicLink()) throw new WorkspaceContainmentError('cleanup-symlink')
  const targetReal = await realpath(target)
  const rootReal = await realpath(root)
  if (!within(rootReal, targetReal) || targetReal === rootReal) throw new WorkspaceContainmentError('cleanup-outside-or-root')
  const stat = initialStat
  if (stat.isDirectory()) {
    for (const name of await readdir(targetReal)) await removeTreeRejectingSymlinks(rootReal, join(targetReal, name))
  }
  await rm(targetReal, { recursive: stat.isDirectory(), force: false })
}
