import type { FailureChainSummary } from '../retry-escalation.ts'
import type { ReviewerOperationSeed } from '../reviewer-seed.ts'
import type { RuleEvaluation } from '../rule-engine.ts'
import type { RiskAssessment } from '../risk-engine.ts'
import type { BrowserSafeReasonCodeV2, BrowserSafeReasonCodeV3, RiskAdvisorBridgeViewV2, RiskAdvisorBridgeViewV3 } from '../../bridge-contract.ts'
import type { EvidenceSnapshotV1 } from '../evidence-types.ts'
import { presentFailureContext } from './failure-context-presenter.ts'
import { presentOperation } from './operation-presenter.ts'
import { presentRiskAssessment } from './risk-assessment-presenter.ts'

export interface Phase6PresentationSource {
  readonly sessionId: string
  readonly callId: string
  readonly toolName: string
  readonly association: 'BOUND' | 'UNBOUND'
  readonly assessmentId?: string
  readonly assessment?: RiskAssessment
  readonly seed?: ReviewerOperationSeed
  readonly ruleEvaluation?: RuleEvaluation
  readonly failureSummary?: FailureChainSummary
  readonly stage: 'rules' | 'fast' | 'evidence' | 'complete'
  readonly status: 'pending' | 'unavailable' | 'cancelled'
  readonly reasonCodes: readonly string[]
  readonly updatedAt: number
  readonly evidence?: EvidenceSnapshotV1
}

const REASONS: Readonly<Record<string, BrowserSafeReasonCodeV3>> = {
  FOUNDATION_DEGRADED: 'FOUNDATION_DEGRADED', FOUNDATION_UNAVAILABLE: 'FOUNDATION_UNAVAILABLE',
  MISSING_CALL_ID: 'MISSING_CALL_ID', MISSING_SCOPE_IDENTITY: 'MISSING_SCOPE_IDENTITY',
  NO_ACTIVE_EXECUTION: 'NO_ACTIVE_EXECUTION', RUNTIME_STATE_LOST: 'RUNTIME_STATE_LOST',
  OBSERVATION_UNAVAILABLE: 'OBSERVATION_UNAVAILABLE', AMBIGUOUS_EXECUTION: 'AMBIGUOUS_EXECUTION',
  CORRELATION_CONFLICT: 'CORRELATION_CONFLICT', CONTEXT_DEGRADED: 'CONTEXT_DEGRADED',
  REDACTION_FAILED: 'REDACTION_FAILED', HISTORY_OMITTED: 'HISTORY_OMITTED',
  CANONICAL_TARGETS_UNAVAILABLE: 'CANONICAL_TARGETS_UNAVAILABLE', RECOVERY_EVIDENCE_UNAVAILABLE: 'RECOVERY_EVIDENCE_UNAVAILABLE',
  JUDGE_DISABLED: 'JUDGE_DISABLED', JUDGE_CONFIG_UNAVAILABLE: 'JUDGE_CONFIG_UNAVAILABLE',
  JUDGE_CAPABILITY_UNAVAILABLE: 'JUDGE_CAPABILITY_UNAVAILABLE', JUDGE_ROUTE_UNAVAILABLE: 'JUDGE_ROUTE_UNAVAILABLE',
  JUDGE_QUEUE_SATURATED: 'JUDGE_QUEUE_SATURATED', JUDGE_TIMEOUT: 'JUDGE_TIMEOUT',
  JUDGE_STREAM_ERROR: 'JUDGE_STREAM_ERROR', JUDGE_ABORTED: 'JUDGE_ABORTED',
  JUDGE_INVALID_OUTPUT: 'JUDGE_INVALID_OUTPUT', NATIVE_OUTCOME_OBSERVED: 'NATIVE_OUTCOME_OBSERVED',
  ASSESSMENT_UNAVAILABLE: 'ASSESSMENT_UNAVAILABLE',
  EVIDENCE_CAPABILITY_UNAVAILABLE: 'EVIDENCE_CAPABILITY_UNAVAILABLE', EVIDENCE_PENDING: 'EVIDENCE_PENDING', EVIDENCE_COLLECTION_DEGRADED: 'EVIDENCE_COLLECTION_DEGRADED',
  EVIDENCE_OUTSIDE_WORKSPACE: 'EVIDENCE_OUTSIDE_WORKSPACE', EVIDENCE_PATH_ALIAS: 'EVIDENCE_PATH_ALIAS', PACKAGE_LIFECYCLE_SCRIPTS_PRESENT: 'PACKAGE_LIFECYCLE_SCRIPTS_PRESENT',
}

export function phase6View(source: Phase6PresentationSource): RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3 {
  const v3 = source.stage === 'evidence' || source.evidence !== undefined
  const mappedReasons = [...new Set(source.reasonCodes.map(reason => REASONS[reason]).filter((reason): reason is BrowserSafeReasonCodeV3 => reason !== undefined))].slice(0, 24)
  const reasonCodes = v3 ? mappedReasons : mappedReasons.filter((reason): reason is BrowserSafeReasonCodeV2 => (['FOUNDATION_DEGRADED', 'FOUNDATION_UNAVAILABLE', 'MISSING_CALL_ID', 'MISSING_SCOPE_IDENTITY', 'NO_ACTIVE_EXECUTION', 'RUNTIME_STATE_LOST', 'OBSERVATION_UNAVAILABLE', 'AMBIGUOUS_EXECUTION', 'CORRELATION_CONFLICT', 'CONTEXT_DEGRADED', 'REDACTION_FAILED', 'HISTORY_OMITTED', 'CANONICAL_TARGETS_UNAVAILABLE', 'RECOVERY_EVIDENCE_UNAVAILABLE', 'JUDGE_DISABLED', 'JUDGE_CONFIG_UNAVAILABLE', 'JUDGE_CAPABILITY_UNAVAILABLE', 'JUDGE_ROUTE_UNAVAILABLE', 'JUDGE_QUEUE_SATURATED', 'JUDGE_TIMEOUT', 'JUDGE_STREAM_ERROR', 'JUDGE_ABORTED', 'JUDGE_INVALID_OUTPUT', 'NATIVE_OUTCOME_OBSERVED', 'ASSESSMENT_UNAVAILABLE'] as readonly string[]).includes(reason))
  if (source.assessment !== undefined && source.ruleEvaluation !== undefined && source.failureSummary !== undefined && source.association === 'BOUND' && source.assessmentId !== undefined) {
    try {
      const evidence = source.evidence
      const view = {
        schemaVersion: v3 ? 3 as const : 2 as const,
        sessionId: source.sessionId,
        callId: source.callId,
        assessmentId: source.assessmentId,
        association: 'BOUND',
        status: 'ready',
        stage: source.stage,
        operation: presentOperation(source.toolName, source.seed, source.ruleEvaluation),
        assessment: presentRiskAssessment(source.assessment),
        failureContext: presentFailureContext(source.failureSummary),
        reasonCodes: reasonCodes as BrowserSafeReasonCodeV2[] | BrowserSafeReasonCodeV3[],
        ...(evidence === undefined ? {} : { evidence: { status: evidence.status === 'COMPLETE' ? 'COMPLETE' as const : 'PARTIAL' as const, workspaceContained: evidence.facts.workspaceContained, canonicalTargetsKnown: evidence.facts.canonicalTargetsKnown, versionControlled: evidence.facts.versionControlled, checkpointAvailable: evidence.facts.checkpointAvailable, pathAliasObserved: evidence.facts.pathAliasObserved, itemCount: evidence.counts.evidenceItems, truncated: evidence.truncated } }),
        updatedAt: source.updatedAt,
      }
      return deepFreeze(view) as RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3
    } catch {
      // A projection failure is a safe unavailable result, never a partial card.
    }
  }
  return deepFreeze({
    schemaVersion: v3 ? 3 as const : 2 as const,
    sessionId: source.sessionId,
    callId: source.callId,
    ...(source.assessmentId === undefined ? {} : { assessmentId: source.assessmentId }),
    association: source.association,
    status: source.status,
    stage: source.stage,
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['ASSESSMENT_UNAVAILABLE'],
    updatedAt: source.updatedAt,
  }) as RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3
}

function deepFreeze<T>(value: T): T { if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); if (Array.isArray(value)) for (const item of value) deepFreeze(item); else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); return value }
