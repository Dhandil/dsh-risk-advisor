import type { ExecutionId } from './correlation.ts'
import type { VerificationAdapterId } from './expected-effect.ts'

export type VerificationStatus = 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'UNAVAILABLE'
export type SemanticSuccess = true | false | 'unknown'
export type VerificationReasonCode =
  | 'NO_EXPECTED_EFFECT'
  | 'UNSUPPORTED_OPERATION'
  | 'CAPTURE_UNAVAILABLE'
  | 'PROCESS_NOT_SUCCESSFUL'
  | 'RESULT_SHAPE_UNSUPPORTED'
  | 'POSTCONDITION_MATCHED'
  | 'POSTCONDITION_MISMATCH'
  | 'VERIFIER_CAPABILITY_UNAVAILABLE'
  | 'VERIFIER_POLICY_UNAVAILABLE'
  | 'VERIFIER_EXECUTION_WORLD_CHANGED'
  | 'VERIFIER_QUEUE_SATURATED'
  | 'VERIFIER_TIMEOUT'
  | 'VERIFIER_ABORTED'
  | 'VERIFIER_OUTPUT_TRUNCATED'
  | 'VERIFIER_RESULT_UNSUPPORTED'
  | 'VERIFICATION_CONFLICT'
  | 'RUNTIME_STATE_LOST'

export interface VerificationRecordV1 {
  readonly schemaVersion: 1
  readonly executionId: ExecutionId
  readonly adapterId: VerificationAdapterId
  readonly source: 'tool-contract' | 'known-adapter'
  readonly status: VerificationStatus
  readonly semanticSuccess: SemanticSuccess
  readonly evidenceQuality: 'high' | 'medium' | 'low'
  readonly reasonCodes: readonly VerificationReasonCode[]
  readonly observedAt: number
  readonly durationMs: number
}

export interface VerificationDiagnostics {
  readonly get: (executionId: ExecutionId) => VerificationRecordV1 | undefined
}

interface StoredRecord {
  readonly record: VerificationRecordV1
  readonly createdAt: number
  readonly session?: object
}

const TTL_MS = 5 * 60 * 1000
const MAX_PER_SESSION = 128
const MAX_GLOBAL = 512

function freezeRecord(record: VerificationRecordV1): VerificationRecordV1 {
  return Object.freeze({
    ...record,
    reasonCodes: Object.freeze([...new Set(record.reasonCodes)]),
  })
}

function sameRecord(a: VerificationRecordV1, b: VerificationRecordV1): boolean {
  return a.executionId === b.executionId
    && a.adapterId === b.adapterId
    && a.status === b.status
    && a.semanticSuccess === b.semanticSuccess
    && a.evidenceQuality === b.evidenceQuality
    && a.reasonCodes.join(',') === b.reasonCodes.join(',')
}

/** Process-local, bounded, sanitized Phase-7 evidence store. */
export class VerificationStore {
  private readonly records = new Map<ExecutionId, StoredRecord>()
  private readonly bySession = new WeakMap<object, Set<ExecutionId>>()
  private readonly retired = new Map<ExecutionId, VerificationStatus>()
  private readonly clock: () => number
  private readonly ttlMs: number
  private readonly maxPerSession: number
  private readonly maxGlobal: number
  private active = true

  readonly diagnostics: VerificationDiagnostics = Object.freeze({ get: this.get.bind(this) })

  constructor(options: { readonly clock?: () => number; readonly ttlMs?: number; readonly maxPerSession?: number; readonly maxGlobal?: number } = {}) {
    this.clock = options.clock ?? (() => Date.now())
    this.ttlMs = options.ttlMs ?? TTL_MS
    this.maxPerSession = options.maxPerSession ?? MAX_PER_SESSION
    this.maxGlobal = options.maxGlobal ?? MAX_GLOBAL
    if (![this.ttlMs, this.maxPerSession, this.maxGlobal].every(value => Number.isSafeInteger(value) && value > 0)) throw new RangeError('Verification store bounds must be positive safe integers')
    if (this.maxPerSession > MAX_PER_SESSION || this.maxGlobal > MAX_GLOBAL) throw new RangeError('Verification store bounds exceed frozen limits')
  }

  put(record: VerificationRecordV1, session?: object): VerificationRecordV1 {
    if (!this.active) return freezeRecord({ ...record, status: 'UNAVAILABLE', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: ['RUNTIME_STATE_LOST'] })
    this.sweep(this.clock())
    const sanitized = freezeRecord(record)
    const prior = this.records.get(record.executionId)
    if (prior !== undefined) {
      if (sameRecord(prior.record, sanitized)) return prior.record
      const conflict = freezeRecord({ ...sanitized, status: 'UNKNOWN', semanticSuccess: 'unknown', evidenceQuality: 'low', reasonCodes: ['VERIFICATION_CONFLICT'] })
      this.records.set(record.executionId, { record: conflict, createdAt: prior.createdAt, ...prior.session === undefined ? {} : { session: prior.session } })
      return conflict
    }
    if (session !== undefined) {
      const ids = this.bySession.get(session) ?? new Set<ExecutionId>()
      while (ids.size >= this.maxPerSession) {
        const oldest = ids.values().next().value as ExecutionId | undefined
        if (oldest === undefined) break
        this.delete(oldest)
      }
      this.bySession.set(session, ids)
      ids.add(record.executionId)
    }
    while (this.records.size >= this.maxGlobal) {
      const oldest = this.records.keys().next().value as ExecutionId | undefined
      if (oldest === undefined) break
      this.delete(oldest)
    }
    this.records.set(record.executionId, { record: sanitized, createdAt: this.clock(), ...session === undefined ? {} : { session } })
    return sanitized
  }

  get(executionId: ExecutionId): VerificationRecordV1 | undefined {
    if (!this.active) return undefined
    this.sweep(this.clock())
    return this.records.get(executionId)?.record
  }

  dispose(): void {
    this.active = false
    this.records.clear()
    this.retired.clear()
  }

  private delete(executionId: ExecutionId): void {
    const item = this.records.get(executionId)
    if (item?.session !== undefined) this.bySession.get(item.session)?.delete(executionId)
    this.records.delete(executionId)
    this.retired.set(executionId, item?.record.status ?? 'UNKNOWN')
    while (this.retired.size > MAX_GLOBAL * 2) this.retired.delete(this.retired.keys().next().value as ExecutionId)
  }

  private sweep(now: number): void {
    for (const [executionId, item] of this.records) {
      if (now - item.createdAt >= this.ttlMs) this.delete(executionId)
    }
  }
}
