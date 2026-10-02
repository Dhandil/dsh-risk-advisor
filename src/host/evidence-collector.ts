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
interface MutableCounts { evidenceItems: number; fileReads: number; evidenceChars: number; directoryEntries: number }
interface Entry { readonly snapshot: EvidenceSnapshotV1; readonly session: Session; readonly createdAt: number }

const MAX_DIR_ENTRIES = 200
const MAX_PACKAGE_BYTES = 64 * 1024
const MAX_OUTPUT_BYTES = 4096
const MAX_EVIDENCE_ITEMS = 20
const MAX_FILE_READS = 5
const MAX_EVIDENCE_CHARS = 64 * 1024
const MAX_RECORDS = 512
const PER_SESSION_RECORDS = 128
const TTL_MS = 5 * 60 * 1000

/** Product-owned local-only checker. Paths are data and become Git pathspecs only inside this execution world. */
const GIT_CHECKER = `const fs=require('node:fs');const cp=require('node:child_process');const path=require('node:path');const root=process.env.RA_WORKSPACE;const raw=Object.keys(process.env).filter(k=>/^RA_TARGET_[0-7]$/.test(k)).sort().map(k=>process.env[k]).filter(v=>typeof v==='string'&&v.length>0);const nul=process.platform==='win32'?'NUL':'/dev/null';const env={...process.env,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:nul,GIT_CONFIG_SYSTEM:nul,GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_PAGER:'cat',PAGER:'cat',GIT_CONFIG_COUNT:'0',GIT_EXTERNAL_DIFF:'',GIT_TRACE:'0'};const run=(args)=>{try{const out=cp.spawnSync('git',args,{cwd:root,env,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:4000,windowsHide:true});return {code:typeof out.status==='number'?out.status:null,ok:out.error===undefined&&out.signal===null}}catch{return {code:null,ok:false}}};let inside=false;try{const out=cp.spawnSync('git',['rev-parse','--is-inside-work-tree'],{cwd:root,env,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:4000,windowsHide:true});inside=out.status===0&&out.stdout==='true\\n'}catch{};const spec=(value)=>{try{const rr=fs.realpathSync.native(root);const tt=fs.realpathSync.native(value);const rel=path.relative(rr,tt);if(!rel||path.isAbsolute(rel)||rel==='..'||rel.startsWith('..'+path.sep)||rel.startsWith(':')||/[?*\\[\\]]/.test(rel))return null;return rel.split(path.sep).join('/')}catch{return null}};const specs=inside&&typeof root==='string'?raw.map(spec):[];const valid=inside&&specs.length===raw.length&&specs.every(v=>v!==null);let tracked=false,ignored=false,clean=false;if(valid){tracked=specs.every(p=>run(['ls-files','--error-unmatch','--',p]).code===0);ignored=specs.some(p=>run(['check-ignore','--quiet','--',p]).code===0);clean=tracked&&specs.every(p=>run(['diff','--no-ext-diff','--no-textconv','--quiet','--',p]).code===0&&run(['diff','--no-ext-diff','--no-textconv','--cached','--quiet','--',p]).code===0)}process.stdout.write(JSON.stringify({repositoryAvailable:inside,tracked,ignored,clean}))`

function emptyCounts(): MutableCounts { return { evidenceItems: 0, fileReads: 0, evidenceChars: 0, directoryEntries: 0 } }

function result(executionId: ExecutionId, status: EvidenceSnapshotV1['status'], observedAt: number, facts: EvidenceSnapshotV1['facts'], counts: MutableCounts, reasonCodes: readonly EvidenceReasonCode[], truncated = false): EvidenceSnapshotV1 {
  return deepFreezeEvidence({ schemaVersion: 1 as const, evidenceId: `ra-evidence-${randomUUID()}`, executionId, status, observedAt, facts, counts: { ...counts }, truncated, reasonCodes: Object.freeze([...new Set(reasonCodes)]) })
}

function safeOutput(value: unknown): string { return typeof value === 'string' && value.length <= MAX_OUTPUT_BYTES ? value : '' }

function parseCheckerOutput(text: string): { repositoryAvailable: boolean; tracked: boolean; ignored: boolean; clean: boolean } | undefined {
  if (!/^\{"repositoryAvailable":(?:true|false),"tracked":(?:true|false),"ignored":(?:true|false),"clean":(?:true|false)\}$/.test(text)) return undefined
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    return typeof parsed.repositoryAvailable === 'boolean' && typeof parsed.tracked === 'boolean' && typeof parsed.ignored === 'boolean' && typeof parsed.clean === 'boolean'
      ? { repositoryAvailable: parsed.repositoryAvailable, tracked: parsed.tracked, ignored: parsed.ignored, clean: parsed.clean } : undefined
  } catch { return undefined }
}

interface Budget {
  readonly counts: MutableCounts
  readonly reasons: EvidenceReasonCode[]
  truncated: boolean
  item(): boolean
  file(bytes: number): boolean
  chars(bytes: number): boolean
  directory(entries: number): number
}

function budget(counts: MutableCounts, reasons: EvidenceReasonCode[]): Budget {
  const add = (code: EvidenceReasonCode) => { if (!reasons.includes(code)) reasons.push(code) }
  return {
    counts,
    reasons,
    truncated: false,
    item() {
      if (counts.evidenceItems >= MAX_EVIDENCE_ITEMS) { add('EVIDENCE_ITEM_LIMIT'); this.truncated = true; return false }
      counts.evidenceItems += 1; return true
    },
    file(bytes) {
      if (counts.fileReads >= MAX_FILE_READS) { add('FILE_READ_LIMIT'); this.truncated = true; return false }
      if (!Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_PACKAGE_BYTES) { add('FILE_SIZE_LIMIT'); this.truncated = true; return false }
      if (counts.evidenceChars + bytes > MAX_EVIDENCE_CHARS) { add('EVIDENCE_CHAR_LIMIT'); this.truncated = true; return false }
      counts.fileReads += 1; counts.evidenceChars += bytes; return true
    },
    chars(bytes) {
      if (!Number.isSafeInteger(bytes) || bytes < 0 || counts.evidenceChars + bytes > MAX_EVIDENCE_CHARS) { add('EVIDENCE_CHAR_LIMIT'); this.truncated = true; return false }
      counts.evidenceChars += bytes; return true
    },
    directory(entries) {
      const remaining = MAX_DIR_ENTRIES - counts.directoryEntries
      if (remaining <= 0) { add('DIRECTORY_ENTRY_LIMIT'); this.truncated = true; return 0 }
      const retained = Math.min(Math.max(entries, 0), remaining)
      counts.directoryEntries += retained
      if (retained < entries) { add('DIRECTORY_ENTRY_LIMIT'); this.truncated = true }
      return retained
    },
  }
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
  private lifecycle: Promise<void> = Promise.resolve()
  private readonly records = new Map<ExecutionId, Entry>()
  private recordsBySession = new WeakMap<Session, Set<ExecutionId>>()
  private readonly jobsBySession = new WeakMap<Session, Set<ExecutionId>>()
  private readonly disposedSessions = new WeakSet<Session>()
  private readonly cancelled = new Set<ExecutionId>()
  private fs: FileSystem | undefined
  private fsGeneration = 0
  private shell: ShellCapability | undefined
  private shellGeneration = 0
  private active = true

  constructor(options: EvidenceCollectorOptions = {}) {
    this.clock = options.clock ?? (() => Date.now())
    this.maxRecords = Math.min(options.maxRecords ?? MAX_RECORDS, MAX_RECORDS)
    this.ttlMs = Math.min(options.ttlMs ?? TTL_MS, TTL_MS)
    this.seeds = options.seeds ?? new EvidenceTargetSeedRegistry(this.clock)
    this.diagnostics = Object.freeze({ get: (id: string) => this.get(id), snapshot: () => { this.sweep(); return Object.freeze([...this.records.values()].map(item => item.snapshot)) } })
  }

  attachFs(fs: FileSystem): void {
    if (!this.active) return
    this.fs = fs; this.fsGeneration += 1; this.rotateScheduler()
  }

  async detachFs(): Promise<void> {
    this.fs = undefined; this.fsGeneration += 1; await this.rotateScheduler()
  }

  attachShell(shell: ShellCapability): void {
    if (!this.active) return
    this.shell = shell; this.shellGeneration += 1; this.rotateScheduler()
  }

  async detachShell(): Promise<void> {
    this.shell = undefined; this.shellGeneration += 1; await this.rotateScheduler()
  }

  hasSeed(executionId: ExecutionId): boolean { return this.seeds.has(executionId) }
  canCollect(executionId: ExecutionId): boolean { return this.active && this.fs !== undefined && this.seeds.hasSupportedEvidenceQuestion(executionId) }

  cancel(executionId: ExecutionId): void {
    this.cancelled.add(executionId)
    this.scheduler.cancel(executionId)
  }

  collect(executionId: ExecutionId, onComplete?: (snapshot: EvidenceSnapshotV1) => void): void {
    if (!this.active || this.cancelled.has(executionId)) return
    const seed = this.seeds.takeById(executionId)
    if (seed === undefined || this.disposedSessions.has(seed.session)) return
    const fs = this.fs
    const fsGeneration = this.fsGeneration
    const shell = this.shell
    const shellGeneration = this.shellGeneration
    const scheduler = this.scheduler
    const sessionJobs = this.jobsBySession.get(seed.session) ?? new Set<ExecutionId>()
    sessionJobs.add(executionId); this.jobsBySession.set(seed.session, sessionJobs)
    const start = this.lifecycle.then(async () => {
      if (!this.active || this.disposedSessions.has(seed.session) || scheduler !== this.scheduler || fsGeneration !== this.fsGeneration || fs !== this.fs) return undefined
      return scheduler.enqueue(executionId, signal => this.run(seed, fs, fsGeneration, shell, shellGeneration, signal))
    })
    void start.then(outcome => {
      sessionJobs.delete(executionId)
      if (outcome === undefined || !this.active || this.disposedSessions.has(seed.session)) return
      let snapshot: EvidenceSnapshotV1
      if (outcome.ok) snapshot = outcome.value
      else snapshot = result(executionId, outcome.reason === 'CANCELLED' ? 'CANCELLED' : outcome.reason === 'TIMEOUT' ? 'PARTIAL' : 'UNAVAILABLE', this.clock(), UNKNOWN_EVIDENCE_FACTS, emptyCounts(), [outcome.reason === 'TIMEOUT' ? 'EVIDENCE_TIMEOUT' : outcome.reason === 'CANCELLED' ? 'EVIDENCE_CANCELLED' : 'FS_CAPABILITY_UNAVAILABLE'])
      this.put(snapshot, seed.session)
      try { onComplete?.(snapshot) } catch { /* advisory publication never vetoes native execution */ }
    })
  }

  cancelSession(session: Session): void { this.disposeSession(session) }

  disposeSession(session: Session): void {
    this.disposedSessions.add(session)
    for (const id of this.jobsBySession.get(session) ?? []) this.cancel(id)
    this.jobsBySession.delete(session)
    this.seeds.disposeSession(session)
    for (const id of [...this.recordsBySession.get(session) ?? []]) this.removeRecord(id)
    this.recordsBySession.delete(session)
  }

  async dispose(): Promise<void> {
    if (!this.active) return
    this.active = false
    this.seeds.dispose()
    const scheduler = this.scheduler
    this.scheduler = new EvidenceScheduler(2, 8, 5000)
    this.lifecycle = this.lifecycle.then(() => scheduler.dispose())
    await this.lifecycle
    this.records.clear(); this.recordsBySession = new WeakMap(); this.fs = undefined; this.shell = undefined
  }

  private rotateScheduler(): Promise<void> {
    const previous = this.scheduler
    this.scheduler = new EvidenceScheduler(2, 8, 5000)
    this.lifecycle = this.lifecycle.then(() => previous.dispose())
    return this.lifecycle
  }

  private get(id: string): EvidenceSnapshotV1 | undefined { this.sweep(); return this.records.get(id)?.snapshot }

  private put(snapshot: EvidenceSnapshotV1, session: Session): void {
    this.sweep()
    const sessionRecords = this.recordsBySession.get(session) ?? new Set<ExecutionId>()
    while (sessionRecords.size >= PER_SESSION_RECORDS) this.removeRecord(sessionRecords.values().next().value as ExecutionId)
    while (this.records.size >= this.maxRecords) this.removeRecord(this.records.keys().next().value as ExecutionId)
    this.records.set(snapshot.executionId, { snapshot, session, createdAt: this.clock() })
    sessionRecords.add(snapshot.executionId); this.recordsBySession.set(session, sessionRecords)
  }

  private removeRecord(id: ExecutionId): void {
    const entry = this.records.get(id)
    if (entry === undefined) return
    this.records.delete(id); this.recordsBySession.get(entry.session)?.delete(id)
  }

  private sweep(): void {
    const now = this.clock()
    for (const [id, item] of this.records) if (!Number.isFinite(now) || now - item.createdAt >= this.ttlMs) this.removeRecord(id)
  }

  private async run(seed: EvidenceTargetSeed, fs: FileSystem | undefined, fsGeneration: number, shell: ShellCapability | undefined, shellGeneration: number, signal: AbortSignal): Promise<EvidenceSnapshotV1> {
    const now = this.clock()
    if (fs === undefined) return result(seed.executionId, 'UNAVAILABLE', now, UNKNOWN_EVIDENCE_FACTS, emptyCounts(), ['FS_CAPABILITY_UNAVAILABLE'])
    if (seed.explicitWorkdir && (seed.toolName === 'bash' || seed.toolName === 'pwsh')) return result(seed.executionId, 'PARTIAL', now, { ...UNKNOWN_EVIDENCE_FACTS, targetCountKnown: seed.exactTargetCount, checkpointAvailable: 'unknown' }, emptyCounts(), ['EXPLICIT_WORKDIR_UNRESOLVED', 'CHECKPOINT_CAPABILITY_UNAVAILABLE'])
    const counts = emptyCounts(); const reasons: EvidenceReasonCode[] = ['CHECKPOINT_CAPABILITY_UNAVAILABLE']; const limits = budget(counts, reasons); const facts = { ...UNKNOWN_EVIDENCE_FACTS }
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
        if (!limits.item()) break
        try {
          const li = await fs.lstat(raw, { cwd }, signal)
          const target = await fs.resolve(raw, { cwd, signal })
          const stat = await fs.stat(target, signal)
          if (li === undefined || stat === undefined) { contained = 'unknown'; alias = 'unknown'; reasons.push('TARGET_MISSING'); continue }
          if (li.type === 'symlink') alias = true
          if (!fs.contains(workspace, target)) { contained = false; if (!reasons.includes('OUTSIDE_WORKSPACE')) reasons.push('OUTSIDE_WORKSPACE') }
          targetResults.push({ target, stat, lstat: li })
        } catch { contained = 'unknown'; if (!reasons.includes('TARGET_STAT_FAILED')) reasons.push('TARGET_STAT_FAILED') }
      }
      const targetKnown = seed.exactTargetCount && seed.requestedPaths.length <= 8 && targetResults.length === seed.requestedPaths.length && !reasons.includes('EVIDENCE_ITEM_LIMIT')
      const canonicalKnown: boolean | 'unknown' = targetKnown && targetResults.length > 0 ? true : 'unknown'
      if (!targetKnown && seed.requestedPaths.length > 0 && !reasons.includes('TARGET_RESOLUTION_FAILED')) reasons.push('TARGET_RESOLUTION_FAILED')
      Object.assign(facts, { targetCountKnown: targetKnown, canonicalTargetsKnown: canonicalKnown, workspaceContained: contained, pathAliasObserved: alias })
      for (const item of targetResults) if (item.stat.type === 'directory' && contained === true) {
        try { limits.directory((await fs.listDir(item.target, signal)).length) }
        catch { if (!reasons.includes('TARGET_STAT_FAILED')) reasons.push('TARGET_STAT_FAILED') }
      }
      if (seed.packageRelevant && contained !== false) await this.collectPackage(fs, cwd, signal, facts, limits)
      if ((seed.operationClass === 'direct-file' || seed.operationClass === 'simple-shell-file') && shell !== undefined && targetResults.length > 0 && contained === true) {
        const git = await this.collectGit(shell, fs, workspace, targetResults.map(item => item.target), seed.session, signal)
        if (shellGeneration !== this.shellGeneration || shell !== this.shell) return result(seed.executionId, 'CANCELLED', now, facts, counts, ['SHELL_GENERATION_STALE'])
        if (git === undefined) reasons.push('GIT_CHECKER_UNKNOWN')
        else Object.assign(facts, { versionControlled: git.repositoryAvailable ? git.tracked : false, exactTargetsClean: git.repositoryAvailable ? git.clean : 'unknown', rollbackMechanismKnown: git.repositoryAvailable && git.tracked && git.clean && targetResults.length === 1 && (seed.toolName === 'write' || seed.toolName === 'edit') })
      }
      if (seed.operationClass === 'direct-file' && (seed.toolName === 'write' || seed.toolName === 'edit') && shell === undefined) reasons.push('SHELL_CAPABILITY_UNAVAILABLE')
      const fatal = ['TARGET_RESOLUTION_FAILED', 'TARGET_STAT_FAILED', 'OUTSIDE_WORKSPACE', 'TARGET_MISSING', 'EVIDENCE_ITEM_LIMIT', 'FILE_READ_LIMIT', 'FILE_SIZE_LIMIT', 'EVIDENCE_CHAR_LIMIT', 'DIRECTORY_ENTRY_LIMIT', 'PACKAGE_MANIFEST_TOO_LARGE'] as const
      const evidenceComplete = seed.packageRelevant ? facts.packageManifestPresent !== 'unknown' : targetKnown
      const complete = evidenceComplete && (seed.packageRelevant || contained !== 'unknown') && !reasons.some(code => fatal.includes(code as typeof fatal[number]))
      return result(seed.executionId, complete ? 'COMPLETE' : 'PARTIAL', now, facts, counts, reasons, limits.truncated || reasons.length > 1)
    } catch { return result(seed.executionId, 'PARTIAL', now, facts, counts, ['TARGET_RESOLUTION_FAILED', ...reasons], true) }
  }

  private async collectPackage(fs: FileSystem, cwd: string, signal: AbortSignal, facts: Record<string, unknown>, limits: Budget): Promise<void> {
    try {
      const pathInfo = await fs.lstat('package.json', { cwd }, signal)
      if (pathInfo === undefined) { facts.packageManifestPresent = false; facts.packageManifestValid = false; return }
      if (pathInfo.type !== 'file') { facts.packageManifestPresent = true; facts.packageManifestValid = false; return }
      const target = await fs.resolve('package.json', { cwd, signal })
      const info = await fs.stat(target, signal)
      if (info === undefined || info.type !== 'file') { facts.packageManifestPresent = true; facts.packageManifestValid = false; return }
      if ((info.size ?? 0) > MAX_PACKAGE_BYTES) { facts.packageManifestPresent = true; facts.packageManifestValid = false; limits.file((info.size ?? MAX_PACKAGE_BYTES) + 1); if (!limits.reasons.includes('PACKAGE_MANIFEST_TOO_LARGE')) limits.reasons.push('PACKAGE_MANIFEST_TOO_LARGE'); return }
      if (!limits.item()) return
      if (!limits.file(info.size ?? 0)) return
      const bytes = await fs.readBytes(target, signal, MAX_PACKAGE_BYTES)
      facts.packageManifestPresent = true
      if (bytes.byteLength > MAX_PACKAGE_BYTES) { limits.reasons.push('PACKAGE_MANIFEST_TOO_LARGE'); limits.truncated = true; return }
      const parsed = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>
      facts.packageManifestValid = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      const scripts = parsed?.scripts
      facts.lifecycleScriptsPresent = scripts !== null && typeof scripts === 'object' && scripts !== undefined && Object.keys(scripts as object).some(key => ['preinstall', 'install', 'postinstall', 'prepare'].includes(key))
    } catch { limits.reasons.push('PACKAGE_MANIFEST_INVALID') }
  }

  private async collectGit(shell: ShellCapability, fs: FileSystem, workspace: FsTarget, targets: readonly FsTarget[], session: Session, signal: AbortSignal): Promise<{ repositoryAvailable: boolean; tracked: boolean; ignored: boolean; clean: boolean } | undefined> {
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
