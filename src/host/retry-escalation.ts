import { createHash } from 'node:crypto'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution, ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import {
  projectShellResult,
  projectTerminalClaim,
  type ExplicitFailureFact,
  type ExplicitFailureKind,
} from './explicit-failure.ts'
import type { LedgerEvidenceRef } from './ledger.ts'
import type { ExecutionId } from './correlation.ts'

export type RelationSummaryStatus =
  | 'READY'
  | 'UNSUPPORTED'
  | 'DEGRADED'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'CAPACITY_EXCEEDED'

export type FailureChainFailureKind = ExplicitFailureKind | 'PROCESS_FAILURE'

export interface FailureChainEntry {
  readonly executionId: string
  readonly failureKind?: FailureChainFailureKind
  readonly errorCode?: string
}

export interface FailureChainSummary {
  readonly executionId: string
  readonly status: RelationSummaryStatus
  readonly retryOf?: string
  readonly retryCount: number
  readonly recentFailureCount: number
  readonly sameRootCause: boolean | 'unknown'
  readonly permissionEscalation: boolean | 'unknown'
  readonly truncated: boolean
  readonly reasonCodes: readonly string[]
  readonly recent: readonly FailureChainEntry[]
}

export interface FailureChainDiagnostics {
  readonly get: (executionId: ExecutionId) => FailureChainSummary
}

export interface RetryEscalationOptions {
  readonly clock?: () => number
  readonly ttlMs?: number
  readonly maxPerSession?: number
  readonly maxGlobal?: number
  readonly maxRecent?: number
}

type SandboxMode = 'read-only' | 'workspace-write' | 'danger-full-access'
type ExplicitSandboxTarget = Exclude<SandboxMode, 'read-only'>
type EvidenceState = 'PENDING' | 'SETTLED' | 'CONFLICTED' | 'UNSUPPORTED'
type RelationOutcomeStatus = 'SUCCESS' | 'FAILURE' | 'UNKNOWN'

interface FingerprintCapture {
  readonly fingerprint?: string
  readonly requestedPermission?: ExplicitSandboxTarget
  readonly reasonCodes: readonly string[]
}

interface FailureSignature {
  readonly kind: FailureChainFailureKind
  readonly errorCode?: string
  readonly key: string
}

interface RelationOutcome {
  readonly status: RelationOutcomeStatus
  readonly failureKind?: FailureChainFailureKind
  readonly errorCode?: string
  readonly signature?: FailureSignature
  readonly permissionMode?: SandboxMode
  readonly processSuccess?: true | false | 'unknown'
}

interface RelationRecord {
  readonly session: WeakRef<Session>
  readonly executionId: ExecutionId
  readonly ordinal: number
  readonly createdAt: number
  readonly fingerprint?: string
  readonly requestedPermission?: ExplicitSandboxTarget
  readonly nearestPriorOrdinal?: number
  readonly nearestPriorExpired: boolean
  readonly reasonCodes: string[]
  evidenceState: EvidenceState
  outcome: RelationOutcome | undefined
  settledBeforeCaptureOrdinal?: number
}

interface SessionState {
  readonly records: RelationRecord[]
  truncated: boolean
}

interface RetiredStatus {
  readonly status: RelationSummaryStatus
  readonly reasonCodes: readonly string[]
}

const TTL_MS = 5 * 60 * 1000
const MAX_PER_SESSION = 128
const MAX_GLOBAL = 512
const MAX_RECENT = 8
const MAX_KEYS = 16
const MAX_STRING_LENGTH = 8 * 1024
const MAX_SERIALIZED_LENGTH = 16 * 1024
const MAX_NUMBER = 1_000_000
const MAX_TIMEOUT = 10 * 60 * 1000
const MAX_CODE_LENGTH = 128

const SANDBOX_MODES: readonly SandboxMode[] = ['read-only', 'workspace-write', 'danger-full-access']
const EXPLICIT_SANDBOX_TARGETS: readonly ExplicitSandboxTarget[] = ['workspace-write', 'danger-full-access']

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values])
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value
  Object.freeze(value)
  if (Array.isArray(value)) {
    for (const child of value) deepFreeze(child)
  } else {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  }
  return value
}

function safeBoundedString(value: unknown, nonEmpty = false): string | undefined {
  return typeof value === 'string'
    && value.length <= MAX_STRING_LENGTH
    && (!nonEmpty || value.length > 0)
    ? value
    : undefined
}

function safeCode(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0 || value.length > MAX_CODE_LENGTH) return undefined
  return /^[A-Za-z0-9_.:-]+$/.test(value) ? value : undefined
}

function isSandboxMode(value: unknown): value is SandboxMode {
  return typeof value === 'string' && SANDBOX_MODES.includes(value as SandboxMode)
}

function isExplicitSandboxTarget(value: unknown): value is ExplicitSandboxTarget {
  return typeof value === 'string' && EXPLICIT_SANDBOX_TARGETS.includes(value as ExplicitSandboxTarget)
}

function ownDataFields(value: unknown, allowed: readonly string[]): Map<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  try {
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) return undefined
    const keys = Reflect.ownKeys(value)
    if (keys.length > MAX_KEYS || keys.some(key => typeof key !== 'string' || !allowed.includes(key))) return undefined
    const fields = new Map<string, unknown>()
    for (const key of keys) {
      if (typeof key !== 'string') return undefined
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor === undefined || !('value' in descriptor)) return undefined
      fields.set(key, descriptor.value)
    }
    return fields
  } catch {
    return undefined
  }
}

function optionalBoundedString(fields: Map<string, unknown>, key: string): string | undefined | false {
  if (!fields.has(key)) return undefined
  const value = safeBoundedString(fields.get(key))
  return value === undefined ? false : value
}

function optionalBoundedNumber(fields: Map<string, unknown>, key: string, maximum: number): number | undefined | false {
  if (!fields.has(key)) return undefined
  const value = fields.get(key)
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= maximum ? value : false
}

function presence(value: unknown, present: boolean): readonly [number, unknown?] {
  return present ? [1, value] : [0]
}

function hashTuple(tuple: readonly unknown[]): string | undefined {
  try {
    const serialized = JSON.stringify(tuple)
    if (serialized.length > MAX_SERIALIZED_LENGTH) return undefined
    return createHash('sha256').update(serialized).digest('hex')
  } catch {
    return undefined
  }
}

function unsupported(reason: string): FingerprintCapture {
  return { reasonCodes: Object.freeze([reason]) }
}

function captureFingerprint(toolName: string, args: unknown): FingerprintCapture {
  if (toolName === 'read') {
    const fields = ownDataFields(args, ['file_path', 'offset', 'limit'])
    if (fields === undefined) return unsupported('FINGERPRINT_ARGUMENT_SHAPE_UNSUPPORTED')
    const filePath = safeBoundedString(fields.get('file_path'), true)
    if (filePath === undefined) return unsupported('FINGERPRINT_FILE_PATH_UNSUPPORTED')
    const offset = optionalBoundedNumber(fields, 'offset', MAX_NUMBER)
    const limit = optionalBoundedNumber(fields, 'limit', MAX_NUMBER)
    if (offset === false) return unsupported('FINGERPRINT_OFFSET_UNSUPPORTED')
    if (limit === false) return unsupported('FINGERPRINT_LIMIT_UNSUPPORTED')
    const fingerprint = hashTuple([
      'v1', 'read', filePath,
      presence(offset, fields.has('offset')),
      presence(limit, fields.has('limit')),
    ])
    return fingerprint === undefined ? unsupported('FINGERPRINT_HASH_UNAVAILABLE') : { fingerprint, reasonCodes: Object.freeze([]) }
  }

  if (toolName === 'write') {
    const fields = ownDataFields(args, ['file_path', 'content', 'sandbox_permissions', 'justification'])
    if (fields === undefined) return unsupported('FINGERPRINT_ARGUMENT_SHAPE_UNSUPPORTED')
    const filePath = safeBoundedString(fields.get('file_path'), true)
    const content = safeBoundedString(fields.get('content'))
    if (filePath === undefined) return unsupported('FINGERPRINT_FILE_PATH_UNSUPPORTED')
    if (content === undefined) return unsupported('FINGERPRINT_CONTENT_UNSUPPORTED')
    let requestedPermission: ExplicitSandboxTarget | undefined
    if (fields.has('sandbox_permissions')) {
      if (!isExplicitSandboxTarget(fields.get('sandbox_permissions'))) return unsupported('FINGERPRINT_PERMISSION_UNSUPPORTED')
      requestedPermission = fields.get('sandbox_permissions') as ExplicitSandboxTarget
    }
    if (fields.has('justification') && safeBoundedString(fields.get('justification')) === undefined) {
      return unsupported('FINGERPRINT_JUSTIFICATION_UNSUPPORTED')
    }
    const fingerprint = hashTuple(['v1', 'write', filePath, content])
    if (fingerprint === undefined) return unsupported('FINGERPRINT_HASH_UNAVAILABLE')
    return {
      fingerprint,
      ...requestedPermission === undefined ? {} : { requestedPermission },
      reasonCodes: Object.freeze([]),
    }
  }

  if (toolName === 'bash' || toolName === 'pwsh') {
    const fields = ownDataFields(args, [
      'command', 'description', 'timeoutMs', 'workdir', 'run_in_background', 'sandbox_permissions', 'justification',
    ])
    if (fields === undefined) return unsupported('FINGERPRINT_ARGUMENT_SHAPE_UNSUPPORTED')
    const command = safeBoundedString(fields.get('command'), true)
    if (command === undefined) return unsupported('FINGERPRINT_COMMAND_UNSUPPORTED')
    const description = optionalBoundedString(fields, 'description')
    const timeoutMs = optionalBoundedNumber(fields, 'timeoutMs', MAX_TIMEOUT)
    const workdir = optionalBoundedString(fields, 'workdir')
    if (description === false) return unsupported('FINGERPRINT_DESCRIPTION_UNSUPPORTED')
    if (timeoutMs === false) return unsupported('FINGERPRINT_TIMEOUT_UNSUPPORTED')
    if (workdir === false) return unsupported('FINGERPRINT_WORKDIR_UNSUPPORTED')
    if (fields.has('run_in_background') && typeof fields.get('run_in_background') !== 'boolean') {
      return unsupported('FINGERPRINT_BACKGROUND_UNSUPPORTED')
    }
    let requestedPermission: ExplicitSandboxTarget | undefined
    if (fields.has('sandbox_permissions')) {
      if (!isExplicitSandboxTarget(fields.get('sandbox_permissions'))) return unsupported('FINGERPRINT_PERMISSION_UNSUPPORTED')
      requestedPermission = fields.get('sandbox_permissions') as ExplicitSandboxTarget
    }
    if (fields.has('justification') && safeBoundedString(fields.get('justification')) === undefined) {
      return unsupported('FINGERPRINT_JUSTIFICATION_UNSUPPORTED')
    }
    const fingerprint = hashTuple([
      'v1', toolName, command,
      presence(workdir, fields.has('workdir')),
      presence(fields.get('run_in_background'), fields.has('run_in_background')),
    ])
    if (fingerprint === undefined) return unsupported('FINGERPRINT_HASH_UNAVAILABLE')
    return {
      fingerprint,
      ...requestedPermission === undefined ? {} : { requestedPermission },
      reasonCodes: Object.freeze([]),
    }
  }

  return unsupported('FINGERPRINT_TOOL_UNSUPPORTED')
}

function evidence(ordinal: number): readonly LedgerEvidenceRef[] {
  return Object.freeze([{ seq: ordinal, type: 'tools/result', provenance: 'LIVE_FINAL' }])
}

function errorIdentity(result: Readonly<ToolExecutionResult>): { readonly name: string; readonly code: string } | undefined {
  if (!result.isError) return undefined
  try {
    const info = result.error.info
    const name = safeBoundedString(info?.name, true)
    const code = safeCode(info?.code)
    return name !== undefined && code !== undefined ? { name, code } : undefined
  } catch {
    return undefined
  }
}

function signatureFor(fact: ExplicitFailureFact): FailureSignature | undefined {
  const errorCode = safeCode(fact.error?.code)
  if (fact.kind === 'UNKNOWN') return undefined
  if (fact.kind === 'TOOL_ERROR' && errorCode === undefined) return undefined
  return {
    kind: fact.kind,
    ...errorCode === undefined ? {} : { errorCode },
    key: `${fact.kind}:${errorCode ?? ''}`,
  }
}

function outcomeFor(exec: Readonly<ToolExecution>, result: Readonly<ToolExecutionResult>, ordinal: number): RelationOutcome {
  if (result.isError) {
    const identity = errorIdentity(result)
    const projected = projectTerminalClaim({
      isError: true,
      provenance: 'LIVE_FINAL',
      evidence: evidence(ordinal)[0]!,
      ...identity === undefined ? {} : { error: identity },
    })
    const failureFact = projected.outcome.failures[0]
    const signature = failureFact === undefined ? undefined : signatureFor(failureFact)
    const errorCode = safeCode(failureFact?.error?.code)
    return {
      status: 'FAILURE',
      ...failureFact === undefined ? {} : { failureKind: failureFact.kind as FailureChainFailureKind },
      ...errorCode === undefined ? {} : { errorCode },
      ...signature === undefined ? {} : { signature },
    }
  }

  const shell = projectShellResult(exec.name, result.value, evidence(ordinal))
  if (shell === undefined) return { status: 'SUCCESS' }
  const mode = shell.evidence.sandbox?.mode
  const permissionMode = isSandboxMode(mode) ? mode : undefined
  const failureFact = shell.failures[0]
  if (failureFact !== undefined) {
    const signature = signatureFor(failureFact)
    const errorCode = safeCode(failureFact.error?.code)
    return {
      status: 'FAILURE',
      ...failureFact.kind === undefined ? {} : { failureKind: failureFact.kind as FailureChainFailureKind },
      ...errorCode === undefined ? {} : { errorCode },
      ...signature === undefined ? {} : { signature },
      ...permissionMode === undefined ? {} : { permissionMode },
      processSuccess: shell.evidence.processSuccess,
    }
  }
  if (shell.evidence.processSuccess === false) {
    const signature: FailureSignature = { kind: 'PROCESS_FAILURE', key: 'PROCESS_FAILURE' }
    return {
      status: 'FAILURE',
      failureKind: 'PROCESS_FAILURE',
      signature,
      ...permissionMode === undefined ? {} : { permissionMode },
      processSuccess: false,
    }
  }
  if (shell.evidence.processSuccess === 'unknown') return {
    status: 'UNKNOWN',
    ...permissionMode === undefined ? {} : { permissionMode },
    processSuccess: 'unknown',
  }
  return {
    status: 'SUCCESS',
    ...permissionMode === undefined ? {} : { permissionMode },
    processSuccess: true,
  }
}

function sameOutcome(a: RelationOutcome, b: RelationOutcome): boolean {
  return a.status === b.status
    && a.failureKind === b.failureKind
    && a.errorCode === b.errorCode
    && a.signature?.key === b.signature?.key
    && a.permissionMode === b.permissionMode
    && a.processSuccess === b.processSuccess
}

function permissionLevel(mode: SandboxMode): number {
  return mode === 'read-only' ? 0 : mode === 'workspace-write' ? 1 : 2
}

export class RetryEscalationAnalyzer {
  private states = new WeakMap<Session, SessionState>()
  private executions = new WeakMap<ToolExecution, RelationRecord>()
  private readonly records = new Set<RelationRecord>()
  private readonly recordsById = new Map<ExecutionId, RelationRecord>()
  private readonly retired = new Map<ExecutionId, RetiredStatus>()
  private readonly clock: () => number
  private readonly ttlMs: number
  private readonly maxPerSession: number
  private readonly maxGlobal: number
  private readonly maxRecent: number
  private nextOrdinal = 1
  private active = true

  readonly diagnostics: FailureChainDiagnostics = Object.freeze({ get: this.get.bind(this) })

  constructor(options: RetryEscalationOptions = {}) {
    this.clock = options.clock ?? (() => performance.now())
    this.ttlMs = options.ttlMs ?? TTL_MS
    this.maxPerSession = options.maxPerSession ?? MAX_PER_SESSION
    this.maxGlobal = options.maxGlobal ?? MAX_GLOBAL
    this.maxRecent = options.maxRecent ?? MAX_RECENT
    if (![this.ttlMs, this.maxPerSession, this.maxGlobal, this.maxRecent].every(value => Number.isSafeInteger(value) && value > 0)) {
      throw new RangeError('Retry escalation bounds must be positive safe integers')
    }
    if (this.maxRecent > MAX_RECENT) throw new RangeError('Retry escalation recent bound cannot exceed eight')
  }

  observePreExecute(exec: ToolExecution, executionId: ExecutionId | undefined): void {
    if (!this.active || executionId === undefined || this.executions.has(exec)) return
    let session: Session | undefined
    let toolName: string | undefined
    let args: unknown
    try {
      session = exec.agent?.session
      toolName = typeof exec.name === 'string' ? exec.name : undefined
      args = exec.arguments
    } catch {
      session = undefined
    }
    if (session === undefined || toolName === undefined) {
      this.retired.set(executionId, { status: 'UNSUPPORTED', reasonCodes: Object.freeze(['EXACT_LIVE_SCOPE_UNAVAILABLE']) })
      return
    }

    const now = this.clock()
    const state = this.stateFor(session)
    const capture = captureFingerprint(toolName, args)
    const nearest = capture.fingerprint === undefined
      ? undefined
      : [...state.records].reverse().find(record => record.fingerprint === capture.fingerprint)
    const nearestPriorExpired = nearest !== undefined && now - nearest.createdAt >= this.ttlMs
    this.sweep(now)
    if (!this.makeRoom(state)) {
      this.retired.set(executionId, { status: 'CAPACITY_EXCEEDED', reasonCodes: Object.freeze(['CAPACITY_EXCEEDED']) })
      return
    }

    const record: RelationRecord = {
      session: new WeakRef(session),
      executionId,
      ordinal: this.nextOrdinal++,
      createdAt: now,
      ...capture.fingerprint === undefined ? {} : { fingerprint: capture.fingerprint },
      ...capture.requestedPermission === undefined ? {} : { requestedPermission: capture.requestedPermission },
      ...nearest === undefined ? {} : { nearestPriorOrdinal: nearest.ordinal },
      nearestPriorExpired,
      reasonCodes: [...capture.reasonCodes],
      evidenceState: capture.fingerprint === undefined ? 'UNSUPPORTED' : 'PENDING',
      outcome: undefined,
    }
    this.records.add(record)
    this.recordsById.set(executionId, record)
    state.records.push(record)
    this.executions.set(exec, record)
  }

  observeResult(exec: Readonly<ToolExecution>, result: Readonly<ToolExecutionResult>): void {
    if (!this.active) return
    const record = this.executions.get(exec as ToolExecution)
    if (record === undefined || record.evidenceState === 'UNSUPPORTED') return
    try {
      const next = outcomeFor(exec, result, record.ordinal)
      if (record.outcome === undefined && record.evidenceState === 'PENDING') {
        record.outcome = next
        record.evidenceState = 'SETTLED'
        record.settledBeforeCaptureOrdinal = this.nextOrdinal
        return
      }
      if (record.evidenceState === 'SETTLED' && record.outcome !== undefined && sameOutcome(record.outcome, next)) return
      record.evidenceState = 'CONFLICTED'
      record.outcome = undefined
      record.reasonCodes.push('RELATION_EVIDENCE_CONFLICT')
    } catch {
      record.evidenceState = 'CONFLICTED'
      record.outcome = undefined
      record.reasonCodes.push('RELATION_EVIDENCE_UNAVAILABLE')
    }
  }

  dispose(): void {
    if (!this.active) return
    this.active = false
    this.states = new WeakMap()
    this.executions = new WeakMap()
    this.records.clear()
    this.recordsById.clear()
    this.retired.clear()
  }

  private stateFor(session: Session): SessionState {
    let state = this.states.get(session)
    if (state === undefined) {
      state = { records: [], truncated: false }
      this.states.set(session, state)
    }
    return state
  }

  private makeRoom(state: SessionState): boolean {
    while (state.records.length >= this.maxPerSession) {
      const candidate = state.records.find(record => record.evidenceState !== 'PENDING')
      if (candidate === undefined) return false
      this.removeRecord(candidate, 'NOT_FOUND', ['CAPACITY_EVICTED'])
      state.truncated = true
    }
    while (this.records.size >= this.maxGlobal) {
      const candidate = [...this.records].find(record => record.evidenceState !== 'PENDING')
      if (candidate === undefined) return false
      this.removeRecord(candidate, 'NOT_FOUND', ['CAPACITY_EVICTED'])
      const session = candidate.session.deref()
      if (session !== undefined) this.stateFor(session).truncated = true
    }
    return true
  }

  private removeRecord(record: RelationRecord, status: RelationSummaryStatus, reasonCodes: readonly string[]): void {
    this.records.delete(record)
    this.recordsById.delete(record.executionId)
    const session = record.session.deref()
    if (session !== undefined) {
      const state = this.states.get(session)
      if (state !== undefined) {
        const index = state.records.indexOf(record)
        if (index >= 0) state.records.splice(index, 1)
      }
    }
    this.retired.set(record.executionId, { status, reasonCodes: Object.freeze([...reasonCodes]) })
    while (this.retired.size > this.maxGlobal * 2) this.retired.delete(this.retired.keys().next().value!)
  }

  private sweep(now: number): void {
    for (const record of [...this.records]) {
      if (now - record.createdAt >= this.ttlMs) {
        this.removeRecord(record, 'EXPIRED', ['TTL_EXPIRED'])
        const session = record.session.deref()
        if (session !== undefined) this.stateFor(session).truncated = true
      }
    }
  }

  private findRecord(state: SessionState, ordinal: number): RelationRecord | undefined {
    return state.records.find(record => record.ordinal === ordinal)
  }

  private directPrior(record: RelationRecord, now: number): RelationRecord | undefined {
    if (record.fingerprint === undefined || record.nearestPriorOrdinal === undefined || record.nearestPriorExpired) return undefined
    const session = record.session.deref()
    if (session === undefined) return undefined
    const state = this.states.get(session)
    const prior = state === undefined ? undefined : this.findRecord(state, record.nearestPriorOrdinal)
    if (prior === undefined || prior.fingerprint !== record.fingerprint) return undefined
    if (prior.ordinal >= record.ordinal) return undefined
    if (record.evidenceState === 'CONFLICTED') return undefined
    if (now - prior.createdAt >= this.ttlMs || record.createdAt - prior.createdAt > this.ttlMs) return undefined
    if (prior.evidenceState !== 'SETTLED' || prior.outcome?.status !== 'FAILURE') return undefined
    if (prior.settledBeforeCaptureOrdinal === undefined || prior.settledBeforeCaptureOrdinal > record.ordinal) return undefined
    return prior
  }

  private chainFor(record: RelationRecord, now: number): { readonly records: readonly RelationRecord[]; readonly truncated: boolean } {
    const reverse: RelationRecord[] = []
    let cursor: RelationRecord | undefined = record
    let truncated = false
    while (cursor !== undefined && reverse.length < this.maxRecent) {
      reverse.push(cursor)
      cursor = this.directPrior(cursor, now)
    }
    if (cursor !== undefined) truncated = true
    const session = record.session.deref()
    if (session !== undefined && this.states.get(session)?.truncated === true) truncated = true
    return { records: Object.freeze(reverse.reverse()), truncated }
  }

  private summaryStatus(record: RelationRecord, state: SessionState): { readonly status: RelationSummaryStatus; readonly reasonCodes: readonly string[] } {
    const reasons = [...record.reasonCodes]
    if (record.evidenceState === 'UNSUPPORTED') return { status: 'UNSUPPORTED', reasonCodes: reasons }
    if (record.evidenceState === 'CONFLICTED') {
      reasons.push('RELATION_EVIDENCE_CONFLICT')
      return { status: 'DEGRADED', reasonCodes: [...new Set(reasons)] }
    }
    if (record.nearestPriorOrdinal !== undefined) {
      const prior = this.findRecord(state, record.nearestPriorOrdinal)
      if (record.nearestPriorExpired || prior === undefined) reasons.push('NEAREST_MATCH_UNAVAILABLE')
      else if (this.directPrior(record, this.clock()) === undefined) reasons.push('NEAREST_MATCH_BLOCKED')
    }
    if (state.truncated) reasons.push('HISTORY_TRUNCATED')
    const degraded = reasons.some(reason => reason === 'NEAREST_MATCH_UNAVAILABLE' || reason === 'NEAREST_MATCH_BLOCKED' || reason === 'HISTORY_TRUNCATED')
    return { status: degraded ? 'DEGRADED' : 'READY', reasonCodes: [...new Set(reasons)] }
  }

  private get(executionId: ExecutionId): FailureChainSummary {
    if (!this.active) return this.emptySummary(executionId, 'NOT_FOUND', ['RUNTIME_STATE_LOST'])
    const now = this.clock()
    this.sweep(now)
    const record = this.recordsById.get(executionId)
    if (record === undefined) {
      const retired = this.retired.get(executionId)
      return retired === undefined
        ? this.emptySummary(executionId, 'NOT_FOUND', ['NO_RETAINED_RELATION'])
        : this.emptySummary(executionId, retired.status, retired.reasonCodes)
    }
    const session = record.session.deref()
    if (session === undefined) return this.emptySummary(executionId, 'NOT_FOUND', ['SESSION_UNAVAILABLE'])
    const state = this.states.get(session)
    if (state === undefined) return this.emptySummary(executionId, 'NOT_FOUND', ['SESSION_UNAVAILABLE'])
    const status = this.summaryStatus(record, state)
    const prior = this.directPrior(record, now)
    const chain = this.chainFor(record, now)
    const recent = chain.records.map(item => {
      const failure = item.outcome?.status === 'FAILURE' && item.outcome.failureKind !== undefined
        ? {
            executionId: item.executionId,
            failureKind: item.outcome.failureKind,
            ...item.outcome.errorCode === undefined ? {} : { errorCode: item.outcome.errorCode },
          }
        : { executionId: item.executionId }
      return Object.freeze(failure)
    })
    const recentFailureCount = chain.records.filter(item => item.outcome?.status === 'FAILURE' && item.evidenceState === 'SETTLED').length
    let sameRootCause: boolean | 'unknown' = 'unknown'
    if (prior !== undefined && record.outcome?.status === 'FAILURE' && prior.outcome?.status === 'FAILURE') {
      sameRootCause = record.outcome.signature !== undefined && prior.outcome.signature !== undefined
        ? record.outcome.signature.key === prior.outcome.signature.key
        : 'unknown'
    }
    let permissionEscalation: boolean | 'unknown' = 'unknown'
    if (prior !== undefined) {
      const priorMode = prior.requestedPermission ?? prior.outcome?.permissionMode
      const currentMode = record.requestedPermission
      if (priorMode !== undefined && currentMode !== undefined) {
        permissionEscalation = permissionLevel(currentMode) > permissionLevel(priorMode)
      }
    }
    const reasonCodes = [...new Set([...status.reasonCodes, ...(chain.truncated ? ['CHAIN_TRUNCATED'] : [])])]
    return deepFreeze({
      executionId,
      status: status.status,
      ...prior === undefined ? {} : { retryOf: prior.executionId },
      retryCount: Math.max(0, chain.records.length - 1),
      recentFailureCount,
      sameRootCause,
      permissionEscalation,
      truncated: chain.truncated,
      reasonCodes: freezeArray(reasonCodes),
      recent: freezeArray(recent),
    })
  }

  private emptySummary(executionId: string, status: RelationSummaryStatus, reasonCodes: readonly string[]): FailureChainSummary {
    return deepFreeze({
      executionId,
      status,
      retryCount: 0,
      recentFailureCount: 0,
      sameRootCause: 'unknown' as const,
      permissionEscalation: 'unknown' as const,
      truncated: false,
      reasonCodes: freezeArray(reasonCodes),
      recent: freezeArray([]),
    })
  }
}
