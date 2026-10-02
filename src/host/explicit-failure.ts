import type { PreToolDecision } from '@deepseek-ai/dsh-tools'
import type { ApprovalOutcome } from '@deepseek-ai/dsh-user-approval'
import type {
  LedgerApprovalFact,
  LedgerEvidenceRef,
  LedgerExecutionFact,
  LedgerHealth,
  LedgerIssue,
  LedgerProvenance,
  LedgerTerminalClaim,
} from './ledger.ts'
import type { PtcReplayProjection, PtcReplayOccurrence } from './ptc-replay.ts'

export type TerminalStatus = 'SUCCESS' | 'FAILURE' | 'UNKNOWN'

export type ExplicitFailureKind =
  | 'TOOL_ERROR'
  | 'PRE_EXECUTE_DENIED'
  | 'CANCELLED_BEFORE_DISPATCH'
  | 'CANCELLED_AFTER_DISPATCH'
  | 'GUARDRAIL_DENIED'
  | 'TIMEOUT'
  | 'SANDBOX_DENIED'
  | 'SANDBOX_UNAVAILABLE'
  | 'APPROVAL_REJECTED'
  | 'APPROVAL_CANCELLED'
  | 'APPROVAL_UNAVAILABLE'
  | 'SYSTEM_ERROR'
  | 'SEMANTIC_FAILURE'
  | 'UNKNOWN'

export type EvidenceStrength = 'AUTHORITATIVE' | 'DETERMINISTIC' | 'UNKNOWN'

export interface ExecutionTerminalFact {
  readonly status: TerminalStatus
  readonly provenance: LedgerProvenance
  readonly error?: { readonly name: string; readonly code: string }
  readonly evidence: readonly LedgerEvidenceRef[]
}

export interface ExplicitFailureFact {
  readonly kind: ExplicitFailureKind
  readonly strength: EvidenceStrength
  readonly provenance: LedgerProvenance
  readonly evidence: readonly LedgerEvidenceRef[]
  readonly error?: { readonly name: string; readonly code: string }
}

export interface Phase2ExecutionOutcome {
  readonly terminalStatus: TerminalStatus
  readonly processSuccess?: true | false | 'unknown'
  readonly semanticSuccess: true | false | 'unknown'
  readonly failures: readonly ExplicitFailureFact[]
}

export interface Phase2ExecutionOutcomeRecord {
  readonly sessionId: string
  readonly occurrence: LedgerExecutionFact['occurrence']
  readonly lifecycle: LedgerExecutionFact['lifecycle']
  readonly health: LedgerExecutionFact['health']
  readonly provenance: LedgerProvenance
  readonly source: readonly LedgerEvidenceRef[]
  readonly terminal: ExecutionTerminalFact
  readonly outcome: Phase2ExecutionOutcome
  readonly issueCodes: readonly string[]
}

export interface Phase2ApprovalProjection {
  readonly sessionId: string
  readonly approvalId: string
  readonly toolName?: string
  readonly callId?: string
  readonly lifecycle: LedgerApprovalFact['lifecycle']
  readonly health: LedgerApprovalFact['health']
  readonly provenance: LedgerProvenance
  readonly outcome?: ApprovalOutcome
  readonly binding: LedgerApprovalFact['binding']
  readonly source: readonly LedgerEvidenceRef[]
  readonly issueCodes: readonly string[]
  readonly failure?: ExplicitFailureFact
}

export interface Phase2PtcOutcomeRecord {
  readonly occurrence: PtcReplayOccurrence['occurrence']
  readonly terminal: ExecutionTerminalFact
  readonly outcome: Phase2ExecutionOutcome
}

export interface Phase2PtcProjection {
  readonly status: PtcReplayProjection['status']
  readonly occurrences: readonly Phase2PtcOutcomeRecord[]
}

export interface Phase2LedgerSnapshot {
  readonly sessionId: string
  readonly health: LedgerHealth
  readonly sourceWatermark: number
  readonly sourceComplete: boolean
  readonly truncated: boolean
  readonly issues: readonly LedgerIssue[]
  readonly executions: readonly Phase2ExecutionOutcomeRecord[]
  readonly approvals: readonly Phase2ApprovalProjection[]
  readonly ptc?: Phase2PtcProjection
}

export interface ShellEvidence {
  readonly processSuccess: true | false | 'unknown'
  readonly sandbox?: {
    readonly mode?: string
    readonly denied: boolean
    readonly enforcement?: string
    readonly runnerFailed?: boolean
  }
  readonly failures: readonly ExplicitFailureFact[]
}

export interface GuardDenialTrace {
  readonly effectivePrePolicyAllowed: boolean
  readonly approvalFailure: boolean
  readonly callerCancelled: boolean
  readonly executeObserved: boolean
  readonly postExecuteObserved: boolean
  readonly finalResultFailure: boolean
  readonly evidence: readonly LedgerEvidenceRef[]
}

function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values])
}

function freezeObject<T extends object>(value: T): Readonly<T> {
  return Object.freeze(value)
}

function evidenceOf(claim: LedgerTerminalClaim | undefined): readonly LedgerEvidenceRef[] {
  return claim?.evidence === undefined ? freezeArray([]) : freezeArray([claim.evidence])
}

function strengthOf(provenance: LedgerProvenance): EvidenceStrength {
  return provenance === 'LIVE_FINAL' ? 'AUTHORITATIVE'
    : provenance === 'DURABLE_SOURCE' || provenance === 'CONFIRMATION' || provenance === 'REPLAY_RECOVERED'
      ? 'DETERMINISTIC'
      : 'UNKNOWN'
}

function failure(
  kind: ExplicitFailureKind,
  provenance: LedgerProvenance,
  evidence: readonly LedgerEvidenceRef[],
  error?: { readonly name: string; readonly code: string },
  strength = strengthOf(provenance),
): ExplicitFailureFact {
  return freezeObject({
    kind,
    strength,
    provenance,
    evidence: freezeArray(evidence),
    ...error === undefined ? {} : { error: freezeObject({ name: error.name, code: error.code }) },
  })
}

function terminal(
  status: TerminalStatus,
  provenance: LedgerProvenance,
  evidence: readonly LedgerEvidenceRef[],
  error?: { readonly name: string; readonly code: string },
): ExecutionTerminalFact {
  return freezeObject({
    status,
    provenance,
    evidence: freezeArray(evidence),
    ...error === undefined ? {} : { error: freezeObject({ name: error.name, code: error.code }) },
  })
}

function outcome(
  terminalStatus: TerminalStatus,
  failures: readonly ExplicitFailureFact[],
  processSuccess?: true | false | 'unknown',
): Phase2ExecutionOutcome {
  return freezeObject({
    terminalStatus,
    semanticSuccess: 'unknown' as const,
    ...processSuccess === undefined ? {} : { processSuccess },
    failures: freezeArray(failures),
  })
}

function failureKindForCode(code: string | undefined): ExplicitFailureKind {
  switch (code) {
    case 'TOOL_TIMEOUT': return 'TIMEOUT'
    case 'ABORTED_BEFORE_DISPATCH': return 'CANCELLED_BEFORE_DISPATCH'
    case 'ABORTED': return 'CANCELLED_AFTER_DISPATCH'
    case 'SANDBOX_UNAVAILABLE': return 'SANDBOX_UNAVAILABLE'
    default: return 'TOOL_ERROR'
  }
}

/** Classify one bounded terminal claim without interpreting model-facing content. */
export function projectTerminalClaim(claim: LedgerTerminalClaim): {
  readonly terminal: ExecutionTerminalFact
  readonly outcome: Phase2ExecutionOutcome
} {
  const evidence = evidenceOf(claim)
  const terminalStatus: TerminalStatus = claim.isError ? 'FAILURE' : 'SUCCESS'
  const failures = claim.isError
    ? [failure(failureKindForCode(claim.error?.code), claim.provenance, evidence, claim.error)]
    : []
  return freezeObject({
    terminal: terminal(terminalStatus, claim.provenance, evidence, claim.error),
    outcome: outcome(terminalStatus, failures),
  })
}

/** Conflicting claims are retained as UNKNOWN; no terminal winner is selected. */
export function projectTerminalClaims(claims: readonly LedgerTerminalClaim[]): {
  readonly terminal: ExecutionTerminalFact
  readonly outcome: Phase2ExecutionOutcome
} {
  if (claims.length === 1) return projectTerminalClaim(claims[0]!)
  if (claims.length === 0) {
    return freezeObject({
      terminal: terminal('UNKNOWN', 'UNKNOWN', []),
      outcome: outcome('UNKNOWN', []),
    })
  }
  const evidence = claims.flatMap(claim => claim.evidence === undefined ? [] : [claim.evidence])
  return freezeObject({
    terminal: terminal('UNKNOWN', 'UNKNOWN', evidence),
    outcome: outcome('UNKNOWN', [failure('UNKNOWN', 'UNKNOWN', evidence, undefined, 'UNKNOWN')]),
  })
}

/**
 * Promote a pre-execute decision only when the caller supplies an effective
 * final-decision witness. A local waterfall `next()` result is not that witness.
 */
export function projectPreExecuteDecision(
  decision: PreToolDecision,
  witness?: { readonly effective: true; readonly evidence: readonly LedgerEvidenceRef[]; readonly provenance?: LedgerProvenance },
): ExplicitFailureFact | undefined {
  if (witness?.effective !== true) return undefined
  const provenance = witness.provenance ?? 'LIVE_FINAL'
  const kind: ExplicitFailureKind = decision.kind === 'deny'
    ? 'PRE_EXECUTE_DENIED'
    : decision.kind === 'cancel'
      ? 'CANCELLED_BEFORE_DISPATCH'
      : 'UNKNOWN'
  if (kind === 'UNKNOWN') return undefined
  const error = decision.kind === 'deny' && decision.info !== undefined
    && typeof decision.info.name === 'string' && typeof decision.info.code === 'string'
    ? { name: decision.info.name, code: decision.info.code }
    : undefined
  return failure(kind, provenance, witness.evidence, error)
}

/** The general guard-returned path stays partial unless every public witness exists. */
export function projectGuardReturnedDenial(trace: GuardDenialTrace): ExplicitFailureFact | undefined {
  if (!trace.effectivePrePolicyAllowed
    || trace.approvalFailure
    || trace.callerCancelled
    || trace.executeObserved
    || !trace.postExecuteObserved
    || !trace.finalResultFailure) return undefined
  return failure('GUARDRAIL_DENIED', 'DURABLE_SOURCE', trace.evidence, undefined, 'DETERMINISTIC')
}

export function projectApprovalOutcome(
  approval: LedgerApprovalFact,
): ExplicitFailureFact | undefined {
  const kind = approval.outcome === 'rejected' ? 'APPROVAL_REJECTED'
    : approval.outcome === 'cancelled' ? 'APPROVAL_CANCELLED'
      : approval.outcome === 'unavailable' ? 'APPROVAL_UNAVAILABLE'
        : undefined
  return kind === undefined
    ? undefined
    : failure(kind, approval.provenance, approval.source)
}

/**
 * Strict adapter for the pinned bash/pwsh foreground DTO. It reads no output
 * fields and never looks at stderr or exception text.
 */
export function projectShellResult(
  toolName: string,
  value: unknown,
  evidence: readonly LedgerEvidenceRef[],
): { readonly evidence: ShellEvidence; readonly failures: readonly ExplicitFailureFact[] } | undefined {
  if (toolName !== 'bash' && toolName !== 'pwsh') return undefined
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const candidate = value as Record<string, unknown>
  if (candidate.kind !== 'foreground' || !('exitCode' in candidate)) return undefined
  const exitCode = candidate.exitCode
  const processSuccess: true | false | 'unknown' = exitCode === null
    ? 'unknown'
    : typeof exitCode === 'number' && Number.isSafeInteger(exitCode)
      ? exitCode === 0
      : 'unknown'
  const rawSandbox = candidate.sandbox
  let sandbox: ShellEvidence['sandbox'] | undefined
  const failures: ExplicitFailureFact[] = []
  if (rawSandbox !== undefined) {
    if (typeof rawSandbox !== 'object' || rawSandbox === null || Array.isArray(rawSandbox)) return undefined
    const sandboxValue = rawSandbox as Record<string, unknown>
    if (typeof sandboxValue.denied !== 'boolean') return undefined
    if (sandboxValue.mode !== undefined
      && (typeof sandboxValue.mode !== 'string' || !['read-only', 'workspace-write', 'danger-full-access'].includes(sandboxValue.mode))) return undefined
    if (sandboxValue.enforcement !== undefined
      && (typeof sandboxValue.enforcement !== 'string' || !['full', 'partial'].includes(sandboxValue.enforcement))) return undefined
    if (sandboxValue.runnerFailed !== undefined && typeof sandboxValue.runnerFailed !== 'boolean') return undefined
    sandbox = {
      ...sandboxValue.mode === undefined ? {} : { mode: sandboxValue.mode },
      denied: sandboxValue.denied,
      ...sandboxValue.enforcement === undefined ? {} : { enforcement: sandboxValue.enforcement },
      ...sandboxValue.runnerFailed === undefined ? {} : { runnerFailed: sandboxValue.runnerFailed },
    }
    if (sandbox.runnerFailed === true) failures.push(failure('SANDBOX_UNAVAILABLE', 'LIVE_FINAL', evidence))
    else if (sandbox.denied) failures.push(failure('SANDBOX_DENIED', 'LIVE_FINAL', evidence))
  }
  return freezeObject({
    evidence: freezeObject({ processSuccess, ...sandbox === undefined ? {} : { sandbox }, failures: freezeArray(failures) }),
    failures: freezeArray(failures),
  })
}

export function projectPtcProjection(ptc: PtcReplayProjection): Phase2PtcProjection {
  const occurrences = ptc.occurrences.map(item => {
    if (item.settlement.status !== 'PAIRED') {
      return freezeObject({
        occurrence: item.occurrence,
        terminal: terminal('UNKNOWN', 'REPLAY_RECOVERED', []),
        outcome: outcome('UNKNOWN', []),
      })
    }
    const evidence = item.settlement.basis.map(ref => freezeObject({
      seq: ref.seq,
      type: ref.type,
      provenance: 'REPLAY_RECOVERED' as const,
    }))
    const terminalStatus: TerminalStatus = item.settlement.isError ? 'FAILURE' : 'SUCCESS'
    const failures = item.settlement.isError
      ? [failure('TOOL_ERROR', 'REPLAY_RECOVERED', evidence, undefined, 'DETERMINISTIC')]
      : []
    return freezeObject({
      occurrence: item.occurrence,
      terminal: terminal(terminalStatus, 'REPLAY_RECOVERED', evidence),
      outcome: outcome(terminalStatus, failures),
    })
  })
  return freezeObject({ status: ptc.status, occurrences: freezeArray(occurrences) })
}

export function makePhase2ApprovalProjection(approval: LedgerApprovalFact): Phase2ApprovalProjection {
  const projected = projectApprovalOutcome(approval)
  return freezeObject({
    sessionId: approval.sessionId,
    approvalId: approval.approvalId,
    ...approval.toolName === undefined ? {} : { toolName: approval.toolName },
    ...approval.callId === undefined ? {} : { callId: approval.callId },
    lifecycle: approval.lifecycle,
    health: approval.health,
    provenance: approval.provenance,
    ...approval.outcome === undefined ? {} : { outcome: approval.outcome },
    binding: approval.binding,
    source: freezeArray(approval.source),
    issueCodes: freezeArray(approval.issueCodes),
    ...projected === undefined ? {} : { failure: projected },
  })
}
