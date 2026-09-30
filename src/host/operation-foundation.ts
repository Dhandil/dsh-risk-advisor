import { createHash } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ExecutionId } from './correlation.ts'

export type FoundationStatus = 'CAPTURED' | 'DEGRADED' | 'UNAVAILABLE' | 'EXPIRED' | 'NOT_FOUND' | 'CAPACITY_EXCEEDED'
export type FoundationToolKind = 'filesystem-read' | 'filesystem-write' | 'unknown'
export type FoundationUnknown = true | false | 'unknown'

export interface FoundationBoundaryDiagnostic {
  readonly workspaceContained: FoundationUnknown
  readonly targetScope: 'workspace' | 'user' | 'system' | 'remote' | 'unknown'
  readonly sandboxActive: FoundationUnknown
  readonly sandboxCovered: FoundationUnknown
  readonly rollbackAvailable: FoundationUnknown
  readonly checkpointAvailable: FoundationUnknown
}

export interface FoundationDiagnostic {
  readonly executionId: string
  readonly status: FoundationStatus
  readonly toolKind: FoundationToolKind
  readonly reasonCodes: readonly string[]
  readonly boundary: FoundationBoundaryDiagnostic
}

export interface FoundationDiagnostics {
  readonly get: (executionId: string) => FoundationDiagnostic
}

type JsonValue = null | boolean | number | string | JsonValue[] | { readonly [key: string]: JsonValue }

interface PrivateNormalizedOperation {
  readonly toolName: string
  readonly kind: FoundationToolKind
  readonly requestedTarget?: string
  readonly requestedPermission?: string
}

interface PrivateExecutionBoundary {
  readonly sessionCreationCwd?: string
  readonly workspaceContained: FoundationUnknown
  readonly targetScope: FoundationBoundaryDiagnostic['targetScope']
  readonly sandboxActive: FoundationUnknown
  readonly sandboxCovered: FoundationUnknown
  readonly rollbackAvailable: FoundationUnknown
  readonly checkpointAvailable: FoundationUnknown
  readonly canonicalTargets: readonly string[]
  readonly notes: readonly string[]
}

interface PrivateOperationSnapshot {
  readonly version: 1
  readonly executionId: ExecutionId
  readonly sessionId: string
  readonly callId: string
  readonly toolName: string
  readonly rootCallId?: string
  readonly parentExecutionId?: ExecutionId
  readonly createdAt: number
  readonly captureStatus: 'CAPTURED' | 'DEGRADED'
  readonly reasonCodes: readonly string[]
  readonly rawArguments?: JsonValue
  readonly normalizedOperation: PrivateNormalizedOperation
  readonly executionBoundary: PrivateExecutionBoundary
  readonly operationHash?: string
}

interface Entry {
  readonly execution: ToolExecution
  snapshot: PrivateOperationSnapshot
  rawArguments: JsonValue | undefined
  active: boolean
  readonly createdAt: number
}

interface SeenCapture {
  readonly executionId?: ExecutionId
  readonly status: FoundationStatus
  readonly reasonCodes: readonly string[]
}

interface Budget {
  bytes: number
  nodes: number
  readonly stack: Set<object>
}

class CloneFailure {
  constructor(readonly reason: string) {}
}

type CloneResult = JsonValue | CloneFailure

const MAX_BYTES = 16 * 1024
const MAX_DEPTH = 8
const MAX_NODES = 256
const MAX_KEYS = 64
const MAX_STRING_LENGTH = 8192
const MAX_READ_NUMBER = 1_000_000
const MAX_ENTRIES = 512
const TTL_MS = 5 * 60 * 1000
const IDENTIFIER_LIMIT = 256

const UNKNOWN_BOUNDARY: FoundationBoundaryDiagnostic = Object.freeze({
  workspaceContained: 'unknown',
  targetScope: 'unknown',
  sandboxActive: 'unknown',
  sandboxCovered: 'unknown',
  rollbackAvailable: 'unknown',
  checkpointAvailable: 'unknown',
})

function isFailure(value: CloneResult): value is CloneFailure {
  return value instanceof CloneFailure
}

function failure(reason: string): CloneFailure {
  return new CloneFailure(reason)
}

function utf8Length(value: string): number {
  return Buffer.byteLength(value, 'utf8')
}

function charge(budget: Budget, value: string): boolean {
  budget.bytes += utf8Length(value)
  return budget.bytes <= MAX_BYTES
}

function cloneBounded(value: unknown, budget: Budget, depth: number): CloneResult {
  if (depth > MAX_DEPTH) return failure('ARGUMENT_DEPTH_EXCEEDED')
  budget.nodes += 1
  if (budget.nodes > MAX_NODES) return failure('ARGUMENT_NODE_LIMIT_EXCEEDED')

  if (value === null) {
    budget.bytes += 4
    return budget.bytes <= MAX_BYTES ? null : failure('ARGUMENT_BYTES_EXCEEDED')
  }
  if (typeof value === 'boolean') {
    budget.bytes += value ? 4 : 5
    return budget.bytes <= MAX_BYTES ? value : failure('ARGUMENT_BYTES_EXCEEDED')
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return failure('ARGUMENT_NUMBER_UNSUPPORTED')
    const rendered = String(value)
    return charge(budget, rendered) ? value : failure('ARGUMENT_BYTES_EXCEEDED')
  }
  if (typeof value === 'string') {
    if (value.length > MAX_STRING_LENGTH) return failure('ARGUMENT_STRING_LIMIT_EXCEEDED')
    return charge(budget, JSON.stringify(value)) ? value : failure('ARGUMENT_BYTES_EXCEEDED')
  }
  if (typeof value !== 'object') return failure('ARGUMENT_TYPE_UNSUPPORTED')

  let object = value as object
  if (budget.stack.has(object)) return failure('ARGUMENT_CYCLE')
  budget.stack.add(object)
  try {
    if (Array.isArray(value)) {
      let length: number
      try { length = value.length } catch { return failure('ARGUMENT_ACCESS_FAILED') }
      if (!Number.isSafeInteger(length) || length > MAX_NODES) return failure('ARGUMENT_ARRAY_LIMIT_EXCEEDED')
      budget.bytes += 1
      const result: JsonValue[] = []
      for (let index = 0; index < length; index += 1) {
        let descriptor: PropertyDescriptor | undefined
        try { descriptor = Object.getOwnPropertyDescriptor(value, String(index)) } catch { return failure('ARGUMENT_ACCESS_FAILED') }
        if (descriptor === undefined || !('value' in descriptor)) return failure('ARGUMENT_ACCESS_FAILED')
        const child = cloneBounded(descriptor.value, budget, depth + 1)
        if (isFailure(child)) return child
        result.push(child)
        budget.bytes += 1
        if (budget.bytes > MAX_BYTES) return failure('ARGUMENT_BYTES_EXCEEDED')
      }
      return result
    }

    let prototype: object | null
    let keys: string[]
    try {
      prototype = Object.getPrototypeOf(value)
      keys = Object.keys(value)
    } catch {
      return failure('ARGUMENT_ACCESS_FAILED')
    }
    if (prototype !== Object.prototype && prototype !== null) return failure('ARGUMENT_OBJECT_UNSUPPORTED')
    if (keys.length > MAX_KEYS) return failure('ARGUMENT_KEY_LIMIT_EXCEEDED')
    const result: Record<string, JsonValue> = {}
    budget.bytes += 1
    for (const key of keys) {
      if (key.length > MAX_STRING_LENGTH || !charge(budget, JSON.stringify(key))) return failure('ARGUMENT_BYTES_EXCEEDED')
      let descriptor: PropertyDescriptor | undefined
      try { descriptor = Object.getOwnPropertyDescriptor(value, key) } catch { return failure('ARGUMENT_ACCESS_FAILED') }
      if (descriptor === undefined || !('value' in descriptor)) return failure('ARGUMENT_ACCESSOR_UNSUPPORTED')
      const child = cloneBounded(descriptor.value, budget, depth + 1)
      if (isFailure(child)) return child
      Object.defineProperty(result, key, {
        value: child,
        enumerable: true,
        writable: true,
        configurable: true,
      })
      budget.bytes += 1
      if (budget.bytes > MAX_BYTES) return failure('ARGUMENT_BYTES_EXCEEDED')
    }
    return result
  } finally {
    budget.stack.delete(object)
  }
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

function stableJson(value: JsonValue): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableJson(value[key]!)}`).join(',')}}`
}

function safeString(value: unknown, nonEmpty = false): string | undefined {
  if (typeof value !== 'string' || value.length > IDENTIFIER_LIMIT || (nonEmpty && value.length === 0)) return undefined
  return value
}

function safeCwd(session: Session | undefined): string | undefined {
  try {
    const cwd = session?.header?.cwd
    return typeof cwd === 'string' && cwd.length <= MAX_STRING_LENGTH ? cwd : undefined
  } catch {
    return undefined
  }
}

function keysOf(value: Record<string, JsonValue>): readonly string[] {
  return Object.keys(value)
}

function normalize(toolName: string, args: JsonValue): {
  readonly operation: PrivateNormalizedOperation
  readonly reasonCodes: readonly string[]
  readonly valid: boolean
  readonly requestedPermission?: string
} {
  if (toolName !== 'read' && toolName !== 'write') {
    return {
      operation: { toolName, kind: 'unknown' },
      reasonCodes: Object.freeze(['UNKNOWN_TOOL']),
      valid: false,
    }
  }
  if (typeof args !== 'object' || args === null || Array.isArray(args)) {
    return {
      operation: { toolName, kind: 'unknown' },
      reasonCodes: Object.freeze(['ARGUMENT_SHAPE_UNKNOWN']),
      valid: false,
    }
  }

  const object = args as Record<string, JsonValue>
  const keys = keysOf(object)
  const allowed = toolName === 'read'
    ? ['file_path', 'offset', 'limit']
    : ['file_path', 'content', 'sandbox_permissions', 'justification']
  const reasons: string[] = []
  if (keys.some(key => !allowed.includes(key))) reasons.push('UNKNOWN_ARGUMENT_KEY')
  if (typeof object.file_path !== 'string' || object.file_path.trim().length === 0) reasons.push('FILE_PATH_INVALID')
  if (toolName === 'read') {
    for (const key of ['offset', 'limit'] as const) {
      const value = object[key]
      if (value !== undefined && (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > MAX_READ_NUMBER)) reasons.push(`${key.toUpperCase()}_INVALID`)
    }
  } else {
    if (typeof object.content !== 'string') reasons.push('CONTENT_INVALID')
    for (const key of ['sandbox_permissions', 'justification'] as const) {
      if (object[key] !== undefined && typeof object[key] !== 'string') reasons.push(`${key.toUpperCase()}_INVALID`)
    }
  }
  const valid = reasons.length === 0
  const operation: PrivateNormalizedOperation = {
    toolName,
    kind: valid ? toolName === 'read' ? 'filesystem-read' : 'filesystem-write' : 'unknown',
    ...(valid && typeof object.file_path === 'string' ? { requestedTarget: object.file_path } : {}),
    ...(valid && toolName === 'write' && typeof object.sandbox_permissions === 'string'
      ? { requestedPermission: object.sandbox_permissions }
      : {}),
  }
  return { operation, reasonCodes: Object.freeze(reasons), valid, ...operation.requestedPermission === undefined ? {} : { requestedPermission: operation.requestedPermission } }
}

function boundaryFor(session: Session | undefined): PrivateExecutionBoundary {
  const cwd = safeCwd(session)
  return Object.freeze({
    ...UNKNOWN_BOUNDARY,
    ...cwd === undefined ? {} : { sessionCreationCwd: cwd },
    canonicalTargets: Object.freeze([]),
    notes: Object.freeze(['BOUNDARY_EVIDENCE_UNAVAILABLE', 'SESSION_CWD_IS_CREATION_METADATA']),
  })
}

function diagnosticFrom(snapshot: PrivateOperationSnapshot): FoundationDiagnostic {
  return Object.freeze({
    executionId: snapshot.executionId,
    status: snapshot.captureStatus,
    toolKind: snapshot.normalizedOperation.kind,
    reasonCodes: Object.freeze([...snapshot.reasonCodes]),
    boundary: UNKNOWN_BOUNDARY,
  })
}

function notFoundDiagnostic(executionId: string, status: FoundationStatus = 'NOT_FOUND'): FoundationDiagnostic {
  return Object.freeze({
    executionId: typeof executionId === 'string' && executionId.length <= IDENTIFIER_LIMIT ? executionId : '',
    status,
    toolKind: 'unknown',
    reasonCodes: Object.freeze([status]),
    boundary: UNKNOWN_BOUNDARY,
  })
}

export interface CaptureResult {
  readonly executionId?: ExecutionId
  readonly status: FoundationStatus
  readonly reasonCodes: readonly string[]
}

export interface OperationFoundationOptions {
  readonly clock?: () => number
  readonly maxEntries?: number
  readonly ttlMs?: number
}

/** Host-private exact-live Operation Foundation. Never expose this class through Context. */
export class OperationFoundation {
  private readonly snapshots = new Map<ExecutionId, Entry>()
  private readonly seen = new WeakMap<ToolExecution, SeenCapture>()
  private readonly clock: () => number
  private readonly maxEntries: number
  private readonly ttlMs: number
  private active = true

  readonly diagnostics: FoundationDiagnostics = Object.freeze({ get: this.get.bind(this) })

  constructor(options: OperationFoundationOptions = {}) {
    this.clock = options.clock ?? (() => performance.now())
    this.maxEntries = options.maxEntries ?? MAX_ENTRIES
    this.ttlMs = options.ttlMs ?? TTL_MS
    if (!Number.isSafeInteger(this.maxEntries) || this.maxEntries < 1 || !Number.isSafeInteger(this.ttlMs) || this.ttlMs < 1) {
      throw new RangeError('OperationFoundation bounds must be positive safe integers')
    }
  }

  capture(exec: ToolExecution, executionId: ExecutionId | undefined, parentExecutionId?: ExecutionId): CaptureResult {
    const prior = this.seen.get(exec)
    if (prior !== undefined) return prior
    if (!this.active || executionId === undefined) {
      const result = Object.freeze({ status: 'UNAVAILABLE' as const, reasonCodes: Object.freeze(['EXACT_EXECUTION_ID_UNAVAILABLE']) })
      this.seen.set(exec, result)
      return result
    }
    const now = this.clock()
    this.sweep(now)
    while (this.snapshots.size >= this.maxEntries) {
      const oldestSettled = [...this.snapshots.values()].find(entry => !entry.active)
      if (oldestSettled === undefined) {
        const result = Object.freeze({ executionId, status: 'CAPACITY_EXCEEDED' as const, reasonCodes: Object.freeze(['CAPACITY_EXCEEDED']) })
        this.seen.set(exec, result)
        return result
      }
      this.snapshots.delete(oldestSettled.snapshot.executionId)
      this.seen.set(oldestSettled.execution, Object.freeze({
        executionId: oldestSettled.snapshot.executionId,
        status: 'NOT_FOUND' as const,
        reasonCodes: Object.freeze(['EVICTED_CAPACITY']),
      }))
    }

    let session: Session | undefined
    let sessionId: string | undefined
    let callId: string | undefined
    let toolName: string | undefined
    try {
      session = exec.agent?.session
      sessionId = safeString(session?.id, true)
      callId = safeString(exec.callId, true)
      toolName = safeString(exec.name, true)
    } catch {
      sessionId = undefined
      callId = undefined
      toolName = undefined
    }
    if (session === undefined || sessionId === undefined || callId === undefined) {
      const result = Object.freeze({ executionId, status: 'UNAVAILABLE' as const, reasonCodes: Object.freeze(['LIVE_SCOPE_IDENTITY_UNAVAILABLE']) })
      this.seen.set(exec, result)
      return result
    }

    const actualToolName = toolName ?? 'unknown'
    let argumentValue: unknown
    let argumentAccessFailed = false
    try {
      argumentValue = exec.arguments
    } catch {
      argumentAccessFailed = true
    }
    const clone = argumentAccessFailed
      ? failure('ARGUMENT_ACCESS_FAILED')
      : cloneBounded(argumentValue, { bytes: 0, nodes: 0, stack: new Set() }, 0)
    const reasons: string[] = []
    let normalized: ReturnType<typeof normalize>
    let rawArguments: JsonValue | undefined
    let operationHash: string | undefined
    if (isFailure(clone)) {
      reasons.push(clone.reason)
      normalized = {
        operation: { toolName: actualToolName, kind: 'unknown' },
        reasonCodes: Object.freeze([clone.reason]),
        valid: false,
      }
    } else {
      normalized = normalize(actualToolName, clone)
      reasons.push(...normalized.reasonCodes)
      if (normalized.valid) reasons.push('NAME_AND_SHAPE_ONLY')
      if (normalized.valid) {
        rawArguments = deepFreeze(clone)
        try {
          operationHash = createHash('sha256')
            .update(stableJson([1, actualToolName, clone, normalized.requestedPermission ?? null] as unknown as JsonValue))
            .digest('hex')
        } catch {
          reasons.push('HASH_UNAVAILABLE')
        }
      }
    }
    let rootCallId: string | undefined
    try {
      rootCallId = safeString(exec.rootCallId)
    } catch {
      reasons.push('ROOT_CALL_ID_UNAVAILABLE')
    }
    const captureStatus = normalized.valid ? 'CAPTURED' : 'DEGRADED'
    const reasonCodes = Object.freeze([...new Set(reasons)])
    const snapshot = Object.freeze({
      version: 1 as const,
      executionId,
      sessionId,
      callId,
      toolName: actualToolName,
      ...rootCallId === undefined ? {} : { rootCallId },
      ...parentExecutionId === undefined ? {} : { parentExecutionId },
      createdAt: now,
      captureStatus,
      reasonCodes,
      ...rawArguments === undefined ? {} : { rawArguments },
      normalizedOperation: Object.freeze(normalized.operation),
      executionBoundary: boundaryFor(session),
      ...operationHash === undefined ? {} : { operationHash },
    })
    const entry: Entry = { execution: exec, snapshot, rawArguments, active: true, createdAt: now }
    this.snapshots.set(executionId, entry)
    const result = Object.freeze({ executionId, status: captureStatus, reasonCodes })
    this.seen.set(exec, result)
    return result
  }

  retire(exec: Readonly<ToolExecution>): void {
    const seen = this.seen.get(exec)
    if (seen?.executionId === undefined) return
    const entry = this.snapshots.get(seen.executionId)
    if (entry === undefined) return
    entry.active = false
    entry.rawArguments = undefined
    if (entry.snapshot.rawArguments !== undefined) {
      const snapshot = entry.snapshot
      const { rawArguments: _rawArguments, ...withoutRawArguments } = snapshot
      entry.snapshot = Object.freeze(withoutRawArguments)
    }
  }

  dispose(): void {
    if (!this.active) return
    this.active = false
    for (const entry of this.snapshots.values()) {
      this.seen.set(entry.execution, Object.freeze({
        executionId: entry.snapshot.executionId,
        status: 'NOT_FOUND' as const,
        reasonCodes: Object.freeze(['GENERATION_DISPOSED']),
      }))
    }
    this.snapshots.clear()
  }

  private get(executionId: string): FoundationDiagnostic {
    if (!this.active) return notFoundDiagnostic(executionId)
    const now = this.clock()
    const entry = this.snapshots.get(executionId)
    if (entry === undefined) return notFoundDiagnostic(executionId)
    if (now - entry.createdAt >= this.ttlMs) {
      this.snapshots.delete(executionId)
      this.seen.set(entry.execution, Object.freeze({ executionId, status: 'EXPIRED' as const, reasonCodes: Object.freeze(['EXPIRED']) }))
      return notFoundDiagnostic(executionId, 'EXPIRED')
    }
    return diagnosticFrom(entry.snapshot)
  }

  private sweep(now: number): void {
    for (const [executionId, entry] of this.snapshots) {
      if (now - entry.createdAt >= this.ttlMs) {
        this.snapshots.delete(executionId)
        this.seen.set(entry.execution, Object.freeze({ executionId, status: 'EXPIRED' as const, reasonCodes: Object.freeze(['EXPIRED']) }))
      }
    }
  }
}
