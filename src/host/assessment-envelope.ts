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
import type { RuleDiagnostics } from './rule-engine.ts'
import type { FailureChainDiagnostics } from './retry-escalation.ts'
import type { LedgerDiagnostics } from './ledger.ts'
import type { LlmRuntime } from '@deepseek-ai/dsh-llm'
import { DirectUserRing, ReviewerSeedStore } from './reviewer-seed.ts'
import { buildPhase5Context, type BuiltPhase5Context } from './context-builder.ts'
import {
  createDeterministicAssessment,
  mergeJudgeAssessment,
  type RiskAssessment,
} from './risk-engine.ts'
import {
  executeFastJudge,
  JudgeScheduler,
  normalizeFastJudgeConfig,
  requestedJudgeDimensions,
  resolveReviewerRoute,
  type FastJudgeConfig,
  type NormalizedFastJudgeConfig,
} from './fast-judge.ts'
import { phase6View, type Phase6PresentationSource } from './presentation/presentation-source.ts'
import type { RiskAdvisorBridgeViewV2 } from '../bridge-contract.ts'

export type AssessmentAssociation = 'BOUND' | 'UNBOUND' | 'AMBIGUOUS'
export type AssessmentStatus = 'pending' | 'unavailable' | 'cancelled' | 'not-found'
export type AssessmentStage = 'not-started'
export type Phase5AssessmentStatus = 'COMPLETE' | 'PARTIAL' | 'DEGRADED'
export type Phase5AssessmentStage = 'rules' | 'fast' | 'complete'
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
  | 'JUDGE_DISABLED'
  | 'JUDGE_CONFIG_UNAVAILABLE'
  | 'JUDGE_CAPABILITY_UNAVAILABLE'
  | 'JUDGE_ROUTE_UNAVAILABLE'
  | 'JUDGE_QUEUE_SATURATED'
  | 'JUDGE_TIMEOUT'
  | 'JUDGE_STREAM_ERROR'
  | 'JUDGE_ABORTED'
  | 'JUDGE_INVALID_OUTPUT'
  | 'JUDGE_SUPERSEDED'
  | 'JUDGE_NATIVE_DECISION'
  | 'JUDGE_GENERATION_DISPOSED'
  | 'REDACTION_FAILED'
  | 'CONTEXT_DEGRADED'

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
  readonly lifecycleStatus?: Phase5AssessmentStatus
  readonly lifecycleStage?: Phase5AssessmentStage
  readonly latestAssessmentId?: string
  readonly assessment?: RiskAssessment
}

export interface AssessmentIssueSummary {
  readonly schemaVersion: 1
  readonly orphanDecisions: number
  readonly capacityExceeded: number
  readonly reasonCodes: readonly Extract<AssessmentReasonCode, 'ORPHAN_DECISION' | 'CAPACITY_EXCEEDED'>[]
}

export interface AssessmentBridgeSnapshot {
  readonly sessionId: string
  readonly callId: string
  readonly assessmentId?: string
  readonly association: 'BOUND' | 'UNBOUND'
  readonly status: 'unavailable'
  readonly stage: 'not-started'
  readonly reasonCodes: readonly AssessmentReasonCode[]
  readonly updatedAt: number
}

export type ActiveAssessmentQuery =
  | { readonly kind: 'VIEW'; readonly snapshot: AssessmentBridgeSnapshot }
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'AMBIGUOUS' }

export type OpenAssessmentQuery =
  | { readonly kind: 'VIEW'; readonly snapshot: AssessmentBridgeSnapshot }
  | { readonly kind: 'NOT_FOUND' }

export type Phase6PresentationQuery =
  | { readonly kind: 'VIEW'; readonly view: RiskAdvisorBridgeViewV2 }
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'AMBIGUOUS' }

export interface AssessmentDiagnostics {
  readonly getForApproval: (session: Session, approvalId: string) => AssessmentDiagnostic
  readonly getAssessment: (assessmentId: string) => RiskAssessment | undefined
  readonly getLatestForApproval: (session: Session, approvalId: string) => RiskAssessment | undefined
  readonly getIssueSummary: () => AssessmentIssueSummary
}

export type AssessmentObservationResult =
  | 'IGNORED'
  | 'RECORDED'
  | 'DUPLICATE'
  | 'CONFLICT'
  | 'CLOSED'
  | 'DECIDED'
  | 'ORPHAN_DECISION'
  | 'CAPACITY_EXCEEDED'
  | 'FAULTED'

export interface AssessmentCoordinatorOptions {
  readonly clock?: () => number
  readonly maxRecords?: number
  readonly completedTtlMs?: number
  readonly rules?: RuleDiagnostics
  readonly failureChain?: FailureChainDiagnostics
  readonly ledger?: LedgerDiagnostics
  readonly fastJudge?: FastJudgeConfig
}

interface AssessmentRecord {
  readonly sessionRef: WeakRef<Session>
  readonly approvalId: string
  readonly toolName: string
  readonly callId?: string
  shell: ApprovalAssessmentShell
  phase5: Phase5Record | undefined
}

interface Phase5Record {
  readonly context: BuiltPhase5Context
  readonly a1: RiskAssessment
  latest: RiskAssessment
  readonly generation: number
  attempted: boolean
  closed: boolean
  stage: Phase5AssessmentStage
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

function diagnosticFromRecord(record: AssessmentRecord): AssessmentDiagnostic {
  const base = diagnosticFrom(record.shell)
  if (record.phase5 === undefined) return base
  return Object.freeze({
    ...base,
    lifecycleStatus: record.phase5.latest.status,
    lifecycleStage: record.phase5.stage,
    latestAssessmentId: record.phase5.latest.assessmentId,
    assessment: record.phase5.latest,
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
  private readonly rules: RuleDiagnostics | undefined
  private readonly failureChain: FailureChainDiagnostics | undefined
  private readonly ledger: LedgerDiagnostics | undefined
  private readonly fastJudgeConfig: NormalizedFastJudgeConfig
  private readonly fastJudgeConfigInvalid: boolean
  private readonly seedStore: ReviewerSeedStore
  private readonly userRing = new DirectUserRing()
  private judge: LlmRuntime | undefined
  private scheduler: JudgeScheduler | undefined
  private orphanDecisions = 0
  private capacityExceeded = 0
  private lastClock = 0
  private active = true

  readonly diagnostics: AssessmentDiagnostics = Object.freeze({
    getForApproval: this.getForApproval.bind(this),
    getAssessment: this.getAssessment.bind(this),
    getLatestForApproval: this.getLatestForApproval.bind(this),
    getIssueSummary: this.getIssueSummary.bind(this),
  })

  constructor(foundation: FoundationDiagnostics, options: AssessmentCoordinatorOptions = {}) {
    this.foundation = foundation
    this.clock = options.clock ?? (() => performance.now())
    this.maxRecords = options.maxRecords ?? MAX_RECORDS
    this.completedTtlMs = options.completedTtlMs ?? COMPLETED_TTL_MS
    this.rules = options.rules
    this.failureChain = options.failureChain
    this.ledger = options.ledger
    this.seedStore = new ReviewerSeedStore(this.clock)
    try { this.fastJudgeConfig = normalizeFastJudgeConfig(options.fastJudge); this.fastJudgeConfigInvalid = false } catch { this.fastJudgeConfig = normalizeFastJudgeConfig(undefined); this.fastJudgeConfigInvalid = true }
    if (!Number.isSafeInteger(this.maxRecords) || this.maxRecords < 1 || !Number.isSafeInteger(this.completedTtlMs) || this.completedTtlMs < 1) {
      throw new RangeError('Assessment coordinator bounds must be positive safe integers')
    }
  }

  observeSessionEvent(session: Session, event: SessionEvent, index: ActiveExecutionIndex): AssessmentObservationResult {
    if (!this.active) return 'IGNORED'
    try {
      this.userRing.observe(session, event)
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
      this.userRing.disposeSession(session)
      const byId = this.recordsBySession.get(session)
      if (byId === undefined) return
      for (const record of byId.values()) {
        if (record.phase5 !== undefined) { record.phase5.closed = true; this.scheduler?.cancel(record.approvalId, 'JUDGE_GENERATION_DISPOSED') }
        this.records.delete(record)
      }
      byId.clear()
      this.recordsBySession.delete(session)
    } catch {
      // Session disposal is already committed; advisory cleanup cannot veto it.
    }
  }

  async dispose(): Promise<void> {
    if (!this.active) return
    this.active = false
    const scheduler = this.scheduler
    this.scheduler = undefined
    this.judge = undefined
    this.seedStore.dispose()
    this.userRing.dispose()
    for (const record of this.records) {
      const session = record.sessionRef.deref()
      if (session !== undefined) this.recordsBySession.get(session)?.delete(record.approvalId)
    }
    this.records.clear()
    this.recordsBySession = new WeakMap()
    this.orphanDecisions = 0
    this.capacityExceeded = 0
    if (scheduler !== undefined) await scheduler.dispose()
  }

  getForApproval(session: Session, approvalId: string): AssessmentDiagnostic {
    if (!this.active) return notFoundDiagnostic(session, approvalId)
    const id = safeId(approvalId, true)
    if (id === undefined) return notFoundDiagnostic(session, '')
    const now = this.readClock()
    this.sweep(now)
    const record = this.recordsBySession.get(session)?.get(id)
    return record === undefined ? notFoundDiagnostic(session, id) : diagnosticFromRecord(record)
  }

  getAssessment(assessmentIdValue: string): RiskAssessment | undefined {
    if (!this.active) return undefined
    const id = safeId(assessmentIdValue, true)
    if (id === undefined) return undefined
    this.sweep(this.readClock())
    for (const record of this.records) {
      if (record.phase5?.a1.assessmentId === id || record.phase5?.latest.assessmentId === id) return record.phase5.latest.assessmentId === id ? record.phase5.latest : record.phase5.a1
    }
    return undefined
  }

  getLatestForApproval(session: Session, approvalId: string): RiskAssessment | undefined {
    if (!this.active) return undefined
    const id = safeId(approvalId, true)
    if (id === undefined) return undefined
    return this.recordsBySession.get(session)?.get(id)?.phase5?.latest
  }

  attachJudge(llm: LlmRuntime): void {
    if (!this.active || !this.fastJudgeConfig.enabled) return
    this.judge = llm
    this.scheduler ??= new JudgeScheduler(this.fastJudgeConfig.maxConcurrentJudges, this.fastJudgeConfig.maxPendingJudges)
    for (const record of this.records) this.scheduleJudge(record)
  }

  async detachJudge(): Promise<void> {
    this.judge = undefined
    const scheduler = this.scheduler
    this.scheduler = undefined
    if (scheduler !== undefined) await scheduler.dispose()
  }

  captureReviewerSeed(exec: Parameters<ActiveExecutionIndex['observePreExecute']>[0], executionId: ExecutionId | undefined): void {
    if (this.rules === undefined) return
    try {
      const evaluation = executionId === undefined ? undefined : this.rules.get(executionId)
      if (evaluation !== undefined && executionId !== undefined) this.seedStore.capture(executionId, exec, evaluation)
    } catch {
      // Capture is observational and must not veto the native path.
    }
  }

  getIssueSummary(): AssessmentIssueSummary {
    if (!this.active) return emptyIssueSummary()
    const reasonCodes: AssessmentIssueSummary['reasonCodes'] = [
      ...(this.orphanDecisions > 0 ? ['ORPHAN_DECISION' as const] : []),
      ...(this.capacityExceeded > 0 ? ['CAPACITY_EXCEEDED' as const] : []),
    ]
    return Object.freeze({
      schemaVersion: 1 as const,
      orphanDecisions: this.orphanDecisions,
      capacityExceeded: this.capacityExceeded,
      reasonCodes: Object.freeze(reasonCodes),
    })
  }

  queryActiveForCall(session: Session, callIdValue: unknown): ActiveAssessmentQuery {
    if (!this.active) return { kind: 'NOT_FOUND' }
    const callId = safeId(callIdValue, true)
    if (callId === undefined) return { kind: 'NOT_FOUND' }
    this.sweep(this.readClock())
    const matches = [...this.recordsBySession.get(session)?.values() ?? []]
      .filter(record => record.shell.closed === false && record.callId === callId)
    if (matches.length === 0) return { kind: 'NOT_FOUND' }
    if (matches.length > 1) return { kind: 'AMBIGUOUS' }
    const sessionId = safeId(session.id, true)
    return sessionId === undefined ? { kind: 'NOT_FOUND' } : { kind: 'VIEW', snapshot: bridgeSnapshotFrom(matches[0]!, callId, sessionId) }
  }

  queryOpenByAssessmentId(assessmentIdValue: unknown): OpenAssessmentQuery {
    if (!this.active) return { kind: 'NOT_FOUND' }
    const assessmentId = safeId(assessmentIdValue, true)
    if (assessmentId === undefined) return { kind: 'NOT_FOUND' }
    this.sweep(this.readClock())
    let match: AssessmentRecord | undefined
    let sessionId: string | undefined
    for (const record of this.records) {
      if (record.shell.closed || record.shell.assessmentId !== assessmentId || record.sessionRef.deref() === undefined) continue
      if (match !== undefined) return { kind: 'NOT_FOUND' }
      match = record
      sessionId = safeId(record.sessionRef.deref()!.id, true)
    }
    return match === undefined || sessionId === undefined
      ? { kind: 'NOT_FOUND' }
      : { kind: 'VIEW', snapshot: bridgeSnapshotFrom(match, match.callId!, sessionId) }
  }

  queryActivePresentationForCall(session: Session, callIdValue: unknown): Phase6PresentationQuery {
    if (!this.active) return { kind: 'NOT_FOUND' }
    const callId = safeId(callIdValue, true)
    if (callId === undefined) return { kind: 'NOT_FOUND' }
    this.sweep(this.readClock())
    const matches = [...this.recordsBySession.get(session)?.values() ?? []]
      .filter(record => record.shell.closed === false && record.callId === callId)
    if (matches.length === 0) return { kind: 'NOT_FOUND' }
    if (matches.length > 1) return { kind: 'AMBIGUOUS' }
    return { kind: 'VIEW', view: phase6View(this.presentationSource(matches[0]!, session, callId)) }
  }

  queryOpenPresentationByAssessmentId(assessmentIdValue: unknown): Phase6PresentationQuery {
    if (!this.active) return { kind: 'NOT_FOUND' }
    const assessmentId = safeId(assessmentIdValue, true)
    if (assessmentId === undefined) return { kind: 'NOT_FOUND' }
    this.sweep(this.readClock())
    let match: AssessmentRecord | undefined
    let session: Session | undefined
    for (const record of this.records) {
      const phase5 = record.phase5
      if (record.shell.closed || phase5 === undefined || (phase5.a1.assessmentId !== assessmentId && phase5.latest.assessmentId !== assessmentId)) continue
      if (match !== undefined) return { kind: 'NOT_FOUND' }
      match = record
      session = record.sessionRef.deref()
    }
    if (match === undefined || session === undefined || match.callId === undefined) return { kind: 'NOT_FOUND' }
    return { kind: 'VIEW', view: phase6View(this.presentationSource(match, session, match.callId)) }
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
        this.markConflict(existing)
        return 'CONFLICT'
      }
      return 'DUPLICATE'
    }

    const now = this.readClock()
    this.sweep(now)
    if (this.records.size >= this.maxRecords) {
      const oldestClosed = [...this.records].find(record => record.shell.closed)
      if (oldestClosed === undefined) {
        this.capacityExceeded = incrementBounded(this.capacityExceeded)
        return 'CAPACITY_EXCEEDED'
      }
      this.remove(oldestClosed)
    }

    const lookup = index.lookup(session, callId)
    const bound = lookup.status === 'FOUND'
    const executionId = bound ? lookup.executionId : undefined
    const phase5Bound = bound && executionId !== undefined && this.phase5Available()
    const foundationDiagnostic = executionId === undefined ? undefined : this.foundation.get(executionId)
    const reasons: AssessmentReasonCode[] = phase5Bound ? [] : ['ASSESSOR_NOT_IMPLEMENTED']
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
      phase5: undefined,
    }
    const next = byId ?? new Map<string, AssessmentRecord>()
    next.set(approvalId, record)
    if (byId === undefined) this.recordsBySession.set(session, next)
    this.records.add(record)
    if (phase5Bound && executionId !== undefined) {
      try {
        const built = this.buildPhase5Context(session, executionId)
        const assessment = createDeterministicAssessment(built.snapshot, assessmentId!, now)
        record.phase5 = { context: built, a1: assessment, latest: assessment, generation: 1, attempted: false, closed: false, stage: 'rules' }
        if (built.reviewerFailure !== undefined) this.addReason(record, built.reviewerFailure)
        if (this.fastJudgeConfigInvalid) this.addReason(record, 'JUDGE_CONFIG_UNAVAILABLE')
        else if (!this.fastJudgeConfig.enabled) this.addReason(record, 'JUDGE_DISABLED')
        this.scheduleJudge(record)
      } catch {
        this.addReason(record, 'CONTEXT_DEGRADED')
      }
    }
    return 'RECORDED'
  }

  private observeDecided(session: Session, approvalIdValue: unknown, outcomeValue: unknown): AssessmentObservationResult {
    const approvalId = safeId(approvalIdValue, true)
    const outcome = outcomeOf(outcomeValue)
    if (approvalId === undefined || outcome === undefined) return 'IGNORED'
    const record = this.recordsBySession.get(session)?.get(approvalId)
    if (record === undefined) {
      this.orphanDecisions = incrementBounded(this.orphanDecisions)
      return 'ORPHAN_DECISION'
    }
    if (record.shell.closed) return 'CLOSED'
    const now = this.readClock()
    if (record.phase5 !== undefined) {
      record.phase5.closed = true
      this.scheduler?.cancel(record.approvalId, 'JUDGE_NATIVE_DECISION')
    }
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
      if (Number.isFinite(value) && value >= 0) this.lastClock = Math.max(this.lastClock, value)
    } catch {
      // Keep the last coherent monotonic value when an injected clock faults.
    }
    return this.lastClock
  }

  private markConflict(record: AssessmentRecord): void {
    if (record.phase5 !== undefined) {
      record.phase5.closed = true
      this.scheduler?.cancel(record.approvalId, 'JUDGE_SUPERSEDED')
      record.phase5 = undefined
    }
    const shell = record.shell
    record.shell = Object.freeze({
      schemaVersion: 1 as const,
      sessionId: shell.sessionId,
      approvalId: shell.approvalId,
      association: 'UNBOUND' as const,
      status: 'unavailable' as const,
      stage: 'not-started' as const,
      reasonCodes: copyReasons([...shell.reasonCodes, 'CORRELATION_CONFLICT']),
      startedAt: shell.startedAt,
      updatedAt: Math.max(shell.updatedAt, this.readClock()),
      closed: false,
    })
  }

  private sweep(now: number): void {
    for (const record of this.records) {
      if (record.shell.closed && now - record.shell.updatedAt >= this.completedTtlMs) this.remove(record)
    }
  }

  private phase5Available(): boolean {
    return this.rules !== undefined && this.failureChain !== undefined
  }

  private buildPhase5Context(session: Session, executionId: ExecutionId): BuiltPhase5Context {
    const ruleEvaluation = this.rules!.get(executionId)
    const failureSummary = this.failureChain!.get(executionId)
    const foundation = this.foundation.get(executionId)
    return buildPhase5Context({
      session,
      executionId,
      seed: this.seedStore.get(executionId),
      ruleEvaluation,
      failureSummary,
      foundation,
      userRing: this.userRing,
      ledger: this.ledger,
    })
  }

  private scheduleJudge(record: AssessmentRecord): void {
    const phase5 = record.phase5
    if (phase5 === undefined || phase5.attempted || phase5.closed) return
    if (!this.fastJudgeConfig.enabled) { phase5.stage = 'complete'; return }
    if (this.judge === undefined || this.scheduler === undefined) { phase5.stage = 'complete'; this.addReason(record, 'JUDGE_CAPABILITY_UNAVAILABLE'); return }
    if (phase5.context.payload === undefined || phase5.context.serializedPayload === undefined) {
      this.addReason(record, 'CONTEXT_DEGRADED')
      phase5.attempted = true
      phase5.stage = 'complete'
      return
    }
    if (phase5.latest.status === 'DEGRADED' || phase5.context.snapshot.degraded) {
      this.addReason(record, 'CONTEXT_DEGRADED')
      phase5.attempted = true
      phase5.stage = 'complete'
      return
    }
    phase5.attempted = true
    phase5.stage = 'fast'
    const session = record.sessionRef.deref()
    if (session === undefined) { this.addReason(record, 'JUDGE_GENERATION_DISPOSED'); phase5.stage = 'complete'; return }
    const route = resolveReviewerRoute(this.fastJudgeConfig, session)
    if (route === undefined) { this.addReason(record, 'JUDGE_ROUTE_UNAVAILABLE'); phase5.stage = 'complete'; return }
    const requested = requestedJudgeDimensions(phase5.context, phase5.latest)
    if (requested.length === 0) { phase5.stage = 'complete'; return }
    const generation = phase5.generation
    void this.scheduler.enqueue(record.approvalId, signal => executeFastJudge(this.judge!, route, phase5.context, requested, this.fastJudgeConfig, signal)).then(result => {
      if (!this.active || record.phase5 !== phase5 || phase5.closed || phase5.generation !== generation) return
      if (!result.ok || result.candidate === undefined) {
        if (result.failure !== undefined) this.addReason(record, result.failure)
        phase5.stage = 'complete'
        return
      }
    const latest = mergeJudgeAssessment(phase5.latest, phase5.context.snapshot, {
        dimensions: requested as readonly import('./assessment-aggregator.ts').DimensionName[],
        results: result.candidate.results,
        suggestedAlternatives: result.candidate.suggestedAlternatives,
      }, `ra-assessment-${randomUUID()}`, this.readClock(), route.model)
      phase5.latest = latest
      phase5.stage = 'complete'
      this.replaceShell(record, { updatedAt: this.readClock() })
    })
  }

  private presentationSource(record: AssessmentRecord, session: Session, callId: string): Phase6PresentationSource {
    const phase5 = record.phase5
    const sessionId = safeId(session.id, true) ?? record.shell.sessionId
    if (phase5 === undefined) {
      return {
        sessionId, callId, toolName: record.toolName,
        association: record.shell.association === 'BOUND' ? 'BOUND' : 'UNBOUND',
        ...(record.shell.assessmentId === undefined ? {} : { assessmentId: record.shell.assessmentId }),
        stage: 'rules',
        status: record.shell.status === 'cancelled' ? 'cancelled' : 'unavailable',
        reasonCodes: record.shell.reasonCodes,
        updatedAt: record.shell.updatedAt,
      }
    }
    const latestId = phase5.latest.assessmentId
    const contextReasons = [
      ...(phase5.context.snapshot.historyOmitted ? ['HISTORY_OMITTED' as const] : []),
      ...(phase5.context.snapshot.ledger.health === 'DEGRADED' ? ['CONTEXT_DEGRADED' as const] : []),
      ...phase5.latest.uncertainties.map(item => item.code),
    ]
    return {
      sessionId, callId, toolName: record.toolName,
      association: 'BOUND',
      assessmentId: latestId,
      assessment: phase5.latest,
      ...(phase5.context.snapshot.seed === undefined ? {} : { seed: phase5.context.snapshot.seed }),
      ruleEvaluation: phase5.context.snapshot.ruleEvaluation,
      failureSummary: phase5.context.snapshot.failureSummary,
      stage: phase5.stage,
      status: record.shell.status === 'cancelled' ? 'cancelled' : 'unavailable',
      reasonCodes: [...record.shell.reasonCodes, ...contextReasons],
      updatedAt: Math.max(record.shell.updatedAt, phase5.latest.createdAt),
    }
  }

  private addReason(record: AssessmentRecord, reason: AssessmentReasonCode): void {
    const reasons = [...record.shell.reasonCodes, reason]
    this.replaceShell(record, { reasonCodes: copyReasons(reasons), updatedAt: this.readClock() })
  }
}

function incrementBounded(value: number): number {
  return value >= Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : value + 1
}

function bridgeSnapshotFrom(record: AssessmentRecord, callId: string, sessionId: string): AssessmentBridgeSnapshot {
  const shell = record.shell
  return Object.freeze({
    sessionId,
    callId,
    ...shell.assessmentId === undefined ? {} : { assessmentId: shell.assessmentId },
    association: shell.association === 'BOUND' ? 'BOUND' as const : 'UNBOUND' as const,
    status: 'unavailable' as const,
    stage: 'not-started' as const,
    reasonCodes: Object.freeze([...shell.reasonCodes]),
    updatedAt: shell.updatedAt,
  })
}

function emptyIssueSummary(): AssessmentIssueSummary {
  return Object.freeze({
    schemaVersion: 1 as const,
    orphanDecisions: 0,
    capacityExceeded: 0,
    reasonCodes: Object.freeze([]),
  })
}
