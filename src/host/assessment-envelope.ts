import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import type {
  ActiveExecutionIndex,
  ActiveExecutionLookup,
  ExecutionId,
} from './correlation.ts'
import type { FoundationDiagnostics } from './operation-foundation.ts'

export type AssessmentAssociation = 'BOUND' | 'UNBOUND' | 'AMBIGUOUS'
export type AssessmentStatus = 'pending' | 'unavailable' | 'cancelled' | 'not-found'
export type AssessmentStage = 'not-started'
export type AssessmentReasonCode =
  | 'ASSESSOR_NOT_IMPLEMENTED'
  | 'FOUNDATION_DEGRADED'
  | 'FOUNDATION_UNAVAILABLE'
  | 'MISSING_CALL_ID'
  | 'MISSING_SCOPE_IDENTITY'
  | 'NO_ACTIVE_EXECUTION'
  | 'RUNTIME_STATE_LOST'
  | 'OBSERVATION_UNAVAILABLE'
  | 'AMBIGUOUS_EXECUTION'
  | 'CORRELATION_CONFLICT'
  | 'CAPACITY_EXCEEDED'
  | 'ORPHAN_DECISION'
  | 'NATIVE_OUTCOME_OBSERVED'
  | 'NOT_FOUND'

export interface ApprovalAssessmentShell {
  readonly schemaVersion: 1
  readonly assessmentId?: string
  readonly sessionId: string
  readonly approvalId: string
  readonly executionId?: ExecutionId
  readonly association: AssessmentAssociation
  readonly status: Exclude<AssessmentStatus, 'not-found'>
  readonly stage: AssessmentStage
  readonly reasonCodes: readonly AssessmentReasonCode[]
  readonly startedAt: number
  readonly updatedAt: number
  readonly closed: boolean
  readonly observedOutcome?: ApprovalOutcome
}

export interface AssessmentDiagnostic {
  readonly schemaVersion: 1
  readonly assessmentId?: string
  readonly sessionId: string
  readonly approvalId: string
  readonly executionId?: ExecutionId
  readonly association: AssessmentAssociation
  readonly status: AssessmentStatus
  readonly stage: AssessmentStage
  readonly reasonCodes: readonly AssessmentReasonCode[]
  readonly startedAt: number
  readonly updatedAt: number
  readonly closed: boolean
  readonly observedOutcome?: ApprovalOutcome
}

export interface AssessmentDiagnostics {
  readonly getForApproval: (session: Session, approvalId: string) => AssessmentDiagnostic
}

export type AssessmentObservationResult =
  | 'IGNORED'
  | 'RECORDED'
  | 'DUPLICATE'
  | 'CONFLICT'
  | 'CLOSED'
  | 'DECIDED'
  | 'CAPACITY_EXCEEDED'
  | 'FAULTED'

export interface AssessmentCoordinatorOptions {
  readonly clock?: () => number
  readonly maxRecords?: number
  readonly completedTtlMs?: number
}

interface AssessmentRecord {
  readonly sessionRef: WeakRef<Session>
  readonly approvalId: string
  readonly toolName: string
  readonly callId?: string
  shell: ApprovalAssessmentShell
}

const MAX_RECORDS = 256
const COMPLETED_TTL_MS = 10 * 60 * 1000
const IDENTIFIER_LIMIT = 256

function safeId(value: unknown, nonEmpty = false): string | undefined {
  if (typeof value !== 'string' || value.length > IDENTIFIER_LIMIT || (nonEmpty && value.length === 0)) return undefined
  return value
}

function outcomeOf(value: unknown): ApprovalOutcome | undefined {
  return value === 'allowed-once' || value === 'rejected' || value === 'cancelled' || value === 'unavailable'
    ? value
    : undefined
}

function copyReasons(reasons: readonly AssessmentReasonCode[]): readonly AssessmentReasonCode[] {
  return Object.freeze([...new Set(reasons)])
}

function lookupReason(lookup: ActiveExecutionLookup): AssessmentReasonCode {
  if (lookup.status === 'FOUND') return 'OBSERVATION_UNAVAILABLE'
  if (lookup.status === 'AMBIGUOUS') return 'AMBIGUOUS_EXECUTION'
  return lookup.reason
}

function notFoundDiagnostic(session: Session, approvalId: string, reason: AssessmentReasonCode = 'NOT_FOUND'): AssessmentDiagnostic {
  let sessionId = ''
  try { sessionId = safeId(session.id, true) ?? '' } catch { /* sanitized fallback */ }
  return Object.freeze({
    schemaVersion: 1 as const,
    sessionId,
    approvalId: safeId(approvalId) ?? '',
    association: 'UNBOUND' as const,
    status: 'not-found' as const,
    stage: 'not-started' as const,
    reasonCodes: Object.freeze([reason]),
    startedAt: 0,
    updatedAt: 0,
    closed: true,
  })
}

function diagnosticFrom(shell: ApprovalAssessmentShell): AssessmentDiagnostic {
  return Object.freeze({
    ...shell,
    reasonCodes: Object.freeze([...shell.reasonCodes]),
  })
}

/**
 * Host-private Phase 1B lifecycle shell. It observes committed approval audit
 * events only; it never answers approval or creates a completed assessment.
 */
export class ApprovalAssessmentCoordinator {
  private recordsBySession = new WeakMap<Session, Map<string, AssessmentRecord>>()
  private readonly records = new Set<AssessmentRecord>()
  private readonly foundation: FoundationDiagnostics
  private readonly clock: () => number
  private readonly maxRecords: number
  private readonly completedTtlMs: number
  private active = true

  readonly diagnostics: AssessmentDiagnostics = Object.freeze({ getForApproval: this.getForApproval.bind(this) })

  constructor(foundation: FoundationDiagnostics, options: AssessmentCoordinatorOptions = {}) {
    this.foundation = foundation
    this.clock = options.clock ?? (() => performance.now())
    this.maxRecords = options.maxRecords ?? MAX_RECORDS
    this.completedTtlMs = options.completedTtlMs ?? COMPLETED_TTL_MS
    if (!Number.isSafeInteger(this.maxRecords) || this.maxRecords < 1 || !Number.isSafeInteger(this.completedTtlMs) || this.completedTtlMs < 1) {
      throw new RangeError('Assessment coordinator bounds must be positive safe integers')
    }
  }

  observeSessionEvent(session: Session, event: SessionEvent, index: ActiveExecutionIndex): AssessmentObservationResult {
    if (!this.active) return 'IGNORED'
    try {
      if (event.type === 'approval/asked') return this.observeAsked(session, event.data.id, event.data.toolName, event.data.callId, index)
      if (event.type === 'approval/decided') return this.observeDecided(session, event.data.id, event.data.outcome)
      return 'IGNORED'
    } catch {
      return 'FAULTED'
    }
  }

  observeSessionDisposed(session: Session): void {
    if (!this.active) return
    try {
      const byId = this.recordsBySession.get(session)
      if (byId === undefined) return
      for (const record of byId.values()) this.records.delete(record)
      byId.clear()
      this.recordsBySession.delete(session)
    } catch {
      // Session disposal is already committed; advisory cleanup cannot veto it.
    }
  }

  dispose(): void {
    if (!this.active) return
    this.active = false
    for (const record of this.records) {
      const session = record.sessionRef.deref()
      if (session !== undefined) this.recordsBySession.get(session)?.delete(record.approvalId)
    }
    this.records.clear()
    this.recordsBySession = new WeakMap()
  }

  getForApproval(session: Session, approvalId: string): AssessmentDiagnostic {
    if (!this.active) return notFoundDiagnostic(session, approvalId)
    const id = safeId(approvalId, true)
    if (id === undefined) return notFoundDiagnostic(session, '')
    const now = this.readClock()
    this.sweep(now)
    const record = this.recordsBySession.get(session)?.get(id)
    return record === undefined ? notFoundDiagnostic(session, id) : diagnosticFrom(record.shell)
  }

  private observeAsked(
    session: Session,
    approvalIdValue: unknown,
    toolNameValue: unknown,
    callIdValue: unknown,
    index: ActiveExecutionIndex,
  ): AssessmentObservationResult {
    const approvalId = safeId(approvalIdValue, true)
    const toolName = safeId(toolNameValue, true)
    if (approvalId === undefined || toolName === undefined) return 'IGNORED'
    let sessionId: string | undefined
    try { sessionId = safeId(session.id, true) } catch { sessionId = undefined }
    if (sessionId === undefined) return 'IGNORED'
    const callId = safeId(callIdValue, true)
    const byId = this.recordsBySession.get(session)
    const existing = byId?.get(approvalId)
    if (existing !== undefined) {
      if (existing.shell.closed) return 'CLOSED'
      if (existing.toolName !== toolName || existing.callId !== callId) {
        this.replaceShell(existing, {
          status: 'unavailable',
          reasonCodes: copyReasons([...existing.shell.reasonCodes, 'CORRELATION_CONFLICT']),
        })
        return 'CONFLICT'
      }
      return 'DUPLICATE'
    }

    const now = this.readClock()
    this.sweep(now)
    if (this.records.size >= this.maxRecords) {
      const oldestClosed = [...this.records].find(record => record.shell.closed)
      if (oldestClosed === undefined) return 'CAPACITY_EXCEEDED'
      this.remove(oldestClosed)
    }

    const lookup = index.lookup(session, callId)
    const bound = lookup.status === 'FOUND'
    const executionId = bound ? lookup.executionId : undefined
    const foundationDiagnostic = executionId === undefined ? undefined : this.foundation.get(executionId)
    const reasons: AssessmentReasonCode[] = ['ASSESSOR_NOT_IMPLEMENTED']
    if (lookup.status !== 'FOUND') reasons.push(lookupReason(lookup))
    if (foundationDiagnostic !== undefined && foundationDiagnostic.status === 'DEGRADED') reasons.push('FOUNDATION_DEGRADED')
    if (foundationDiagnostic !== undefined && foundationDiagnostic.status !== 'CAPTURED' && foundationDiagnostic.status !== 'DEGRADED') reasons.push('FOUNDATION_UNAVAILABLE')
    const assessmentId = bound ? `ra-assessment-${randomUUID()}` : undefined
    const shell = Object.freeze({
      schemaVersion: 1 as const,
      ...assessmentId === undefined ? {} : { assessmentId },
      sessionId,
      approvalId,
      ...executionId === undefined ? {} : { executionId },
      association: bound ? 'BOUND' as const : lookup.status === 'AMBIGUOUS' ? 'AMBIGUOUS' as const : 'UNBOUND' as const,
      status: 'unavailable' as const,
      stage: 'not-started' as const,
      reasonCodes: copyReasons(reasons),
      startedAt: now,
      updatedAt: now,
      closed: false,
    })
    const record: AssessmentRecord = {
      sessionRef: new WeakRef(session),
      approvalId,
      toolName,
      ...callId === undefined ? {} : { callId },
      shell,
    }
    const next = byId ?? new Map<string, AssessmentRecord>()
    next.set(approvalId, record)
    if (byId === undefined) this.recordsBySession.set(session, next)
    this.records.add(record)
    return 'RECORDED'
  }

  private observeDecided(session: Session, approvalIdValue: unknown, outcomeValue: unknown): AssessmentObservationResult {
    const approvalId = safeId(approvalIdValue, true)
    const outcome = outcomeOf(outcomeValue)
    if (approvalId === undefined || outcome === undefined) return 'IGNORED'
    const record = this.recordsBySession.get(session)?.get(approvalId)
    if (record === undefined) return 'IGNORED'
    if (record.shell.closed) return 'CLOSED'
    const now = this.readClock()
    this.replaceShell(record, {
      status: outcome === 'cancelled' ? 'cancelled' : 'unavailable',
      observedOutcome: outcome,
      updatedAt: now,
      closed: true,
      reasonCodes: copyReasons([...record.shell.reasonCodes, 'NATIVE_OUTCOME_OBSERVED']),
    })
    return 'DECIDED'
  }

  private replaceShell(record: AssessmentRecord, patch: Partial<ApprovalAssessmentShell>): void {
    record.shell = Object.freeze({
      ...record.shell,
      ...patch,
      reasonCodes: copyReasons(patch.reasonCodes ?? record.shell.reasonCodes),
    })
  }

  private remove(record: AssessmentRecord): void {
    this.records.delete(record)
    const session = record.sessionRef.deref()
    if (session !== undefined) this.recordsBySession.get(session)?.delete(record.approvalId)
  }

  private readClock(): number {
    try {
      const value = this.clock()
      return Number.isFinite(value) && value >= 0 ? value : 0
    } catch {
      return 0
    }
  }

  private sweep(now: number): void {
    for (const record of this.records) {
      if (record.shell.closed && now - record.shell.updatedAt >= this.completedTtlMs) this.remove(record)
    }
  }
}
