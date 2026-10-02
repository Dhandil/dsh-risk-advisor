import { randomUUID } from 'node:crypto'
import type { Session } from '@deepseek-ai/dsh-session'
import type { FileSystem, FsInfo, FsPathInfo, FsTarget } from '@deepseek-ai/dsh-fs'
import type { ExecutionId } from './correlation.ts'
import { EvidenceTargetSeedRegistry, type EvidenceTargetSeed } from './evidence-target.ts'
import { EvidenceScheduler } from './evidence-scheduler.ts'
import { deepFreezeEvidence, UNKNOWN_EVIDENCE_FACTS, type EvidenceDiagnostics, type EvidenceReasonCode, type EvidenceSnapshotV1 } from './evidence-types.ts'

type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access'
interface ShellRunResult { readonly exitCode: number | null; readonly stdout?: { readonly text: string; readonly truncated?: boolean }; readonly stderr?: { readonly text: string; readonly truncated?: boolean }; readonly timedOut?: boolean; readonly aborted?: boolean }
interface ShellCapability { readonly sandboxMode?: SandboxMode; readonly resolve: (request: Record<string, unknown>) => unknown; readonly run: (spec: unknown) => Promise<ShellRunResult> }

const MAX_DIR_ENTRIES = 200
const MAX_PACKAGE_BYTES = 64 * 1024
const MAX_OUTPUT_BYTES = 4096
const GIT_CHECKER = `const fs=require('node:fs');const cp=require('node:child_process');const root=process.env.RA_WORKSPACE;const paths=Object.keys(process.env).filter(k=>/^RA_TARGET_[0-7]$/.test(k)).sort().map(k=>process.env[k]).filter(Boolean);const r=(a)=>{try{return cp.execFileSync('git',a,{cwd:root,env:{GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'NUL',GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_PAGER:'cat',PAGER:'cat',PATH:process.env.PATH},stdio:['ignore','pipe','ignore'],timeout:4000}).toString('utf8')}catch(e){return null}};const inside=r(['rev-parse','--is-inside-work-tree'])==='true\\n';let tracked=false,clean=false;if(inside){tracked=paths.length>0&&paths.every(p=>r(['ls-files','--error-unmatch','--',p])!==null);clean=tracked&&paths.every(p=>r(['diff','--quiet','--',p])!==null&&r(['diff','--cached','--quiet','--',p])!==null)}process.stdout.write(JSON.stringify({repositoryAvailable:inside,tracked,clean}))`

interface Entry { readonly snapshot: EvidenceSnapshotV1; readonly createdAt: number }

function emptyCounts(): { evidenceItems: number; fileReads: number; evidenceChars: number; directoryEntries: number } { return { evidenceItems: 0, fileReads: 0, evidenceChars: 0, directoryEntries: 0 } }

function result(executionId: ExecutionId, status: EvidenceSnapshotV1['status'], observedAt: number, facts: EvidenceSnapshotV1['facts'], counts: EvidenceSnapshotV1['counts'], reasonCodes: readonly EvidenceReasonCode[], truncated = false): EvidenceSnapshotV1 {
  return deepFreezeEvidence({ schemaVersion: 1 as const, evidenceId: `ra-evidence-${randomUUID()}`, executionId, status, observedAt, facts, counts, truncated, reasonCodes: Object.freeze([...new Set(reasonCodes)]) })
}

function safeOutput(value: unknown): string { return typeof value === 'string' && value.length <= MAX_OUTPUT_BYTES ? value : '' }

function parseCheckerOutput(text: string): { repositoryAvailable: boolean; tracked: boolean; clean: boolean } | undefined {
  const raw = text.trim()
  if (!/^\{"repositoryAvailable":(?:true|false),"tracked":(?:true|false),"clean":(?:true|false)\}$/.test(raw)) return undefined
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    return typeof parsed.repositoryAvailable === 'boolean' && typeof parsed.tracked === 'boolean' && typeof parsed.clean === 'boolean'
      ? { repositoryAvailable: parsed.repositoryAvailable, tracked: parsed.tracked, clean: parsed.clean } : undefined
  } catch { return undefined }
}

export interface EvidenceCollectorOptions { readonly clock?: () => number; readonly seeds?: EvidenceTargetSeedRegistry; readonly maxRecords?: number; readonly ttlMs?: number }

/** Host-private, bounded, read-only Phase-8 collector. */
export class BoundedEvidenceRuntime {
  readonly seeds: EvidenceTargetSeedRegistry
  readonly diagnostics: EvidenceDiagnostics
  private readonly clock: () => number
  private readonly maxRecords: number
  private readonly ttlMs: number
  private scheduler = new EvidenceScheduler(2, 8, 5000)
  private readonly records = new Map<ExecutionId, Entry>()
  private readonly jobsBySession = new WeakMap<Session, Set<ExecutionId>>()
  private fs: FileSystem | undefined
  private fsGeneration = 0
  private shell: ShellCapability | undefined
  private shellGeneration = 0
  private active = true

  constructor(options: EvidenceCollectorOptions = {}) {
    this.clock = options.clock ?? (() => Date.now())
    this.maxRecords = options.maxRecords ?? 512
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000
    this.seeds = options.seeds ?? new EvidenceTargetSeedRegistry(this.clock)
    this.diagnostics = Object.freeze({ get: (id: string) => this.get(id), snapshot: () => Object.freeze([...this.records.values()].map(item => item.snapshot)) })
  }

  attachFs(fs: FileSystem): void { if (this.active) { this.fs = fs; this.fsGeneration += 1 } }
  async detachFs(): Promise<void> { this.fs = undefined; this.fsGeneration += 1; await this.scheduler.dispose(); if (this.active) this.scheduler = new EvidenceScheduler(2, 8, 5000) }
  attachShell(shell: ShellCapability): void { if (this.active) { this.shell = shell; this.shellGeneration += 1 } }
  async detachShell(): Promise<void> { this.shell = undefined; this.shellGeneration += 1; await this.scheduler.dispose(); if (this.active) this.scheduler = new EvidenceScheduler(2, 8, 5000) }
  hasSeed(executionId: ExecutionId): boolean { return this.seeds.has(executionId) }
  canCollect(executionId: ExecutionId): boolean { return this.active && this.fs !== undefined && this.seeds.has(executionId) }
  cancel(executionId: ExecutionId): void { this.scheduler.cancel(executionId) }

  collect(executionId: ExecutionId, onComplete?: (snapshot: EvidenceSnapshotV1) => void): void {
    if (!this.active) return
    const seed = this.seeds.takeById(executionId)
    if (seed === undefined) return
    const fs = this.fs
    const fsGeneration = this.fsGeneration
    const shell = this.shell
    const shellGeneration = this.shellGeneration
    const sessionJobs = this.jobsBySession.get(seed.session) ?? new Set<ExecutionId>()
    sessionJobs.add(executionId)
    this.jobsBySession.set(seed.session, sessionJobs)
    void this.scheduler.enqueue(executionId, signal => this.run(seed, fs, fsGeneration, shell, shellGeneration, signal)).then(outcome => {
      sessionJobs.delete(executionId)
      if (!this.active) return
      let snapshot: EvidenceSnapshotV1
      if (outcome.ok) snapshot = outcome.value
      else snapshot = result(executionId, outcome.reason === 'CANCELLED' ? 'CANCELLED' : outcome.reason === 'TIMEOUT' ? 'PARTIAL' : 'UNAVAILABLE', this.clock(), UNKNOWN_EVIDENCE_FACTS, emptyCounts(), [outcome.reason === 'TIMEOUT' ? 'EVIDENCE_TIMEOUT' : outcome.reason === 'CANCELLED' ? 'EVIDENCE_CANCELLED' : 'FS_CAPABILITY_UNAVAILABLE'])
      this.put(snapshot)
      try { onComplete?.(snapshot) } catch { /* advisory publication never vetoes native execution */ }
    })
  }

  cancelSession(session: Session): void {
    for (const id of this.jobsBySession.get(session) ?? []) this.scheduler.cancel(id)
    this.jobsBySession.delete(session)
  }

  async dispose(): Promise<void> {
    if (!this.active) return
    this.active = false
    this.seeds.dispose()
    await this.scheduler.dispose()
    this.records.clear()
    this.fs = undefined
    this.shell = undefined
  }

  private get(id: string): EvidenceSnapshotV1 | undefined {
    this.sweep()
    return this.records.get(id)?.snapshot
  }

  private put(snapshot: EvidenceSnapshotV1): void {
    this.sweep()
    while (this.records.size >= this.maxRecords) this.records.delete(this.records.keys().next().value as string)
    this.records.set(snapshot.executionId, { snapshot, createdAt: this.clock() })
  }

  private sweep(): void {
    const now = this.clock()
    for (const [id, item] of this.records) if (!Number.isFinite(now) || now - item.createdAt >= this.ttlMs) this.records.delete(id)
  }

  private async run(seed: EvidenceTargetSeed, fs: FileSystem | undefined, fsGeneration: number, shell: ShellCapability | undefined, shellGeneration: number, signal: AbortSignal): Promise<EvidenceSnapshotV1> {
    const now = this.clock()
    if (fs === undefined) return result(seed.executionId, 'UNAVAILABLE', now, UNKNOWN_EVIDENCE_FACTS, emptyCounts(), ['FS_CAPABILITY_UNAVAILABLE'])
    if (seed.explicitWorkdir && (seed.toolName === 'bash' || seed.toolName === 'pwsh')) return result(seed.executionId, 'PARTIAL', now, { ...UNKNOWN_EVIDENCE_FACTS, targetCountKnown: seed.exactTargetCount, checkpointAvailable: 'unknown' }, emptyCounts(), ['EXPLICIT_WORKDIR_UNRESOLVED', 'CHECKPOINT_CAPABILITY_UNAVAILABLE'])
    const counts = emptyCounts()
    const reasons: EvidenceReasonCode[] = ['CHECKPOINT_CAPABILITY_UNAVAILABLE']
    const facts = { ...UNKNOWN_EVIDENCE_FACTS }
    try {
      const cwd = seed.session.header.cwd
      if (typeof cwd !== 'string' || cwd.length === 0) return result(seed.executionId, 'UNAVAILABLE', now, facts, counts, ['TARGET_RESOLUTION_FAILED', ...reasons])
      const workspace = await fs.resolve(cwd, { signal })
      if (fsGeneration !== this.fsGeneration || fs !== this.fs) return result(seed.executionId, 'CANCELLED', now, facts, counts, ['FS_GENERATION_STALE'])
      const targetResults: Array<{ target: FsTarget; stat: FsInfo; lstat: FsPathInfo }> = []
      let contained: boolean | 'unknown' = seed.requestedPaths.length === 0 ? 'unknown' : true
      let alias: boolean | 'unknown' = seed.requestedPaths.length === 0 ? 'unknown' : false
      for (const raw of seed.requestedPaths.slice(0, 8)) {
        if (signal.aborted) return result(seed.executionId, 'CANCELLED', now, facts, counts, ['EVIDENCE_CANCELLED', ...reasons])
        const li = await fs.lstat(raw, { cwd }, signal)
        const target = await fs.resolve(raw, { cwd, signal })
        const stat = await fs.stat(target, signal)
        counts.evidenceItems += 1
        if (li === undefined || stat === undefined) { contained = 'unknown'; reasons.push('TARGET_MISSING'); continue }
        if (li.type === 'symlink') alias = true
        if (!fs.contains(workspace, target)) { contained = false; reasons.push('OUTSIDE_WORKSPACE') }
        targetResults.push({ target, stat, lstat: li })
      }
      const targetKnown = seed.exactTargetCount && seed.requestedPaths.length <= 8 && targetResults.length === seed.requestedPaths.length
      const canonicalKnown: boolean | 'unknown' = targetKnown && targetResults.length > 0 ? true : targetKnown && seed.requestedPaths.length === 0 ? 'unknown' : 'unknown'
      if (!targetKnown) reasons.push('TARGET_RESOLUTION_FAILED')
      Object.assign(facts, { targetCountKnown: seed.exactTargetCount, canonicalTargetsKnown: canonicalKnown, workspaceContained: contained, pathAliasObserved: alias })
      for (const item of targetResults) if (item.stat.type === 'directory' && contained === true) {
        try {
          const entries = await fs.listDir(item.target, signal)
          counts.directoryEntries += Math.min(entries.length, MAX_DIR_ENTRIES)
          if (entries.length > MAX_DIR_ENTRIES) { reasons.push('DIRECTORY_TRUNCATED'); (facts as { [key: string]: unknown }).targetCountKnown = false }
        } catch { reasons.push('TARGET_STAT_FAILED') }
      }
      if (seed.packageRelevant && contained !== false) await this.collectPackage(fs, workspace, signal, facts, counts, reasons)
      if ((seed.operationClass === 'direct-file' || seed.operationClass === 'simple-shell-file') && shell !== undefined && targetResults.length > 0 && contained === true) {
        const git = await this.collectGit(shell, fs, workspace, targetResults.map(item => item.target), seed.session, signal)
        if (shellGeneration !== this.shellGeneration || shell !== this.shell) return result(seed.executionId, 'CANCELLED', now, facts, counts, ['SHELL_GENERATION_STALE'])
        if (git === undefined) reasons.push('GIT_CHECKER_UNKNOWN')
        else Object.assign(facts, { versionControlled: git.repositoryAvailable ? git.tracked : false, exactTargetsClean: git.repositoryAvailable ? git.clean : 'unknown', rollbackMechanismKnown: git.repositoryAvailable && git.tracked && git.clean && targetResults.length === 1 && (seed.operationClass === 'direct-file'), })
      }
      if (seed.operationClass === 'direct-file' && (seed.toolName === 'write' || seed.toolName === 'edit') && shell === undefined) reasons.push('SHELL_CAPABILITY_UNAVAILABLE')
      const complete = targetKnown && contained !== 'unknown' && !reasons.some(code => ['TARGET_RESOLUTION_FAILED', 'TARGET_STAT_FAILED', 'OUTSIDE_WORKSPACE', 'TARGET_MISSING'].includes(code))
      return result(seed.executionId, complete ? 'COMPLETE' : 'PARTIAL', now, facts, counts, reasons, reasons.length > 1)
    } catch { return result(seed.executionId, 'PARTIAL', now, facts, counts, ['TARGET_RESOLUTION_FAILED', ...reasons]) }
  }

  private async collectPackage(fs: FileSystem, workspace: FsTarget, signal: AbortSignal, facts: Record<string, unknown>, counts: ReturnType<typeof emptyCounts>, reasons: EvidenceReasonCode[]): Promise<void> {
    try {
      const cwd = fs.processPath(workspace)
      const pathInfo = await fs.lstat('package.json', { cwd }, signal)
      if (pathInfo === undefined) { facts.packageManifestPresent = false; facts.packageManifestValid = false; return }
      if (pathInfo.type !== 'file') { facts.packageManifestPresent = true; facts.packageManifestValid = false; return }
      const target = await fs.resolve('package.json', { cwd, signal })
      const info = await fs.stat(target, signal)
      if (info === undefined || info.type !== 'file' || (info.size ?? 0) > MAX_PACKAGE_BYTES) { facts.packageManifestPresent = true; facts.packageManifestValid = false; if (info !== undefined) reasons.push('PACKAGE_MANIFEST_TOO_LARGE'); return }
      const bytes = await fs.readBytes(target, signal, MAX_PACKAGE_BYTES)
      counts.fileReads += 1; counts.evidenceChars += Math.min(bytes.byteLength, MAX_PACKAGE_BYTES); facts.packageManifestPresent = true
      if (bytes.byteLength > MAX_PACKAGE_BYTES) { reasons.push('PACKAGE_MANIFEST_TOO_LARGE'); return }
      const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
      facts.packageManifestValid = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      const scripts = parsed?.scripts
      facts.lifecycleScriptsPresent = scripts !== null && typeof scripts === 'object' && scripts !== undefined && Object.keys(scripts as object).some(key => ['preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly'].includes(key))
    } catch { reasons.push('PACKAGE_MANIFEST_INVALID') }
  }

  private async collectGit(shell: ShellCapability, fs: FileSystem, workspace: FsTarget, targets: readonly FsTarget[], session: Session, signal: AbortSignal): Promise<{ repositoryAvailable: boolean; tracked: boolean; clean: boolean } | undefined> {
    try {
      const env: Record<string, string> = { RA_WORKSPACE: fs.processPath(workspace) }
      targets.slice(0, 8).forEach((target, index) => { env[`RA_TARGET_${index}`] = fs.processPath(target) })
      const spec = shell.resolve({ command: `node -e ${JSON.stringify(GIT_CHECKER)}`, workdir: fs.processPath(workspace), timeoutMs: 5000, stdoutMaxBytes: MAX_OUTPUT_BYTES, signal, env, sandboxMode: 'read-only', session })
      const output = await shell.run(spec)
      if (output.exitCode !== 0 || output.timedOut || output.aborted || output.stdout?.truncated) return undefined
      return parseCheckerOutput(safeOutput(output.stdout?.text))
    } catch { return undefined }
  }
}

export { BoundedEvidenceRuntime as EvidenceCollector }
