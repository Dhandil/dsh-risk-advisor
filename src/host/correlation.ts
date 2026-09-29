import { randomUUID } from 'node:crypto'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type {
  PreToolDecision,
  ToolExecution,
  ToolExecutionResult,
  ToolExecutionToken,
} from '@deepseek-ai/dsh-tools'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'

/** Risk Advisor's private, per-observed-traversal identity. */
export type ExecutionId = string

export type NotFoundReason =
  | 'MISSING_CALL_ID'
  | 'MISSING_SCOPE_IDENTITY'
  | 'NO_ACTIVE_EXECUTION'
  | 'RUNTIME_STATE_LOST'
  | 'OBSERVATION_UNAVAILABLE'

export type ActiveExecutionLookup =
  | { readonly status: 'FOUND'; readonly executionId: ExecutionId }
  | { readonly status: 'NOT_FOUND'; readonly reason: NotFoundReason }
  | { readonly status: 'AMBIGUOUS'; readonly executionIds: readonly ExecutionId[] }

/** Read-only diagnostic surface exposed through the Host Context. */
export interface CorrelationDiagnostics {
  readonly lookup: (session: Session | undefined, callId: string | undefined) => ActiveExecutionLookup
  readonly snapshotObservations: () => readonly CorrelationObservation[]
}

export interface CorrelationObservation {
  readonly approvalId: string
  readonly sessionId: string
  readonly toolName: string
  readonly callId?: string
  readonly lookup: ActiveExecutionLookup
  /** The original lookup retained when a later contradiction fail-closes `lookup`. */
  readonly recordedLookup?: ActiveExecutionLookup
  readonly decidedOutcome?: ApprovalOutcome
  readonly closed: boolean
  /** True when a repeated approval id carried contradictory data. */
  readonly conflict: boolean
}

interface ActiveRecord {
  readonly executionId: ExecutionId
  readonly session?: Session
  readonly sessionId?: string
  readonly toolName: string
  readonly callId?: string
  readonly rootCallId?: string
  readonly parentExecutionId?: ExecutionId
  readonly token: ToolExecutionToken
}

interface ObservationState {
  readonly session: Session
  readonly approvalId: string
  readonly sessionId: string
  readonly toolName: string
  readonly callId?: string
  readonly lookup: ActiveExecutionLookup
  decidedOutcome?: ApprovalOutcome
  closed: boolean
  conflict: boolean
}

const MAX_RETAINED_OBSERVATIONS = 256

function found(executionId: ExecutionId): ActiveExecutionLookup {
  return Object.freeze({ status: 'FOUND', executionId })
}

function notFound(reason: NotFoundReason): ActiveExecutionLookup {
  return Object.freeze({ status: 'NOT_FOUND', reason })
}

function ambiguous(executionIds: readonly ExecutionId[]): ActiveExecutionLookup {
  return Object.freeze({
    status: 'AMBIGUOUS',
    executionIds: Object.freeze([...executionIds]),
  })
}

function copyLookup(lookup: ActiveExecutionLookup): ActiveExecutionLookup {
  switch (lookup.status) {
    case 'FOUND': return found(lookup.executionId)
    case 'NOT_FOUND': return notFound(lookup.reason)
    case 'AMBIGUOUS': return ambiguous(lookup.executionIds)
  }
}

const OBSERVATION_CONFLICT_LOOKUP = notFound('OBSERVATION_UNAVAILABLE')

function idOf(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function sameOptional(a: string | undefined, b: string | undefined): boolean {
  return a === b
}

/**
 * Exact same-process live execution index for the Host R2 slice.
 *
 * The index deliberately has no durable-history reader and no authorization
 * role. It only records bounded identity metadata and sanitized observations.
 */
export class ActiveExecutionIndex {
  private activeBySession = new WeakMap<Session, Map<string, Set<ActiveRecord>>>()
  private executions = new WeakMap<ToolExecution, ActiveRecord>()
  private executionByToken = new Map<ToolExecutionToken, ExecutionId>()
  private activeRecords = new Set<ActiveRecord>()
  private observationsBySession = new WeakMap<Session, Map<string, ObservationState>>()
  private observations = new Set<ObservationState>()
  private active = true

  /** Capture one actual pre-execute traversal before delegating. */
  observePreExecute(exec: ToolExecution): ExecutionId | undefined {
    if (!this.active) return undefined
    const prior = this.executions.get(exec)
    if (prior !== undefined) return prior.executionId

    try {
      const session = exec.agent?.session
      // UUID makes the public identity opaque and prevents reuse across
      // independently mounted generations (including HMR/disposal boundaries).
      const executionId = `ra-execution-${randomUUID()}`
      const parentExecutionId = exec.parent === undefined
        ? undefined
        : this.executionByToken.get(exec.parent)
      const callId = idOf(exec.callId)
      const rootCallId = idOf(exec.rootCallId)
      const record: ActiveRecord = {
        executionId,
        ...session === undefined ? {} : { session },
        ...session === undefined ? {} : { sessionId: String(session.id) },
        toolName: exec.name,
        ...callId === undefined ? {} : { callId },
        ...rootCallId === undefined ? {} : { rootCallId },
        ...parentExecutionId === undefined ? {} : { parentExecutionId },
        token: exec.token,
      }
      this.executions.set(exec, record)
      this.executionByToken.set(exec.token, executionId)
      this.activeRecords.add(record)
      if (session !== undefined && record.callId !== undefined) {
        let calls = this.activeBySession.get(session)
        if (calls === undefined) {
          calls = new Map()
          this.activeBySession.set(session, calls)
        }
        let members = calls.get(record.callId)
        if (members === undefined) {
          members = new Set()
          calls.set(record.callId, members)
        }
        members.add(record)
      }
      return executionId
    } catch {
      // Observation failure must never change the native pre-execute chain.
      return undefined
    }
  }

  /**
   * Adapter for the native waterfall. `next` is called exactly once and its
   * returned decision is passed through unchanged.
   */
  observePreExecuteAndContinue(
    exec: ToolExecution,
    next: () => Promise<PreToolDecision>,
  ): Promise<PreToolDecision> {
    this.observePreExecute(exec)
    return next()
  }

  /** Remove only the exact execution registered at pre-execute. */
  observeResult(exec: Readonly<ToolExecution>, _result: Readonly<ToolExecutionResult>): void {
    if (!this.active) return
    const record = this.executions.get(exec)
    if (record === undefined) return
    this.executions.delete(exec)
    this.activeRecords.delete(record)
    if (this.executionByToken.get(record.token) === record.executionId) {
      this.executionByToken.delete(record.token)
    }
    if (record.session === undefined || record.callId === undefined) return
    const calls = this.activeBySession.get(record.session)
    const members = calls?.get(record.callId)
    if (members === undefined) return
    members.delete(record)
    if (members.size === 0) calls?.delete(record.callId)
  }

  /** Resolve only the currently active exact Session/callId bucket. */
  lookup(session: Session | undefined, callId: string | undefined): ActiveExecutionLookup {
    if (callId === undefined) return notFound('MISSING_CALL_ID')
    if (session === undefined) return notFound('MISSING_SCOPE_IDENTITY')
    if (!this.active) return notFound('RUNTIME_STATE_LOST')
    const members = this.activeBySession.get(session)?.get(callId)
    if (members === undefined || members.size === 0) {
      return notFound('NO_ACTIVE_EXECUTION')
    }
    const executionIds = [...members].map(member => member.executionId)
    if (executionIds.length !== 1) {
      return ambiguous(executionIds)
    }
    return found(executionIds[0]!)
  }

  /** Consume a committed Session event without appending or throwing. */
  observeSessionEvent(session: Session, event: SessionEvent): void {
    if (!this.active) return
    try {
      if (event.type === 'approval/asked') {
        this.observeAsked(session, event.data.id, event.data.toolName, idOf(event.data.callId))
      } else if (event.type === 'approval/decided') {
        this.observeDecided(session, event.data.id, event.data.outcome)
      }
    } catch {
      // Session observers are observational. Native append has already committed.
    }
  }

  /** Read sanitized observations only; Session objects and arguments never escape. */
  snapshotObservations(): readonly CorrelationObservation[] {
    return Object.freeze([...this.observations].map((observation) => {
      const recordedLookup = copyLookup(observation.lookup)
      const lookup = observation.conflict
        ? copyLookup(OBSERVATION_CONFLICT_LOOKUP)
        : copyLookup(observation.lookup)
      return Object.freeze({
        approvalId: observation.approvalId,
        sessionId: observation.sessionId,
        toolName: observation.toolName,
        ...observation.callId === undefined ? {} : { callId: observation.callId },
        lookup,
        ...observation.conflict ? { recordedLookup } : {},
        ...observation.decidedOutcome === undefined ? {} : { decidedOutcome: observation.decidedOutcome },
        closed: observation.closed,
        conflict: observation.conflict,
      })
    }))
  }

  /** Drop all runtime state and deactivate this generation. */
  dispose(): void {
    if (!this.active) return
    this.active = false
    this.activeRecords.clear()
    this.executionByToken.clear()
    this.observations.clear()
    this.activeBySession = new WeakMap()
    this.executions = new WeakMap()
    this.observationsBySession = new WeakMap()
  }

  private observeAsked(session: Session, approvalIdValue: unknown, toolName: string, callId?: string): void {
    const approvalId = idOf(approvalIdValue)
    if (approvalId === undefined) return
    const existing = this.observationsBySession.get(session)?.get(approvalId)
    if (existing !== undefined) {
      if (existing.toolName !== toolName || !sameOptional(existing.callId, callId)) existing.conflict = true
      return
    }
    this.retainObservationCapacity()
    const observation: ObservationState = {
      session,
      approvalId,
      sessionId: String(session.id),
      toolName,
      ...callId === undefined ? {} : { callId },
      lookup: this.lookup(session, callId),
      closed: false,
      conflict: false,
    }
    let byId = this.observationsBySession.get(session)
    if (byId === undefined) {
      byId = new Map()
      this.observationsBySession.set(session, byId)
    }
    byId.set(approvalId, observation)
    this.observations.add(observation)
  }

  private observeDecided(session: Session, approvalIdValue: unknown, outcome: ApprovalOutcome): void {
    const approvalId = idOf(approvalIdValue)
    if (approvalId === undefined) return
    const observation = this.observationsBySession.get(session)?.get(approvalId)
    if (observation === undefined) return
    if (observation.decidedOutcome !== undefined && observation.decidedOutcome !== outcome) {
      observation.conflict = true
      return
    }
    observation.decidedOutcome = outcome
    observation.closed = true
  }

  private retainObservationCapacity(): void {
    while (this.observations.size >= MAX_RETAINED_OBSERVATIONS) {
      const oldest = this.observations.values().next().value as ObservationState | undefined
      if (oldest === undefined) return
      this.observations.delete(oldest)
      this.observationsBySession.get(oldest.session)?.delete(oldest.approvalId)
    }
  }
}

/** Bind only immutable/sanitized reads; mutation and lifecycle stay private. */
export function createCorrelationDiagnostics(index: ActiveExecutionIndex): CorrelationDiagnostics {
  return Object.freeze({
    lookup: index.lookup.bind(index),
    snapshotObservations: index.snapshotObservations.bind(index),
  })
}
