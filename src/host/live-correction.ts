import { createHash } from 'node:crypto'
import type { Session } from '@deepseek-ai/dsh-session'
import type { ToolExecution } from '@deepseek-ai/dsh-tools'
import type { ExecutionId } from './correlation.ts'
import type { FailureChainSummary } from './retry-escalation.ts'
import type { VerificationRecordV1 } from './verification-store.ts'

export const LIVE_CORRECTION_TTL_MS = 5 * 60 * 1000
export const MAX_CORRECTION_PER_SESSION = 64
export const MAX_CORRECTION_GLOBAL = 256
export const MAX_EXECUTION_ASSOCIATIONS = 512
const MAX_CONFLICT_TOMBSTONES = 256

export type LiveCorrectionFindingKind =
  | 'REPEATED_FAILURE_WITHOUT_PROGRESS'
  | 'POSTCONDITION_NOT_SATISFIED'

export type LiveCorrectionDiagnosisCode =
  | 'REPEATED_SAME_SIGNATURE_FAILURE'
  | 'VERIFIED_POSTCONDITION_MISMATCH'

export type LiveCorrectionAdvisoryCode =
  | 'STOP_EXACT_RETRY_PATH_V1'
  | 'INSPECT_UNSATISFIED_POSTCONDITION_V1'

export interface LiveCorrectionFindingV1 {
  readonly schemaVersion: 1
  readonly findingId: string
  readonly executionId: string
  readonly kind: LiveCorrectionFindingKind
  readonly diagnosis: LiveCorrectionDiagnosisCode
  readonly disposition: 'ADVISE'
  readonly advisoryCode: LiveCorrectionAdvisoryCode
  readonly observedAt: number
  readonly retryCount?: number
  readonly recentFailureCount?: number
  readonly verifierSource?: 'tool-contract' | 'known-adapter'
  readonly verifierAdapterId?: string
  readonly evidenceQuality?: 'high' | 'medium'
}

export interface LiveCorrectionSessionView {
  readonly findings: readonly LiveCorrectionFindingV1[]
  readonly truncated: boolean
}

export interface LiveCorrectionDiagnostics {
  readonly get: (findingId: string) => LiveCorrectionFindingV1 | undefined
  readonly forExecution: (executionId: ExecutionId) => readonly LiveCorrectionFindingV1[]
  readonly forSession: (session: Session) => LiveCorrectionSessionView
  readonly render: (findingId: string) => string | undefined
}

interface SessionState {
  readonly findingIds: Set<string>
  readonly executionIds: Set<ExecutionId>
  truncated: boolean
}

interface StoredFinding {
  readonly finding: LiveCorrectionFindingV1
  readonly session: Session
  readonly createdAt: number
}

interface ExecutionAssociation {
  readonly session: Session
  readonly createdAt: number
}

export interface LiveCorrectionOptions {
  readonly clock?: () => number
  readonly ttlMs?: number
  readonly maxPerSession?: number
  readonly maxGlobal?: number
  readonly maxAssociations?: number
}

const F1_TEXT = 'The same operation is repeatedly failing with the same normalized failure signature. Stop repeating this exact retry path and inspect the underlying cause before trying again.'
const F2_TEXT = 'The operation completed, but the verified expected postcondition was not satisfied. Do not treat this execution as goal completion; inspect the target state before continuing.'

const SUPPORTED_F2 = new Set([
  'tool-contract:tool.write.v1',
  'tool-contract:tool.edit.v1',
  'known-adapter:shell.mkdir.v1',
  'known-adapter:shell.copy-file.v1',
  'known-adapter:git.branch-switch.v1',
  'known-adapter:package.node-resolve.v1',
])

function freezeFinding(value: LiveCorrectionFindingV1): LiveCorrectionFindingV1 {
  return Object.freeze({ ...value })
}

function sameFinding(a: LiveCorrectionFindingV1, b: LiveCorrectionFindingV1): boolean {
  const { observedAt: _aObservedAt, ...aSemantic } = a
  const { observedAt: _bObservedAt, ...bSemantic } = b
  return JSON.stringify(aSemantic) === JSON.stringify(bSemantic)
}

function assertFindingShape(finding: LiveCorrectionFindingV1): void {
  if (!Number.isFinite(finding.observedAt) || finding.observedAt < 0
    || finding.findingId !== liveCorrectionFindingId(finding.executionId, finding.kind)
    || finding.disposition !== 'ADVISE') {
    throw new Error('invalid-live-correction-finding')
  }
  if (finding.kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS') {
    if (finding.diagnosis !== 'REPEATED_SAME_SIGNATURE_FAILURE'
      || finding.advisoryCode !== 'STOP_EXACT_RETRY_PATH_V1'
      || !Number.isSafeInteger(finding.retryCount) || finding.retryCount! < 1
      || !Number.isSafeInteger(finding.recentFailureCount) || finding.recentFailureCount! < 2
      || finding.verifierSource !== undefined
      || finding.verifierAdapterId !== undefined
      || finding.evidenceQuality !== undefined) {
      throw new Error('invalid-live-correction-f1')
    }
    return
  }
  if (finding.diagnosis !== 'VERIFIED_POSTCONDITION_MISMATCH'
    || finding.advisoryCode !== 'INSPECT_UNSATISFIED_POSTCONDITION_V1'
    || finding.retryCount !== undefined
    || finding.recentFailureCount !== undefined
    || finding.verifierSource === undefined
    || finding.verifierAdapterId === undefined
    || (finding.evidenceQuality !== 'high' && finding.evidenceQuality !== 'medium')
    || !SUPPORTED_F2.has(`${finding.verifierSource}:${finding.verifierAdapterId}`)) {
    throw new Error('invalid-live-correction-f2')
  }
}

export function liveCorrectionFindingId(executionId: string, kind: LiveCorrectionFindingKind): string {
  const tuple = JSON.stringify(['risk-advisor-live-correction-v1', executionId, kind])
  return `ra-correction-v1_${createHash('sha256').update(tuple, 'utf8').digest('hex')}`
}

/** Deterministic process-local Phase 12.1 advisory Finding core. */
export class LiveCorrectionRuntime {
  private readonly clock: () => number
  private readonly ttlMs: number
  private readonly maxPerSession: number
  private readonly maxGlobal: number
  private readonly maxAssociations: number
  private readonly findings = new Map<string, StoredFinding>()
  private readonly associations = new Map<ExecutionId, ExecutionAssociation>()
  private readonly executionFindings = new Map<ExecutionId, Set<string>>()
  private readonly sessions = new WeakMap<Session, SessionState>()
  /** Generation-terminal F2 verifier/identity conflict tombstones. */
  private readonly conflicted = new Set<string>()
  /** F1 identity conflicts live only as long as their bounded Finding payload. */
  private readonly conflictedF1 = new Set<string>()
  private f2ConflictSaturated = false
  private active = true

  readonly diagnostics: LiveCorrectionDiagnostics = Object.freeze({
    get: (findingId: string) => this.getFinding(findingId),
    forExecution: (executionId: ExecutionId) => this.findingsForExecution(executionId),
    forSession: (session: Session) => this.findingsForSession(session),
    render: (findingId: string) => this.renderFinding(findingId),
  })

  constructor(options: LiveCorrectionOptions = {}) {
    this.clock = options.clock ?? (() => Date.now())
    this.ttlMs = options.ttlMs ?? LIVE_CORRECTION_TTL_MS
    this.maxPerSession = options.maxPerSession ?? MAX_CORRECTION_PER_SESSION
    this.maxGlobal = options.maxGlobal ?? MAX_CORRECTION_GLOBAL
    this.maxAssociations = options.maxAssociations ?? MAX_EXECUTION_ASSOCIATIONS
    if (![this.ttlMs, this.maxPerSession, this.maxGlobal, this.maxAssociations].every(value => Number.isSafeInteger(value) && value > 0)) {
      throw new RangeError('Live correction bounds must be positive safe integers')
    }
    if (this.maxPerSession > MAX_CORRECTION_PER_SESSION
      || this.maxGlobal > MAX_CORRECTION_GLOBAL
      || this.maxAssociations > MAX_EXECUTION_ASSOCIATIONS) {
      throw new RangeError('Live correction bounds exceed frozen limits')
    }
  }

  observeSettledResult(
    exec: Readonly<ToolExecution>,
    executionId: ExecutionId | undefined,
    summary: FailureChainSummary | undefined,
  ): void {
    if (!this.active || executionId === undefined) return
    const session = this.sessionOf(exec)
    if (session === undefined) return
    const now = this.clock()
    this.sweep(now)
    this.associate(executionId, session, now)
    if (summary === undefined) return
    if (summary.executionId !== executionId
      || summary.status !== 'READY'
      || summary.truncated
      || summary.retryOf === undefined
      || summary.retryCount < 1
      || summary.recentFailureCount < 2
      || summary.sameRootCause !== true) return
    this.insert(session, freezeFinding({
      schemaVersion: 1,
      findingId: liveCorrectionFindingId(executionId, 'REPEATED_FAILURE_WITHOUT_PROGRESS'),
      executionId,
      kind: 'REPEATED_FAILURE_WITHOUT_PROGRESS',
      diagnosis: 'REPEATED_SAME_SIGNATURE_FAILURE',
      disposition: 'ADVISE',
      advisoryCode: 'STOP_EXACT_RETRY_PATH_V1',
      observedAt: now,
      retryCount: summary.retryCount,
      recentFailureCount: summary.recentFailureCount,
    }), now)
  }

  observeVerification(record: VerificationRecordV1): void {
    if (!this.active) return
    const now = this.clock()
    this.sweep(now)
    const findingId = liveCorrectionFindingId(record.executionId, 'POSTCONDITION_NOT_SATISFIED')
    if (record.status === 'UNKNOWN' && record.reasonCodes.includes('VERIFICATION_CONFLICT')) {
      this.recordF2Conflict(findingId)
      this.dropAssociation(record.executionId)
      return
    }
    const association = this.associations.get(record.executionId)
    if (association === undefined) return
    if (record.status !== 'MISMATCHED'
      || record.semanticSuccess !== false
      || (record.evidenceQuality !== 'high' && record.evidenceQuality !== 'medium')
      || !record.reasonCodes.includes('POSTCONDITION_MISMATCH')
      || !SUPPORTED_F2.has(`${record.source}:${record.adapterId}`)) return
    this.insert(association.session, freezeFinding({
      schemaVersion: 1,
      findingId,
      executionId: record.executionId,
      kind: 'POSTCONDITION_NOT_SATISFIED',
      diagnosis: 'VERIFIED_POSTCONDITION_MISMATCH',
      disposition: 'ADVISE',
      advisoryCode: 'INSPECT_UNSATISFIED_POSTCONDITION_V1',
      observedAt: record.observedAt,
      verifierSource: record.source,
      verifierAdapterId: record.adapterId,
      evidenceQuality: record.evidenceQuality,
    }), now)
  }

  disposeSession(session: Session): void {
    if (!this.active) return
    const state = this.sessions.get(session)
    if (state === undefined) return
    for (const findingId of [...state.findingIds]) this.deleteFinding(findingId)
    for (const executionId of [...state.executionIds]) this.associations.delete(executionId)
    this.sessions.delete(session)
  }

  dispose(): void {
    if (!this.active) return
    this.active = false
    this.findings.clear()
    this.associations.clear()
    this.executionFindings.clear()
    this.conflicted.clear()
    this.conflictedF1.clear()
    this.f2ConflictSaturated = false
  }

  private sessionOf(exec: Readonly<ToolExecution>): Session | undefined {
    try {
      return exec.agent?.session
    } catch {
      return undefined
    }
  }

  private stateFor(session: Session): SessionState {
    let state = this.sessions.get(session)
    if (state === undefined) {
      state = { findingIds: new Set(), executionIds: new Set(), truncated: false }
      this.sessions.set(session, state)
    }
    return state
  }

  private associate(executionId: ExecutionId, session: Session, createdAt: number): void {
    const existing = this.associations.get(executionId)
    if (existing !== undefined) {
      if (existing.session === session) return
      this.associations.delete(executionId)
      this.stateFor(existing.session).executionIds.delete(executionId)
      return
    }
    while (this.associations.size >= this.maxAssociations) {
      const oldest = this.associations.keys().next().value as ExecutionId | undefined
      if (oldest === undefined) break
      const item = this.associations.get(oldest)
      this.associations.delete(oldest)
      if (item !== undefined) {
        const state = this.stateFor(item.session)
        state.executionIds.delete(oldest)
        state.truncated = true
      }
    }
    this.associations.set(executionId, { session, createdAt })
    this.stateFor(session).executionIds.add(executionId)
  }

  private insert(session: Session, finding: LiveCorrectionFindingV1, createdAt: number): void {
    assertFindingShape(finding)
    const isF2 = finding.kind === 'POSTCONDITION_NOT_SATISFIED'
    if (isF2 && (this.f2ConflictSaturated || this.conflicted.has(finding.findingId))) return
    if (!isF2 && this.conflictedF1.has(finding.findingId)) return
    const prior = this.findings.get(finding.findingId)
    if (prior !== undefined) {
      if (sameFinding(prior.finding, finding)) return
      if (isF2) {
        this.recordF2Conflict(finding.findingId)
        this.dropAssociation(finding.executionId)
      } else {
        this.conflictedF1.add(finding.findingId)
      }
      return
    }
    const state = this.stateFor(session)
    while (state.findingIds.size >= this.maxPerSession) {
      const oldest = state.findingIds.values().next().value as string | undefined
      if (oldest === undefined) break
      this.deleteFinding(oldest)
      state.truncated = true
    }
    while (this.findings.size >= this.maxGlobal) {
      const oldest = this.findings.keys().next().value as string | undefined
      if (oldest === undefined) break
      const owner = this.findings.get(oldest)?.session
      this.deleteFinding(oldest)
      if (owner !== undefined) this.stateFor(owner).truncated = true
    }
    this.findings.set(finding.findingId, { finding, session, createdAt })
    state.findingIds.add(finding.findingId)
    const ids = this.executionFindings.get(finding.executionId) ?? new Set<string>()
    ids.add(finding.findingId)
    this.executionFindings.set(finding.executionId, ids)
  }

  private dropAssociation(executionId: ExecutionId): void {
    const association = this.associations.get(executionId)
    if (association === undefined) return
    this.associations.delete(executionId)
    this.sessions.get(association.session)?.executionIds.delete(executionId)
  }

  private recordF2Conflict(findingId: string): void {
    if (this.f2ConflictSaturated || this.conflicted.has(findingId)) return
    if (this.conflicted.size >= MAX_CONFLICT_TOMBSTONES) {
      this.f2ConflictSaturated = true
      this.conflicted.clear()
      return
    }
    this.conflicted.add(findingId)
  }

  private isFindingSuppressed(findingId: string): boolean {
    if (this.conflicted.has(findingId) || this.conflictedF1.has(findingId)) return true
    return this.f2ConflictSaturated
      && this.findings.get(findingId)?.finding.kind === 'POSTCONDITION_NOT_SATISFIED'
  }

  private deleteFinding(findingId: string): void {
    const stored = this.findings.get(findingId)
    if (stored === undefined) return
    this.findings.delete(findingId)
    if (stored.finding.kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS') this.conflictedF1.delete(findingId)
    this.stateFor(stored.session).findingIds.delete(findingId)
    const ids = this.executionFindings.get(stored.finding.executionId)
    ids?.delete(findingId)
    if (ids?.size === 0) this.executionFindings.delete(stored.finding.executionId)
  }

  private sweep(now: number): void {
    for (const [findingId, stored] of [...this.findings]) {
      if (now - stored.createdAt >= this.ttlMs) this.deleteFinding(findingId)
    }
    for (const [executionId, association] of [...this.associations]) {
      if (now - association.createdAt >= this.ttlMs) {
        this.associations.delete(executionId)
        this.sessions.get(association.session)?.executionIds.delete(executionId)
      }
    }
  }

  private getFinding(findingId: string): LiveCorrectionFindingV1 | undefined {
    if (!this.active) return undefined
    this.sweep(this.clock())
    if (this.isFindingSuppressed(findingId)) return undefined
    return this.findings.get(findingId)?.finding
  }

  private findingsForExecution(executionId: ExecutionId): readonly LiveCorrectionFindingV1[] {
    if (!this.active) return Object.freeze([])
    this.sweep(this.clock())
    const ids = this.executionFindings.get(executionId)
    if (ids === undefined) return Object.freeze([])
    return Object.freeze([...ids]
      .filter(id => !this.isFindingSuppressed(id))
      .map(id => this.findings.get(id)?.finding)
      .filter((item): item is LiveCorrectionFindingV1 => item !== undefined))
  }

  private findingsForSession(session: Session): LiveCorrectionSessionView {
    if (!this.active) return Object.freeze({ findings: Object.freeze([]), truncated: false })
    this.sweep(this.clock())
    const state = this.sessions.get(session)
    if (state === undefined) return Object.freeze({ findings: Object.freeze([]), truncated: false })
    const findings = [...state.findingIds]
      .filter(id => !this.isFindingSuppressed(id))
      .map(id => this.findings.get(id)?.finding)
      .filter((item): item is LiveCorrectionFindingV1 => item !== undefined)
    return Object.freeze({ findings: Object.freeze(findings), truncated: state.truncated })
  }

  private renderFinding(findingId: string): string | undefined {
    const finding = this.getFinding(findingId)
    if (finding === undefined) return undefined
    return finding.kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS' ? F1_TEXT : F2_TEXT
  }
}
