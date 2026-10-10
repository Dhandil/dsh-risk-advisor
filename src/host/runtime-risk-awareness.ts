import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { platform as runtimePlatform } from 'node:os'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ExecutionId } from './correlation.ts'
import type { FoundationDiagnostic, FoundationDiagnostics } from './operation-foundation.ts'
import type { RuleDiagnostics, RuleEvaluation } from './rule-engine.ts'
import type { FailureChainDiagnostics, FailureChainSummary } from './retry-escalation.ts'
import type { LedgerDiagnostics } from './ledger.ts'
import { DirectUserRing, ReviewerSeedStore } from './reviewer-seed.ts'
import { buildLocalPhase5Context, buildReviewerPayload } from './context-builder.ts'
import type { BuiltPhase5Context, LocalPhase5Context } from './context-builder.ts'
import { createDeterministicAssessment } from './risk-engine.ts'
import type { RiskAssessment } from './risk-engine.ts'
import type { RuntimeRiskAwarenessViewV1, RuntimeRiskReasonCodeV1 } from '../bridge-contract.ts'
import { normalizeExperiencePlatform, normalizeExperienceToolName } from './experience-schema.ts'
import { patternIdentityForOperation } from './pattern-schema.ts'
import type { ExpectedEffectRegistry } from './expected-effect.ts'

const MAX_RECORDS = 256
const MAX_QUEUED = 64
const MAX_SNAPSHOT_CHARS = 24_000
const RECORD_TTL_MS = 10 * 60 * 1000
const SETTLED_VIEW_TTL_MS = 30 * 1000
const IDENTIFIER_LIMIT = 256

type BaseState = 'CAPTURED' | 'SCORING' | 'BASE_READY' | 'UNAVAILABLE'

interface RuntimeRecord {
  readonly sessionRef: WeakRef<Session>
  readonly sessionId: string
  readonly executionId: ExecutionId
  readonly assessmentId: string
  readonly historicalPatternId?: string
  readonly callId?: string
  readonly capturedAt: number
  updatedAt: number
  state: BaseState
  reasonCodes: RuntimeRiskReasonCodeV1[]
  local?: LocalPhase5Context
  ruleEvaluation?: RuleEvaluation
  failureSummary?: FailureChainSummary
  foundation?: FoundationDiagnostic
  assessment?: RiskAssessment
  approvalOwned: boolean
  settledAt?: number
  expiresAt: number
  queued: boolean
  cancelDeferred?: () => void
}

export type RuntimeRiskAssessmentQuery =
  | { readonly kind: 'VIEW'; readonly view: Omit<RuntimeRiskAwarenessViewV1, 'assessment' | 'kind'>; readonly assessment?: RiskAssessment }
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'UNAVAILABLE'; readonly reasonCodes: readonly RuntimeRiskReasonCodeV1[] }

export type RuntimeRiskApprovalBase =
  | { readonly kind: 'ABSENT' }
  | { readonly kind: 'UNAVAILABLE'; readonly assessmentId?: string; readonly reasonCodes: readonly RuntimeRiskReasonCodeV1[] }
  | { readonly kind: 'READY'; readonly assessmentId: string; readonly assessment: RiskAssessment; readonly context: BuiltPhase5Context }

export interface RuntimeRiskAwarenessOptions {
  readonly clock?: () => number
  readonly maxRecords?: number
  readonly maxQueued?: number
  readonly schedule?: (callback: () => void) => () => void
  readonly expectedEffects?: ExpectedEffectRegistry
}

/**
 * One process-local pre-execution snapshot and deterministic A1 per exact
 * (Session identity, ExecutionId). All methods are observational and advisory-only.
 */
export class RuntimeRiskAwarenessRuntime {
  readonly seedStore: ReviewerSeedStore
  readonly userRing = new DirectUserRing()
  private readonly records = new Set<RuntimeRecord>()
  private readonly recordsBySession = new WeakMap<Session, Map<ExecutionId, RuntimeRecord>>()
  private latestBySession = new WeakMap<Session, RuntimeRecord>()
  private unavailableBySession = new WeakMap<Session, { readonly executionId: ExecutionId; readonly updatedAt: number; readonly expiresAt: number; readonly reasonCodes: readonly RuntimeRiskReasonCodeV1[] }>()
  private readonly clock: () => number
  private readonly maxRecords: number
  private readonly maxQueued: number
  private readonly schedule: (callback: () => void) => () => void
  private readonly expectedEffects: ExpectedEffectRegistry | undefined
  private queued = 0
  private lastClock = 0
  private active = true

  constructor(
    private readonly foundation: FoundationDiagnostics,
    private readonly rules: RuleDiagnostics | undefined,
    private readonly failureChain: FailureChainDiagnostics | undefined,
    private readonly ledger: LedgerDiagnostics | undefined,
    options: RuntimeRiskAwarenessOptions = {},
  ) {
    this.clock = options.clock ?? (() => performance.now())
    this.maxRecords = options.maxRecords ?? MAX_RECORDS
    this.maxQueued = options.maxQueued ?? MAX_QUEUED
    this.schedule = options.schedule ?? (callback => {
      const handle = setImmediate(callback)
      return () => clearImmediate(handle)
    })
    this.expectedEffects = options.expectedEffects
    if (!Number.isSafeInteger(this.maxRecords) || this.maxRecords < 1
      || !Number.isSafeInteger(this.maxQueued) || this.maxQueued < 0) {
      throw new RangeError('Runtime risk bounds must be non-negative safe integers')
    }
    this.seedStore = new ReviewerSeedStore(() => this.readClock())
  }

  /** Called exactly once in the existing capture hook, after Rule Engine capture. */
  capturePreExecute(exec: ToolExecution, executionId: ExecutionId | undefined): void {
    if (!this.active || executionId === undefined) return
    let session: Session | undefined
    try {
      const candidate = exec.agent?.session
      if (candidate !== null && typeof candidate === 'object') session = candidate
    } catch { return }
    if (session === undefined) return

    const now = this.readClock()
    this.sweep(now)
    const sessionId = safeIdentifier(readSessionId(session))
    if (sessionId === undefined) {
      this.markUnavailable(session, executionId, now, 'SNAPSHOT_UNAVAILABLE')
      return
    }

    const existing = this.recordsBySession.get(session)?.get(executionId)
    if (existing !== undefined) return

    // This map selects the one ordinary UI row; older per-execution records
    // remain indexed until settlement, TTL, disposal, or permitted eviction.
    if (!this.makeRoom(now)) {
      this.latestBySession.delete(session)
      this.markUnavailable(session, executionId, now, 'CAPACITY_EXCEEDED')
      return
    }

    const ruleEvaluation = this.safeRuleEvaluation(executionId)
    if (ruleEvaluation !== undefined) {
      try { this.seedStore.capture(executionId, exec, ruleEvaluation) } catch { /* bounded seed is advisory */ }
    }
    const historicalPatternId = this.preExecutionPatternId(exec, session, executionId, ruleEvaluation)
    let callId: string | undefined
    try { callId = safeIdentifier(exec.callId) } catch { /* correlation may be unavailable */ }
    const record: RuntimeRecord = {
      sessionRef: new WeakRef(session),
      sessionId,
      executionId,
      assessmentId: `ra-assessment-${randomUUID()}`,
      ...(historicalPatternId === undefined ? {} : { historicalPatternId }),
      ...(callId === undefined ? {} : { callId }),
      capturedAt: now,
      updatedAt: now,
      state: 'CAPTURED',
      reasonCodes: [],
      approvalOwned: false,
      expiresAt: now + RECORD_TTL_MS,
      queued: false,
    }
    this.setRecord(session, record)
    this.latestBySession.set(session, record)
    this.unavailableBySession.delete(session)

    if (this.rules === undefined || this.failureChain === undefined || ruleEvaluation === undefined) {
      this.failRecord(record, 'SNAPSHOT_UNAVAILABLE')
      return
    }
    try {
      const failureSummary = this.failureChain.get(executionId)
      const foundation = this.foundation.get(executionId)
      const local = buildLocalPhase5Context({
        session,
        executionId,
        seed: this.seedStore.get(executionId),
        ruleEvaluation,
        failureSummary,
        foundation,
        userRing: this.userRing,
        ledger: this.ledger,
      })
      if (JSON.stringify(local.snapshot).length > MAX_SNAPSHOT_CHARS) {
        this.failRecord(record, 'CONTEXT_DEGRADED')
        return
      }
      record.local = local
      record.ruleEvaluation = ruleEvaluation
      record.failureSummary = failureSummary
      record.foundation = foundation
      if (local.snapshot.degraded || local.snapshot.ledger.health === 'DEGRADED') this.addReason(record, 'CONTEXT_DEGRADED')
    } catch {
      this.failRecord(record, 'SNAPSHOT_UNAVAILABLE')
      return
    }

    if (this.queued >= this.maxQueued) {
      this.failRecord(record, 'CAPACITY_EXCEEDED')
      return
    }
    record.queued = true
    this.queued += 1
    try {
      record.cancelDeferred = this.schedule(() => {
        record.queued = false
        delete record.cancelDeferred
        this.queued = Math.max(0, this.queued - 1)
        const recordSession = record.sessionRef.deref()
        if (!this.active || recordSession === undefined || this.recordsBySession.get(recordSession)?.get(executionId) !== record || record.approvalOwned) return
        this.scoreOnce(record)
      })
    } catch {
      record.queued = false
      this.queued = Math.max(0, this.queued - 1)
      this.failRecord(record, 'ASSESSMENT_UNAVAILABLE')
    }
  }

  /** Claims the existing base for Native Approval at its existing observation boundary. */
  claimForApproval(session: Session, executionId: ExecutionId): RuntimeRiskApprovalBase {
    if (!this.active) return { kind: 'ABSENT' }
    const record = this.recordsBySession.get(session)?.get(executionId)
    if (record === undefined || record.sessionRef.deref() !== session) {
      const unavailable = this.unavailableBySession.get(session)
      return unavailable?.executionId === executionId
        ? { kind: 'UNAVAILABLE', reasonCodes: unavailable.reasonCodes }
        : { kind: 'ABSENT' }
    }
    const now = this.readClock()
    if (!record.approvalOwned) record.expiresAt = now + RECORD_TTL_MS
    record.approvalOwned = true
    record.updatedAt = now
    if (record.state === 'CAPTURED') {
      this.cancelQueued(record)
      this.scoreOnce(record)
    }
    if (record.state !== 'BASE_READY' || record.assessment === undefined || record.local === undefined
      || record.ruleEvaluation === undefined || record.failureSummary === undefined) {
      return { kind: 'UNAVAILABLE', assessmentId: record.assessmentId, reasonCodes: Object.freeze([...record.reasonCodes]) }
    }
    try {
      const reviewer = buildReviewerPayload({
        session,
        executionId,
        seed: record.local.snapshot.seed,
        ruleEvaluation: record.ruleEvaluation,
        failureSummary: record.failureSummary,
        ...(record.foundation === undefined ? {} : { foundation: record.foundation }),
        userRing: this.userRing,
        ledger: this.ledger,
      }, record.local)
      return { kind: 'READY', assessmentId: record.assessmentId, assessment: record.assessment, context: Object.freeze({ snapshot: record.local.snapshot, ...reviewer }) }
    } catch {
      return { kind: 'READY', assessmentId: record.assessmentId, assessment: record.assessment, context: Object.freeze({ snapshot: record.local.snapshot, reviewerFailure: 'CONTEXT_DEGRADED' as const }) }
    }
  }

  /** Close and scrub the protected process-local base at native decision. */
  releaseApproval(session: Session, executionId: ExecutionId | undefined): void {
    if (executionId === undefined) return
    const record = this.recordsBySession.get(session)?.get(executionId)
    if (record === undefined || record.sessionRef.deref() !== session || !record.approvalOwned) return
    this.remove(record)
  }

  observeResult(exec: ToolExecution, executionId: ExecutionId | undefined): void {
    if (!this.active || executionId === undefined) return
    let session: Session | undefined
    try { session = exec.agent?.session } catch { return }
    if (session === undefined) return
    const record = this.recordsBySession.get(session)?.get(executionId)
    if (record === undefined || record.sessionRef.deref() !== session) return
    const now = this.readClock()
    record.settledAt = now
    record.updatedAt = now
    if (!record.approvalOwned) {
      record.expiresAt = Math.min(record.expiresAt, now + SETTLED_VIEW_TTL_MS)
      this.seedStore.remove(executionId)
      if (record.state === 'BASE_READY' || record.state === 'UNAVAILABLE') this.clearContext(record)
    }
  }

  query(session: Session): RuntimeRiskAssessmentQuery {
    if (!this.active) return { kind: 'NOT_FOUND' }
    const now = this.readClock()
    this.sweep(now)
    let unavailable = this.unavailableBySession.get(session)
    if (unavailable !== undefined && unavailable.expiresAt <= now) {
      this.unavailableBySession.delete(session)
      unavailable = undefined
    }
    const record = this.latestBySession.get(session)
    if (unavailable !== undefined && (record === undefined || unavailable.updatedAt >= record.capturedAt)) {
      return { kind: 'UNAVAILABLE', reasonCodes: unavailable.reasonCodes }
    }
    if (record === undefined || record.sessionRef.deref() !== session || record.approvalOwned) return { kind: 'NOT_FOUND' }
    const assessment = record.assessment
    const status = assessment === undefined
      ? record.state === 'UNAVAILABLE' || record.reasonCodes.length > 0 ? 'DEGRADED' as const : 'PENDING' as const
      : assessment.status === 'COMPLETE' ? 'READY' as const : 'DEGRADED' as const
    const stage: RuntimeRiskAwarenessViewV1['stage'] = record.state === 'BASE_READY' || record.state === 'UNAVAILABLE'
      ? 'COMPLETE'
      : record.state === 'SCORING' ? 'SCORING' : 'CAPTURED'
    const view: Omit<RuntimeRiskAwarenessViewV1, 'assessment' | 'kind'> = Object.freeze({
      schemaVersion: 1,
      sessionId: record.sessionId,
      executionId: record.executionId,
      ...(record.callId === undefined ? {} : { callId: record.callId }),
      assessmentId: record.assessmentId,
      timing: 'PRE_EXECUTION_EVIDENCE',
      status,
      stage,
      capturedAt: record.capturedAt,
      updatedAt: record.updatedAt,
      reasonCodes: Object.freeze([...record.reasonCodes].slice(0, 4)),
    })
    return { kind: 'VIEW', view, ...(assessment === undefined ? {} : { assessment }) }
  }

  /** Exact opaque Pattern match for the one current ordinary row; never a history query. */
  currentHistoricalPatternId(session: Session, executionId: ExecutionId, assessmentId: string): string | undefined {
    if (!this.active) return undefined
    const now = this.readClock()
    this.sweep(now)
    const record = this.recordsBySession.get(session)?.get(executionId)
    if (record === undefined || record.sessionRef.deref() !== session
      || record.sessionId !== safeIdentifier(readSessionId(session))
      || this.latestBySession.get(session) !== record
      || record.assessmentId !== assessmentId
      || record.approvalOwned
      || record.state === 'UNAVAILABLE'
      || record.expiresAt <= now) return undefined
    return record.historicalPatternId
  }

  /** Host-private exact capture handoff for Phase 14.4; it never queries history or changes either existing accessor. */
  capturedPreExecuteHistoricalPatternId(session: Session, executionId: ExecutionId): string | undefined {
    if (!this.active) return undefined
    const record = this.recordsBySession.get(session)?.get(executionId)
    if (record === undefined || record.sessionRef.deref() !== session || record.executionId !== executionId
      || record.sessionId !== safeIdentifier(readSessionId(session))) return undefined
    const patternId = record.historicalPatternId
    return typeof patternId === 'string' && /^ra-pattern-v1_[a-f0-9]{64}$/.test(patternId) ? patternId : undefined
  }

  /** Approval-only projection of the pre-execute Pattern identity; ordinary history semantics stay unchanged. */
  currentApprovalHistoricalPatternId(session: Session, executionId: ExecutionId, baseAssessmentId: string): string | undefined {
    if (!this.active) return undefined
    const now = this.readClock()
    this.sweep(now)
    const record = this.recordsBySession.get(session)?.get(executionId)
    if (record === undefined || record.sessionRef.deref() !== session
      || record.sessionId !== safeIdentifier(readSessionId(session))
      || record.executionId !== executionId
      || record.assessmentId !== baseAssessmentId
      || !record.approvalOwned
      || record.state !== 'BASE_READY'
      || record.expiresAt <= now) return undefined
    const patternId = record.historicalPatternId
    return typeof patternId === 'string' && /^ra-pattern-v1_[a-f0-9]{64}$/.test(patternId) ? patternId : undefined
  }

  disposeSession(session: Session): void {
    this.userRing.disposeSession(session)
    const records = this.recordsBySession.get(session)
    if (records !== undefined) for (const record of [...records.values()]) this.remove(record)
    this.recordsBySession.delete(session)
    this.latestBySession.delete(session)
    this.unavailableBySession.delete(session)
  }

  dispose(): void {
    if (!this.active) return
    this.active = false
    for (const record of [...this.records]) this.remove(record)
    this.records.clear()
    this.latestBySession = new WeakMap()
    this.unavailableBySession = new WeakMap()
    this.queued = 0
    this.seedStore.dispose()
    this.userRing.dispose()
  }

  private scoreOnce(record: RuntimeRecord): void {
    if (!this.active || record.state === 'BASE_READY' || record.state === 'UNAVAILABLE' || record.state === 'SCORING') return
    const session = record.sessionRef.deref()
    if (session === undefined || this.recordsBySession.get(session)?.get(record.executionId) !== record || record.local === undefined) {
      this.failRecord(record, 'ASSESSMENT_UNAVAILABLE')
      return
    }
    record.state = 'SCORING'
    record.updatedAt = this.readClock()
    try {
      record.assessment = createDeterministicAssessment(record.local.snapshot, record.assessmentId, record.updatedAt)
      record.state = 'BASE_READY'
      record.updatedAt = this.readClock()
      if (record.settledAt !== undefined && !record.approvalOwned) this.clearContext(record)
    } catch {
      this.failRecord(record, 'ASSESSMENT_UNAVAILABLE')
    }
  }

  private safeRuleEvaluation(executionId: ExecutionId): RuleEvaluation | undefined {
    try { return this.rules?.get(executionId) } catch { return undefined }
  }

  private preExecutionPatternId(
    exec: ToolExecution,
    session: Session,
    executionId: ExecutionId,
    evaluation: RuleEvaluation | undefined,
  ): string | undefined {
    if (this.expectedEffects === undefined || evaluation === undefined
      || evaluation.executionId !== executionId || evaluation.rulesetVersion !== 'phase4-v1'
      || evaluation.status !== 'READY') return undefined
    let identity: ReturnType<ExpectedEffectRegistry['peekIdentity']>
    try { identity = this.expectedEffects.peekIdentity(exec, executionId, session) } catch { return undefined }
    if (identity === undefined) return undefined
    try {
      return patternIdentityForOperation({
        platform: normalizeExperiencePlatform(runtimePlatform()),
        toolName: normalizeExperienceToolName(exec.name),
        kind: evaluation.operationKind,
        parserConfidence: evaluation.parserConfidence,
        mutating: evaluation.mutating,
        externalEffect: evaluation.externalEffect,
        networkEffect: evaluation.networkEffect,
        ...(evaluation.requestedPermission === undefined ? {} : { requestedPermission: evaluation.requestedPermission }),
      }, identity)
    } catch { return undefined }
  }

  private failRecord(record: RuntimeRecord, reason: RuntimeRiskReasonCodeV1): void {
    this.cancelQueued(record)
    record.state = 'UNAVAILABLE'
    record.updatedAt = this.readClock()
    this.addReason(record, reason)
    this.clearContext(record)
  }

  private addReason(record: RuntimeRecord, reason: RuntimeRiskReasonCodeV1): void {
    if (!record.reasonCodes.includes(reason) && record.reasonCodes.length < 4) record.reasonCodes.push(reason)
  }

  private markUnavailable(session: Session, executionId: ExecutionId, updatedAt: number, reason: RuntimeRiskReasonCodeV1): void {
    this.unavailableBySession.set(session, { executionId, updatedAt, expiresAt: updatedAt + RECORD_TTL_MS, reasonCodes: Object.freeze([reason]) })
  }

  private cancelQueued(record: RuntimeRecord): void {
    if (!record.queued) return
    record.cancelDeferred?.()
    delete record.cancelDeferred
    record.queued = false
    this.queued = Math.max(0, this.queued - 1)
  }

  private clearContext(record: RuntimeRecord): void {
    delete record.local
    delete record.ruleEvaluation
    delete record.failureSummary
    delete record.foundation
  }

  private setRecord(session: Session, record: RuntimeRecord): void {
    const byExecution = this.recordsBySession.get(session) ?? new Map<ExecutionId, RuntimeRecord>()
    byExecution.set(record.executionId, record)
    this.recordsBySession.set(session, byExecution)
    this.records.add(record)
  }

  private makeRoom(now: number): boolean {
    if (this.records.size < this.maxRecords) return true
    const candidate = [...this.records]
      .filter(record => !record.approvalOwned && record.state !== 'CAPTURED' && record.state !== 'SCORING'
        && (record.settledAt !== undefined || record.expiresAt <= now))
      .sort((a, b) => a.capturedAt - b.capturedAt)[0]
    if (candidate === undefined) return false
    this.remove(candidate)
    return true
  }

  private sweep(now: number): void {
    for (const record of [...this.records]) if (record.expiresAt <= now) this.remove(record)
  }

  private remove(record: RuntimeRecord): void {
    this.cancelQueued(record)
    this.clearContext(record)
    delete record.assessment
    this.seedStore.remove(record.executionId)
    const session = record.sessionRef.deref()
    if (session !== undefined) {
      const byExecution = this.recordsBySession.get(session)
      byExecution?.delete(record.executionId)
      if (byExecution?.size === 0) this.recordsBySession.delete(session)
      if (this.latestBySession.get(session) === record) this.latestBySession.delete(session)
    }
    this.records.delete(record)
  }

  private readClock(): number {
    try {
      const value = this.clock()
      if (Number.isFinite(value) && value >= 0) this.lastClock = Math.max(this.lastClock, value)
    } catch { /* retain the last coherent monotonic value */ }
    return this.lastClock
  }
}

function safeIdentifier(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= IDENTIFIER_LIMIT ? value : undefined
}

function readSessionId(session: Session): unknown {
  try { return session.id } catch { return undefined }
}
