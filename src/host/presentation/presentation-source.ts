import type { FailureChainSummary } from '../retry-escalation.ts'
import type { ReviewerOperationSeed } from '../reviewer-seed.ts'
import type { RuleEvaluation } from '../rule-engine.ts'
import type { RiskAssessment } from '../risk-engine.ts'
import type { BrowserSafeReasonCodeV2, RiskAdvisorBridgeViewV2 } from '../../bridge-contract.ts'
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
  readonly stage: 'rules' | 'fast' | 'complete'
  readonly status: 'pending' | 'unavailable' | 'cancelled'
  readonly reasonCodes: readonly string[]
  readonly updatedAt: number
}

const REASONS: Readonly<Record<string, BrowserSafeReasonCodeV2>> = {
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
}

export function phase6View(source: Phase6PresentationSource): RiskAdvisorBridgeViewV2 {
  const reasonCodes = [...new Set(source.reasonCodes.map(reason => REASONS[reason]).filter((reason): reason is BrowserSafeReasonCodeV2 => reason !== undefined))].slice(0, 24)
  if (source.assessment !== undefined && source.ruleEvaluation !== undefined && source.failureSummary !== undefined && source.association === 'BOUND' && source.assessmentId !== undefined) {
    try {
      return deepFreeze({
        schemaVersion: 2,
        sessionId: source.sessionId,
        callId: source.callId,
        assessmentId: source.assessmentId,
        association: 'BOUND',
        status: 'ready',
        stage: source.stage,
        operation: presentOperation(source.toolName, source.seed, source.ruleEvaluation),
        assessment: presentRiskAssessment(source.assessment),
        failureContext: presentFailureContext(source.failureSummary),
        reasonCodes,
        updatedAt: source.updatedAt,
      })
    } catch {
      // A projection failure is a safe unavailable result, never a partial card.
    }
  }
  return deepFreeze({
    schemaVersion: 2,
    sessionId: source.sessionId,
    callId: source.callId,
    ...(source.assessmentId === undefined ? {} : { assessmentId: source.assessmentId }),
    association: source.association,
    status: source.status,
    stage: source.stage,
    reasonCodes: reasonCodes.length > 0 ? reasonCodes : ['ASSESSMENT_UNAVAILABLE'],
    updatedAt: source.updatedAt,
  })
}

function deepFreeze<T>(value: T): T { if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); if (Array.isArray(value)) for (const item of value) deepFreeze(item); else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); return value }
