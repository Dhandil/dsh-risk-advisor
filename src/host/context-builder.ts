import type { RuleEvaluation } from './rule-engine.ts'
import type { FailureChainSummary } from './retry-escalation.ts'
import type { FoundationDiagnostic } from './operation-foundation.ts'
import type { LedgerDiagnostics, LedgerHealth } from './ledger.ts'
import type { Session } from '@deepseek-ai/dsh-session'
import type { DirectUserRing, ReviewerOperationSeed } from './reviewer-seed.ts'
import { buildRiskContext, type RiskContextSnapshot } from './risk-engine.ts'

export const PHASE5_CONTEXT_VERSION = 'phase5-context-v1' as const
export const MAX_REVIEWER_PAYLOAD_CHARS = 24_000

export interface ContextBuilderInput {
  readonly session: Session
  readonly executionId: string
  readonly seed: ReviewerOperationSeed | undefined
  readonly ruleEvaluation: RuleEvaluation
  readonly failureSummary: FailureChainSummary
  readonly foundation?: FoundationDiagnostic
  readonly userRing: DirectUserRing
  readonly ledger: LedgerDiagnostics | undefined
}

export interface ReviewerPayload {
  readonly schemaVersion: 1
  readonly contextBuilderVersion: typeof PHASE5_CONTEXT_VERSION
  readonly operation: ReviewerOperationSeed | { readonly unavailable: true }
  readonly deterministicFindings: readonly { readonly id: string; readonly severity: string; readonly category: string; readonly summary: string }[]
  readonly failure: {
    readonly retryCount: number
    readonly recentFailureCount: number
    readonly sameRootCause: boolean | 'unknown'
    readonly permissionEscalation: boolean | 'unknown'
    readonly truncated: boolean
  }
  readonly directUser: { readonly messages: readonly string[]; readonly historyOmitted: boolean }
  readonly features: readonly { readonly id: string; readonly value: unknown }[]
  readonly ledger: { readonly health: LedgerHealth; readonly sourceComplete: boolean; readonly truncated: boolean; readonly issueCodes: readonly string[] }
  readonly degraded: boolean
  readonly omissionFlags: readonly string[]
}

export interface BuiltPhase5Context {
  readonly snapshot: RiskContextSnapshot
  readonly payload: ReviewerPayload
  readonly serializedPayload: string
}

export function buildPhase5Context(input: ContextBuilderInput): BuiltPhase5Context {
  const directUser = input.userRing.snapshot(input.session)
  const ledger = readLedger(input.ledger, input.session)
  const snapshot = buildRiskContext({
    executionId: input.executionId,
    seed: input.seed,
    ruleEvaluation: input.ruleEvaluation,
    failureSummary: input.failureSummary,
    foundation: input.foundation,
    directUser,
    ledger,
  })
  const omissionFlags = [
    ...(directUser.historyOmitted ? ['USER_HISTORY_OMITTED'] : []),
    ...(directUser.degraded ? ['USER_CONTEXT_DEGRADED'] : []),
    ...(input.seed === undefined ? ['REVIEWER_SEED_UNAVAILABLE'] : []),
    ...(input.seed?.truncated ? ['OPERATION_TRUNCATED'] : []),
    ...(ledger.truncated ? ['LEDGER_TRUNCATED'] : []),
    ...(ledger.health === 'DEGRADED' ? ['LEDGER_DEGRADED'] : []),
  ]
  const payload: ReviewerPayload = {
    schemaVersion: 1,
    contextBuilderVersion: PHASE5_CONTEXT_VERSION,
    operation: input.seed ?? { unavailable: true },
    deterministicFindings: Object.freeze(input.ruleEvaluation.findings.slice(0, 32).map(item => ({ id: item.id, severity: item.severity, category: item.category, summary: item.summary }))),
    failure: Object.freeze({ retryCount: input.failureSummary.retryCount, recentFailureCount: input.failureSummary.recentFailureCount, sameRootCause: input.failureSummary.sameRootCause, permissionEscalation: input.failureSummary.permissionEscalation, truncated: input.failureSummary.truncated }),
    directUser: Object.freeze({ messages: Object.freeze([...directUser.messages]), historyOmitted: directUser.historyOmitted }),
    features: Object.freeze(snapshot.features.features.map(item => ({ id: item.id, value: item.value }))),
    ledger: Object.freeze({ health: ledger.health, sourceComplete: ledger.sourceComplete, truncated: ledger.truncated, issueCodes: Object.freeze([...ledger.issueCodes].slice(0, 16)) }),
    degraded: snapshot.degraded,
    omissionFlags: Object.freeze(omissionFlags),
  }
  const bounded = boundPayload(payload)
  return Object.freeze({ snapshot, payload: bounded.payload, serializedPayload: bounded.serialized })
}

function readLedger(ledger: LedgerDiagnostics | undefined, session: Session): RiskContextSnapshot['ledger'] {
  if (ledger === undefined) return Object.freeze({ health: 'DEGRADED', sourceComplete: false, truncated: true, issueCodes: Object.freeze(['LEDGER_UNAVAILABLE']) })
  try {
    const snapshot = ledger.snapshot(session, { limit: 1 })
    return Object.freeze({ health: snapshot.health, sourceComplete: snapshot.sourceComplete, truncated: snapshot.truncated, issueCodes: Object.freeze(snapshot.issues.slice(0, 16).map(item => item.code)) })
  } catch {
    return Object.freeze({ health: 'DEGRADED', sourceComplete: false, truncated: true, issueCodes: Object.freeze(['LEDGER_SNAPSHOT_UNAVAILABLE']) })
  }
}

function boundPayload(payload: ReviewerPayload): { readonly payload: ReviewerPayload; readonly serialized: string } {
  let current = payload
  let serialized = JSON.stringify(current)
  if (serialized.length <= MAX_REVIEWER_PAYLOAD_CHARS) return { payload: deepFreeze(current), serialized }
  const messages = [...payload.directUser.messages]
  while (messages.length > 0 && serialized.length > MAX_REVIEWER_PAYLOAD_CHARS) {
    messages.shift()
    current = { ...payload, directUser: { ...payload.directUser, messages: Object.freeze(messages), historyOmitted: true }, omissionFlags: Object.freeze([...payload.omissionFlags, 'PAYLOAD_TRUNCATED']) }
    serialized = JSON.stringify(current)
  }
  if (serialized.length > MAX_REVIEWER_PAYLOAD_CHARS) {
    const operation = current.operation
    const operationText = 'operationText' in operation && typeof operation.operationText === 'string' ? operation.operationText.slice(0, 1024) : undefined
    const resourceHints = 'resourceHints' in operation ? operation.resourceHints.map(item => item.slice(0, 128)) : []
    current = { ...current, operation: 'schemaVersion' in operation ? { ...operation, ...operationText === undefined ? {} : { operationText }, resourceHints: Object.freeze(resourceHints), truncated: true } : operation, omissionFlags: Object.freeze([...current.omissionFlags, 'OPERATION_DETAIL_TRUNCATED']) }
    serialized = JSON.stringify(current)
  }
  if (serialized.length > MAX_REVIEWER_PAYLOAD_CHARS) throw new RangeError('bounded reviewer payload cannot be produced')
  return { payload: deepFreeze(current), serialized }
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  if (Array.isArray(value)) for (const child of value) deepFreeze(child)
  else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return value
}
