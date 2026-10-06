import { createHash } from 'node:crypto'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import { isValidBranchName, type ExpectedEffect, type ExpectedEffectRegistry } from './expected-effect.ts'
import { VerificationScheduler, type VerificationJob } from './verification-scheduler.ts'
import {
  VerificationStore,
  type SemanticSuccess,
  type VerificationReasonCode,
  type VerificationRecordV1,
  type VerificationStatus,
} from './verification-store.ts'

type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access'

interface ShellRunOutput { readonly text: string; readonly truncated: boolean }
interface ShellRunResult {
  readonly exitCode: number | null
  readonly timedOut?: boolean
  readonly aborted?: boolean
  readonly stdout: ShellRunOutput
  readonly stderr: ShellRunOutput
  readonly sandbox?: { readonly mode?: SandboxMode }
}
interface ShellExecSpec { readonly [key: string]: unknown }
interface ShellCapability {
  readonly sandboxMode?: SandboxMode
  readonly resolve: (request: Record<string, unknown>) => ShellExecSpec
  readonly run: (spec: ShellExecSpec) => Promise<ShellRunResult>
}
interface SandboxPolicyCapability {
  readonly resolve: (request: { readonly session: Session; readonly mode: SandboxMode }) => { readonly mode: SandboxMode; readonly workspaceRoot: string }
}

const MAX_OUTPUT_BYTES = 4096
const HARDENED_ENV: Readonly<Record<string, string>> = Object.freeze({
  BASH_ENV: '',
  ENV: '',
  NODE_OPTIONS: '',
  NODE_PATH: '',
  GIT_TERMINAL_PROMPT: '0',
  GIT_OPTIONAL_LOCKS: '0',
  NO_COLOR: '1',
  CI: '1',
  GIT_PAGER: 'cat',
  PAGER: 'cat',
})

// Product-owned literal checkers. Operation values are passed only as data in env.
const MKDIR_CHECKER = "const fs=require('node:fs');try{const p=process.env.RA_TARGET;if(!p)process.stdout.write('UNKNOWN');else{const s=fs.lstatSync(p);process.stdout.write(s.isSymbolicLink()?'UNKNOWN':s.isDirectory()?'MATCHED':'MISMATCHED')}}catch(e){process.stdout.write(e&&e.code==='ENOENT'?'MISMATCHED':'UNKNOWN')}"
const COPY_CHECKER = "const fs=require('node:fs');const out=v=>process.stdout.write(v);const same=(a,b)=>a.size===b.size&&a.mtimeMs===b.mtimeMs&&a.dev===b.dev&&a.ino===b.ino;let s,d,source,afterSource,afterDest;try{s=fs.lstatSync(process.env.RA_SOURCE);if(s.isSymbolicLink()||!s.isFile()||s.size>1048576){out('UNKNOWN');process.exit(0)}source=fs.readFileSync(process.env.RA_SOURCE);afterSource=fs.lstatSync(process.env.RA_SOURCE);if(!same(s,afterSource)){out('UNKNOWN');process.exit(0)}}catch(e){out('UNKNOWN');process.exit(0)}try{d=fs.lstatSync(process.env.RA_DEST)}catch(e){out(e&&e.code==='ENOENT'?'MISMATCHED':'UNKNOWN');process.exit(0)}if(d.isSymbolicLink()||!d.isFile()||d.size>1048576){out('UNKNOWN');process.exit(0)}try{const destination=fs.readFileSync(process.env.RA_DEST);afterDest=fs.lstatSync(process.env.RA_DEST);if(!same(d,afterDest)){out('UNKNOWN');process.exit(0)}out(source.equals(destination)?'MATCHED':'MISMATCHED')}catch(e){out('UNKNOWN')}"
const PACKAGE_CHECKER = "const m=process.env.RA_PACKAGE;try{if(!m)process.stdout.write('UNKNOWN');else{require.resolve(m,{paths:[process.cwd()]});process.stdout.write('MATCHED')}}catch(e){process.stdout.write('UNKNOWN')}"
const GIT_CHECKER = 'git -c core.fsmonitor=false symbolic-ref --quiet --short HEAD'

function now(): number { return Date.now() }

function boundedDuration(start: number): number { return Math.max(0, now() - start) }

function ownString(value: unknown, key: string, max = 8192): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !('value' in descriptor)) return undefined
    const result = descriptor.value
    return typeof result === 'string' && result.length <= max ? result : undefined
  } catch { return undefined }
}

function ownNullableString(value: unknown, key: string): string | null | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, key)
    if (descriptor === undefined || !('value' in descriptor)) return undefined
    return descriptor.value === null ? null : typeof descriptor.value === 'string' && descriptor.value.length <= 8192 ? descriptor.value : undefined
  } catch { return undefined }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch { return false }
}

function normalizeText(value: string): string { return value.replace(/\r\n?/g, '\n') }

function record(
  effect: ExpectedEffect,
  status: VerificationStatus,
  semanticSuccess: SemanticSuccess,
  evidenceQuality: VerificationRecordV1['evidenceQuality'],
  reasonCodes: readonly VerificationReasonCode[],
  start: number,
): VerificationRecordV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    executionId: effect.executionId,
    adapterId: effect.adapterId,
    source: effect.source,
    status,
    semanticSuccess,
    evidenceQuality,
    reasonCodes: Object.freeze([...reasonCodes]),
    observedAt: now(),
    durationMs: boundedDuration(start),
  })
}

function directWrite(effect: Extract<ExpectedEffect, { adapterId: 'tool.write.v1' }>, result: Readonly<ToolExecutionResult>, start: number): VerificationRecordV1 {
  if (result.isError) return record(effect, 'UNKNOWN', 'unknown', 'low', ['PROCESS_NOT_SUCCESSFUL'], start)
  const value = result.value
  if (!isPlainRecord(value)) return record(effect, 'UNKNOWN', 'unknown', 'low', ['RESULT_SHAPE_UNSUPPORTED'], start)
  const after = ownString(value, 'after')
  const before = ownNullableString(value, 'before')
  const path = ownString(value, 'path')
  const operation = ownString(value, 'operation')
  if (after === undefined || before === undefined || path === undefined || (operation !== 'create' && operation !== 'update')) return record(effect, 'UNKNOWN', 'unknown', 'low', ['RESULT_SHAPE_UNSUPPORTED'], start)
  // The canonical write result is the Tool Contract witness; no filesystem post-read is performed.
  let matched = false
  try {
    matched = createHash('sha256').update(after, 'utf8').digest('hex') === effect.contentDigest
  } catch { return record(effect, 'UNKNOWN', 'unknown', 'low', ['RESULT_SHAPE_UNSUPPORTED'], start) }
  return matched
    ? record(effect, 'MATCHED', true, 'high', ['POSTCONDITION_MATCHED'], start)
    : record(effect, 'MISMATCHED', false, 'high', ['POSTCONDITION_MISMATCH'], start)
}

function directEdit(effect: Extract<ExpectedEffect, { adapterId: 'tool.edit.v1' }>, result: Readonly<ToolExecutionResult>, start: number): VerificationRecordV1 {
  if (result.isError) return record(effect, 'UNKNOWN', 'unknown', 'low', ['PROCESS_NOT_SUCCESSFUL'], start)
  const value = result.value
  if (!isPlainRecord(value)) return record(effect, 'UNKNOWN', 'unknown', 'low', ['RESULT_SHAPE_UNSUPPORTED'], start)
  const before = ownString(value, 'before')
  const after = ownString(value, 'after')
  const path = ownString(value, 'path')
  if (before === undefined || after === undefined || path === undefined) return record(effect, 'UNKNOWN', 'unknown', 'low', ['RESULT_SHAPE_UNSUPPORTED'], start)
  const normalizedBefore = normalizeText(before)
  const oldString = normalizeText(effect.oldString)
  const newString = normalizeText(effect.newString)
  const first = normalizedBefore.indexOf(oldString)
  if (first < 0 || (!effect.replaceAll && normalizedBefore.indexOf(oldString, first + oldString.length) >= 0)) return record(effect, 'UNKNOWN', 'unknown', 'low', ['RESULT_SHAPE_UNSUPPORTED'], start)
  const expected = effect.replaceAll
    ? normalizedBefore.split(oldString).join(newString)
    : `${normalizedBefore.slice(0, first)}${newString}${normalizedBefore.slice(first + oldString.length)}`
  const matched = normalizeText(after) === expected
  return matched
    ? record(effect, 'MATCHED', true, 'high', ['POSTCONDITION_MATCHED'], start)
    : record(effect, 'MISMATCHED', false, 'high', ['POSTCONDITION_MISMATCH'], start)
}

function shellValue(value: unknown): { readonly processSuccess: true | false | 'unknown'; readonly sandboxMode?: SandboxMode } | undefined {
  if (!isPlainRecord(value)) return undefined
  if (ownString(value, 'kind') !== 'foreground') return undefined
  let exitCode: unknown
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, 'exitCode')
    if (descriptor === undefined || !('value' in descriptor)) return undefined
    exitCode = descriptor.value
  } catch { return undefined }
  const processSuccess: true | false | 'unknown' = exitCode === null
    ? 'unknown'
    : typeof exitCode === 'number' && Number.isSafeInteger(exitCode)
      ? exitCode === 0
      : 'unknown'
  const sandbox = value.sandbox
  if (sandbox !== undefined && !isPlainRecord(sandbox)) return undefined
  if (sandbox !== undefined) {
    try {
      const denied = Object.getOwnPropertyDescriptor(sandbox, 'denied')
      if (denied === undefined || !('value' in denied) || typeof denied.value !== 'boolean') return undefined
    } catch { return undefined }
  }
  const mode = sandbox === undefined ? undefined : ownString(sandbox, 'mode')
  if (mode !== undefined && mode !== 'read-only' && mode !== 'workspace-write' && mode !== 'danger-full-access') return undefined
  return { processSuccess, ...mode === undefined ? {} : { sandboxMode: mode } }
}

function sessionCwd(session: Session): string | undefined {
  try {
    const cwd = session.header.cwd
    return typeof cwd === 'string' && cwd.length > 0 && cwd.length <= 8192 ? cwd : undefined
  } catch { return undefined }
}

function verifierEnvironment(effect: ExpectedEffect): Record<string, string> {
  const environment = { ...HARDENED_ENV }
  switch (effect.adapterId) {
    case 'shell.mkdir.v1': environment.RA_TARGET = effect.target; break
    case 'shell.copy-file.v1': environment.RA_SOURCE = effect.sourcePath; environment.RA_DEST = effect.destinationPath; break
    case 'git.branch-switch.v1': environment.RA_EXPECTED_BRANCH = effect.expectedBranch; break
    case 'package.node-resolve.v1': environment.RA_PACKAGE = effect.packageName; break
  }
  return environment
}

function verifierCommand(effect: ExpectedEffect): string {
  switch (effect.adapterId) {
    case 'shell.mkdir.v1': return `node -e ${JSON.stringify(MKDIR_CHECKER)}`
    case 'shell.copy-file.v1': return `node -e ${JSON.stringify(COPY_CHECKER)}`
    case 'git.branch-switch.v1': return GIT_CHECKER
    case 'package.node-resolve.v1': return `node -e ${JSON.stringify(PACKAGE_CHECKER)}`
    default: return ''
  }
}

function exactGitStdout(value: string): string | undefined {
  if (value.endsWith('\r\n')) return value.slice(0, -2)
  if (value.endsWith('\n')) return value.slice(0, -1)
  return value
}

function shellResultRecord(effect: ExpectedEffect, result: ShellRunResult, start: number, expected?: string): VerificationRecordV1 {
  if (result.timedOut) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_TIMEOUT'], start)
  if (result.aborted) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_ABORTED'], start)
  if (result.stdout.truncated || result.stdout.text.length > MAX_OUTPUT_BYTES) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_OUTPUT_TRUNCATED'], start)
  if (expected !== undefined) {
    const output = exactGitStdout(result.stdout.text)
    if (result.exitCode !== 0 || output === undefined || output.length === 0 || output.length > 256) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_RESULT_UNSUPPORTED'], start)
    if (!isValidBranchName(output)) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_RESULT_UNSUPPORTED'], start)
    return output === expected
      ? record(effect, 'MATCHED', true, 'medium', ['POSTCONDITION_MATCHED'], start)
      : record(effect, 'MISMATCHED', false, 'medium', ['POSTCONDITION_MISMATCH'], start)
  }
  const output = result.stdout.text.trim()
  if (result.exitCode !== 0 || (output !== 'MATCHED' && output !== 'MISMATCHED')) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_RESULT_UNSUPPORTED'], start)
  return output === 'MATCHED'
    ? record(effect, 'MATCHED', true, 'medium', ['POSTCONDITION_MATCHED'], start)
    : record(effect, 'MISMATCHED', false, 'medium', ['POSTCONDITION_MISMATCH'], start)
}

export interface PostconditionVerifierOptions {
  readonly onRecord?: (record: VerificationRecordV1) => void
  readonly clock?: () => number
}

/** Host-only verifier orchestration; no Browser or Native Approval authority. */
export class PostconditionVerifier {
  readonly store: VerificationStore
  readonly scheduler: VerificationScheduler
  private readonly registry: ExpectedEffectRegistry
  private readonly onRecord: ((record: VerificationRecordV1) => void) | undefined
  private readonly clock: () => number
  private shell: ShellCapability | undefined
  private sandboxPolicy: SandboxPolicyCapability | undefined
  private generation = 1
  private active = true

  constructor(registry: ExpectedEffectRegistry, options: PostconditionVerifierOptions = {}) {
    this.registry = registry
    this.store = options.clock === undefined ? new VerificationStore() : new VerificationStore({ clock: options.clock })
    this.scheduler = options.clock === undefined ? new VerificationScheduler() : new VerificationScheduler({ clock: options.clock })
    this.onRecord = options.onRecord
    this.clock = options.clock ?? (() => Date.now())
  }

  attach(shell: unknown, sandboxPolicy?: unknown): void {
    if (!this.active) return
    this.shell = shell as ShellCapability
    this.sandboxPolicy = sandboxPolicy as SandboxPolicyCapability | undefined
    this.generation = this.scheduler.currentGeneration
  }

  /** Replace a capability generation only after the previous generation drains. */
  async attachGeneration(shell: unknown, sandboxPolicy?: unknown): Promise<void> {
    if (!this.active) return
    if (this.shell === shell && this.sandboxPolicy === sandboxPolicy) return
    await this.scheduler.fenceAndDrain()
    if (!this.active) return
    this.shell = shell as ShellCapability
    this.sandboxPolicy = sandboxPolicy as SandboxPolicyCapability | undefined
    this.generation = this.scheduler.currentGeneration
  }

  /** Fence and drain current checks without retiring the shell/policy capability. */
  async fenceAndDrain(): Promise<void> {
    if (!this.active) return
    await this.scheduler.fenceAndDrain()
    if (this.active) this.generation = this.scheduler.currentGeneration
  }

  async detach(): Promise<void> {
    if (!this.active) return
    this.shell = undefined
    this.sandboxPolicy = undefined
    await this.fenceAndDrain()
  }

  observeResult(exec: Readonly<ToolExecution>, result: Readonly<ToolExecutionResult>): void {
    if (!this.active) return
    const effect = this.registry.take(exec)
    if (effect === undefined) return
    const start = this.clock()
    if (effect.adapterId === 'tool.write.v1') return this.publish(directWrite(effect, result, start), effect.session)
    if (effect.adapterId === 'tool.edit.v1') return this.publish(directEdit(effect, result, start), effect.session)
    if (result.isError) return this.publish(record(effect, 'UNKNOWN', 'unknown', 'low', ['PROCESS_NOT_SUCCESSFUL'], start), effect.session)
    const original = shellValue(result.value)
    if (original === undefined || original.processSuccess !== true) return this.publish(record(effect, 'UNKNOWN', 'unknown', 'low', ['PROCESS_NOT_SUCCESSFUL'], start), effect.session)
    if (this.shell === undefined) return this.publish(record(effect, 'UNAVAILABLE', 'unknown', 'low', ['VERIFIER_CAPABILITY_UNAVAILABLE'], start), effect.session)
    const job: VerificationJob = {
      executionId: effect.executionId,
      session: effect.session,
      generation: this.generation,
      run: signal => this.runShell(effect, original.sandboxMode, signal),
      unknown: reason => record(effect, 'UNKNOWN', 'unknown', 'low', [reason], this.clock()),
      complete: resultRecord => this.publish(resultRecord, effect.session),
    }
    this.scheduler.enqueue(job)
  }

  cancelSession(session: Session): void {
    this.registry.disposeSession(session)
    this.scheduler.cancelSession(session)
  }

  async dispose(): Promise<void> {
    if (!this.active) return
    await this.detach()
    this.active = false
    await this.scheduler.dispose()
    this.store.dispose()
    this.registry.dispose()
  }

  private publish(result: VerificationRecordV1, session: Session): void {
    const stored = this.store.put(result, session)
    try { this.onRecord?.(stored) } catch { /* verification is observational */ }
  }

  private async runShell(effect: ExpectedEffect, originalMode: SandboxMode | undefined, signal: AbortSignal): Promise<VerificationRecordV1> {
    const start = this.clock()
    const shell = this.shell
    if (shell === undefined) return record(effect, 'UNAVAILABLE', 'unknown', 'low', ['VERIFIER_CAPABILITY_UNAVAILABLE'], start)
    let workdir: string | undefined
    let sandboxPolicy: unknown
    try {
      const currentMode = shell.sandboxMode
      if (originalMode === undefined) {
        if (currentMode !== undefined) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_EXECUTION_WORLD_CHANGED'], start)
        workdir = sessionCwd(effect.session)
      } else {
        if (currentMode !== originalMode) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_EXECUTION_WORLD_CHANGED'], start)
        if (this.sandboxPolicy === undefined) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_POLICY_UNAVAILABLE'], start)
        const resolved = this.sandboxPolicy.resolve({ session: effect.session, mode: originalMode })
        if (resolved.mode !== originalMode) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_EXECUTION_WORLD_CHANGED'], start)
        workdir = resolved.workspaceRoot
        sandboxPolicy = resolved
      }
    } catch { return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_POLICY_UNAVAILABLE'], start) }
    if (workdir === undefined) return record(effect, 'UNKNOWN', 'unknown', 'low', ['VERIFIER_POLICY_UNAVAILABLE'], start)
    const command = verifierCommand(effect)
    if (command.length === 0) return record(effect, 'UNKNOWN', 'unknown', 'low', ['UNSUPPORTED_OPERATION'], start)
    const spec = shell.resolve({
      command,
      workdir,
      timeoutMs: 5000,
      stdoutMaxBytes: MAX_OUTPUT_BYTES,
      signal,
      env: verifierEnvironment(effect),
      ...sandboxPolicy === undefined ? {} : { sandboxPolicy },
    })
    const result = await shell.run(spec)
    const expected = effect.adapterId === 'git.branch-switch.v1' ? effect.expectedBranch : undefined
    return shellResultRecord(effect, result, start, expected)
  }
}
