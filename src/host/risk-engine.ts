import { randomUUID } from 'node:crypto'
import type { FoundationDiagnostic } from './operation-foundation.ts'
import type { FailureChainSummary } from './retry-escalation.ts'
import type { RuleEvaluation, RuleFinding } from './rule-engine.ts'
import type { ReviewerOperationSeed, DirectUserContext } from './reviewer-seed.ts'
import {
  aggregateAssessment,
  type AggregateAssessment,
  type AlternativesVerdict,
  type AssessmentStatus,
  type AuthorizationVerdict,
  type DimensionAssessment,
  type DimensionName,
  type EvidenceQualityVerdict,
  type NecessityVerdict,
  type PrivilegeVerdict,
  type RiskVerdict,
} from './assessment-aggregator.ts'

export type FeatureValue = boolean | number | string | 'unknown'
export type FeatureSource = 'AUTHORITATIVE' | 'DETERMINISTIC' | 'INFERRED'

export interface RiskFeature {
  readonly id: string
  readonly value: FeatureValue
  readonly source: FeatureSource
  readonly strength: 'AUTHORITATIVE' | 'DETERMINISTIC' | 'INFERRED'
}

export interface RiskFeatureSet {
  readonly schemaVersion: 1
  readonly features: readonly RiskFeature[]
}

export interface JudgeFeatureView {
  readonly id: string
  readonly value: FeatureValue
  readonly qualification?: 'NOT_PROVEN'
}

const POSITIVE_PROOF_FALSE_FEATURES = new Set([
  'scope.outsideWorkspace',
  'scope.systemScope',
  'recovery.checkpointAvailable',
  'recovery.rollbackMechanismKnown',
])

export function projectJudgeFeatures(features: RiskFeatureSet): readonly JudgeFeatureView[] {
  return Object.freeze(features.features.map(feature => feature.value === false && POSITIVE_PROOF_FALSE_FEATURES.has(feature.id)
    ? Object.freeze({ id: feature.id, value: 'unknown' as const, qualification: 'NOT_PROVEN' as const })
    : Object.freeze({ id: feature.id, value: feature.value })))
}

export interface RiskContextSnapshot {
  readonly schemaVersion: 1
  readonly contextId: string
  readonly executionId: string
  readonly seed?: ReviewerOperationSeed
  readonly ruleEvaluation: RuleEvaluation
  readonly failureSummary: FailureChainSummary
  readonly directUser: DirectUserContext
  readonly ledger: {
    readonly health: 'HEALTHY' | 'RECOVERED' | 'DEGRADED'
    readonly sourceComplete: boolean
    readonly truncated: boolean
    readonly issueCodes: readonly string[]
  }
  readonly features: RiskFeatureSet
  readonly degraded: boolean
  readonly historyOmitted: boolean
}

export interface AssessmentFinding {
  readonly findingId: string
  readonly dimension: DimensionName
  readonly severity: 'INFO' | 'WARNING' | 'SERIOUS' | 'CRITICAL'
  readonly code: string
  readonly title: string
  readonly detail: string
  readonly strength: 'AUTHORITATIVE' | 'DETERMINISTIC' | 'INFERRED' | 'JUDGE'
  readonly basisFeatureIds: readonly string[]
  readonly basisEventIds: readonly string[]
}

export interface SaferAlternative {
  readonly alternativeId: string
  readonly title: string
  readonly description: string
  readonly source: 'REGISTERED_RECIPE' | 'HISTORICAL_SUCCESS' | 'CAPABILITY_RULE' | 'MODEL_SUGGESTED'
  readonly verification: 'VERIFIED' | 'UNVERIFIED'
  readonly improvements: { readonly lowerRisk: boolean; readonly lowerPrivilege: boolean; readonly narrowerScope: boolean; readonly moreReversible: boolean }
  readonly relatedExecutionId?: string
}

export interface AssessmentUncertainty {
  readonly uncertaintyId: string
  readonly code: string
  readonly dimension?: DimensionName
  readonly description: string
  readonly impact: 'LOW' | 'MEDIUM' | 'HIGH'
  readonly resolvable: boolean
  readonly resolutionHint?: string
}

export interface RiskAssessment {
  readonly schemaVersion: 1
  readonly assessmentId: string
  readonly executionId: string
  readonly contextId: string
  readonly createdAt: number
  readonly status: AssessmentStatus
  readonly dimensions: {
    readonly risk: DimensionAssessment<RiskVerdict>
    readonly authorization: DimensionAssessment<AuthorizationVerdict>
    readonly necessity: DimensionAssessment<NecessityVerdict>
    readonly privilege: DimensionAssessment<PrivilegeVerdict>
    readonly alternatives: DimensionAssessment<AlternativesVerdict>
    readonly evidenceQuality: DimensionAssessment<EvidenceQualityVerdict>
  }
  readonly aggregate: AggregateAssessment
  readonly findings: readonly AssessmentFinding[]
  readonly alternatives: readonly SaferAlternative[]
  readonly uncertainties: readonly AssessmentUncertainty[]
  readonly evidence: {
    readonly featureIds: readonly string[]
    readonly eventIds: readonly string[]
    readonly counts: { readonly authoritative: number; readonly deterministic: number; readonly inferred: number; readonly judge: number }
    readonly ledgerHealth: 'HEALTHY' | 'RECOVERED' | 'DEGRADED'
  }
  readonly provenance: {
    readonly rulesetVersion: string
    readonly featureSchemaVersion: 1
    readonly contextBuilderVersion: 'phase5-context-v1'
    readonly aggregatorVersion: 'phase5-aggregator-v1'
    readonly judge: { readonly invoked: boolean; readonly dimensions: readonly DimensionName[]; readonly model?: string }
  }
  readonly supersedesAssessmentId?: string
}

export interface RiskEngineInput {
  readonly executionId: string
  readonly seed: ReviewerOperationSeed | undefined
  readonly ruleEvaluation: RuleEvaluation
  readonly failureSummary: FailureChainSummary
  readonly foundation: FoundationDiagnostic | undefined
  readonly directUser: DirectUserContext
  readonly ledger: RiskContextSnapshot['ledger']
}

export function projectRiskFeatures(input: RiskEngineInput): RiskFeatureSet {
  const findings = input.ruleEvaluation.findings
  const targetScope = input.foundation?.boundary.targetScope ?? 'unknown'
  const bool = (id: string, value: boolean | 'unknown', source: FeatureSource = 'DETERMINISTIC'): RiskFeature => ({ id, value, source, strength: source })
  const number = (id: string, value: number): RiskFeature => ({ id, value, source: 'DETERMINISTIC', strength: 'DETERMINISTIC' })
  const features: RiskFeature[] = []
  features.push(bool('operation.mutatesState', input.ruleEvaluation.mutating))
  features.push(bool('operation.deletesState', hasAnyId(findings, ['DESTRUCTIVE_RECURSIVE_DELETE', 'DESTRUCTIVE_DISK_WIPE', 'DESTRUCTIVE_GIT_CLEAN']) ? true : knownNonMutating(input.ruleEvaluation) ? false : 'unknown'))
  features.push(bool('operation.executesCode', input.ruleEvaluation.operationKind === 'shell' ? true : knownOperationKind(input.ruleEvaluation.operationKind) ? false : 'unknown'))
  features.push(bool('operation.kindKnown', input.ruleEvaluation.operationKind !== 'unknown'))
  features.push(bool('operation.installsSoftware', hasId(findings, 'INSTALL_PACKAGE_MUTATION') ? true : knownNonMutating(input.ruleEvaluation) ? false : 'unknown'))
  features.push(bool('operation.changesConfiguration', hasAnyId(findings, ['SYSTEM_REGISTRY_MUTATION', 'SYSTEM_SERVICE_MUTATION']) ? true : 'unknown'))
  features.push(bool('operation.accessesCredentials', hasCategory(findings, 'credential') ? true : 'unknown'))
  features.push(bool('operation.changesPermissions', hasId(findings, 'PERMISSION_ACCESS_CONTROL_MUTATION') ? true : knownNonMutating(input.ruleEvaluation) ? false : 'unknown'))
  features.push(bool('operation.networkEgress', input.ruleEvaluation.networkEffect === 'none' ? false : input.ruleEvaluation.externalEffect === true ? true : 'unknown'))
  features.push(bool('operation.remoteWrite', input.ruleEvaluation.networkEffect === 'write' || hasId(findings, 'NETWORK_EXTERNAL_WRITE') ? true : input.ruleEvaluation.networkEffect === 'none' || input.ruleEvaluation.networkEffect === 'read' ? false : 'unknown'))
  const networkWrite = (input.ruleEvaluation.networkEffect as string) === 'write'
  features.push(bool('operation.persistentEffect', input.ruleEvaluation.mutating === true || networkWrite ? true : input.ruleEvaluation.mutating === false && !networkWrite ? false : 'unknown'))
  features.push(bool('scope.workspaceOnly', 'unknown'))
  features.push(bool('scope.canonicalTargetsKnown', false))
  features.push(bool('scope.targetCountKnown', false))
  features.push(bool('scope.recursive', hasId(findings, 'DESTRUCTIVE_RECURSIVE_DELETE') ? true : 'unknown'))
  features.push(bool('scope.wildcardTarget', 'unknown'))
  features.push(bool('scope.outsideWorkspace', positiveScope(targetScope, 'workspace') ? true : false))
  features.push(bool('scope.systemScope', targetScope === 'system' || hasCategory(findings, 'system-change') ? true : false))
  features.push(bool('recovery.reversible', input.ruleEvaluation.reversible))
  features.push(bool('recovery.checkpointAvailable', false))
  features.push(bool('recovery.versionControlled', 'unknown'))
  features.push(bool('recovery.backupKnown', 'unknown'))
  features.push(bool('recovery.rollbackMechanismKnown', false))
  features.push(number('history.retryCount', input.failureSummary.retryCount))
  features.push(number('history.escalationCount', input.failureSummary.permissionEscalation === true ? 1 : 0))
  features.push(bool('history.priorSameFingerprintFailure', input.failureSummary.retryOf !== undefined && input.failureSummary.recentFailureCount > 0))
  features.push(number('history.repeatedFailureCount', input.failureSummary.recentFailureCount))
  features.push(bool('authorization.goalKnown', input.directUser.messages.length > 0))
  features.push(bool('authorization.operationGoalRelationKnown', false))
  features.push(bool('authorization.explicitGrantPresent', false))
  features.push(bool('authorization.explicitDenialPresent', false))
  features.push({ id: 'authorization.grantSource', value: 'none', source: 'DETERMINISTIC', strength: 'DETERMINISTIC' })
  features.push(bool('authorization.agentJustificationPresent', false))
  features.push(bool('privilege.minimumScopeEvidenceAvailable', false))
  features.push({ id: 'privilege.requestedScope', value: requestedScope(input.seed?.requestedPermission), source: 'DETERMINISTIC', strength: 'DETERMINISTIC' })
  features.push(bool('privilege.privilegeEscalation', input.failureSummary.permissionEscalation))
  return Object.freeze({ schemaVersion: 1, features: Object.freeze(features) })
}

export function buildRiskContext(input: RiskEngineInput, contextId = `ra-context-${randomUUID()}`): RiskContextSnapshot {
  const features = projectRiskFeatures(input)
  return deepFreeze({
    schemaVersion: 1 as const,
    contextId,
    executionId: input.executionId,
    ...input.seed === undefined ? {} : { seed: input.seed },
    ruleEvaluation: input.ruleEvaluation,
    failureSummary: input.failureSummary,
    directUser: input.directUser,
    ledger: input.ledger,
    features,
    degraded: input.seed === undefined || input.ruleEvaluation.status !== 'READY' || input.ruleEvaluation.parserConfidence === 'low' || input.failureSummary.status === 'DEGRADED' || input.ledger.health === 'DEGRADED',
    historyOmitted: input.directUser.historyOmitted,
  })
}

export function createDeterministicAssessment(context: RiskContextSnapshot, assessmentId: string, createdAt: number, judge?: { readonly invoked: boolean; readonly dimensions: readonly DimensionName[]; readonly model?: string }): RiskAssessment {
  const dimensions = deterministicDimensions(context)
  const status = assessmentStatus(context, dimensions)
  const findings = assessmentFindings(context)
  const alternatives: readonly SaferAlternative[] = Object.freeze([])
  const uncertainties = uncertaintiesFor(context, dimensions)
  const aggregate = aggregateAssessment({ ...dimensions, assessmentStatus: status })
  const evidence = evidenceSummary(context, dimensions)
  return deepFreeze({
    schemaVersion: 1 as const,
    assessmentId,
    executionId: context.executionId,
    contextId: context.contextId,
    createdAt,
    status,
    dimensions,
    aggregate,
    findings,
    alternatives,
    uncertainties,
    evidence,
    provenance: {
      rulesetVersion: context.ruleEvaluation.rulesetVersion,
      featureSchemaVersion: 1 as const,
      contextBuilderVersion: 'phase5-context-v1' as const,
      aggregatorVersion: 'phase5-aggregator-v1' as const,
      judge: judge ?? { invoked: false, dimensions: Object.freeze([]) },
    },
  })
}

export function mergeJudgeAssessment(base: RiskAssessment, context: RiskContextSnapshot, candidate: JudgeMergeInput, assessmentId: string, createdAt: number, model: string): RiskAssessment {
  const dimensions = mergeDimensions(base, candidate, model)
  const alternatives = candidate.suggestedAlternatives.length === 0 ? base.alternatives : candidate.suggestedAlternatives.map((item, index) => ({
    alternativeId: `model-alternative-${index + 1}`,
    title: item.title,
    description: item.description,
    source: 'MODEL_SUGGESTED' as const,
    verification: 'UNVERIFIED' as const,
    improvements: { lowerRisk: false, lowerPrivilege: false, narrowerScope: false, moreReversible: false },
  }))
  const alternativeDimension: DimensionAssessment<AlternativesVerdict> = candidate.suggestedAlternatives.length === 0
    ? dimensions.alternatives
    : dimension('ALTERNATIVES', 'UNKNOWN', 'JUDGE', dimensions.alternatives.evidenceQuality, dimensions.alternatives.basisFeatureIds, ['MODEL_SUGGESTION_UNVERIFIED'], 'Judge suggestions are unverified and cannot trigger a safer-alternative policy.')
  const mergedDimensions = { ...dimensions, alternatives: alternativeDimension }
  const status = assessmentStatus(context, mergedDimensions)
  const hypotheses = candidate.results.flatMap(item => item.proposedFacts.map((fact, index) => ({
    uncertaintyId: `judge-hypothesis-${item.dimension.toLowerCase()}-${index + 1}`,
    code: 'JUDGE_HYPOTHESIS',
    description: fact.statement,
    impact: 'LOW' as const,
    resolvable: true,
  })))
  return deepFreeze({
    ...base,
    assessmentId,
    createdAt,
    status,
    dimensions: mergedDimensions,
    aggregate: aggregateAssessment({ ...mergedDimensions, assessmentStatus: status }),
    alternatives: Object.freeze(alternatives),
    uncertainties: Object.freeze([...uncertaintiesFor(context, mergedDimensions, ['JUDGE_USED']), ...hypotheses]),
    evidence: evidenceSummary(context, mergedDimensions),
    provenance: { ...base.provenance, judge: { invoked: true, dimensions: Object.freeze(candidate.dimensions), model } },
    supersedesAssessmentId: base.assessmentId,
  })
}

export interface JudgeMergeInput {
  readonly dimensions: readonly DimensionName[]
  readonly results: readonly { readonly dimension: 'RISK' | 'AUTHORIZATION' | 'NECESSITY' | 'PRIVILEGE'; readonly verdict: string; readonly rationale: string; readonly referencedFeatureIds: readonly string[]; readonly proposedFacts: readonly { readonly statement: string; readonly status: 'HYPOTHESIS' }[] }[]
  readonly suggestedAlternatives: readonly { readonly title: string; readonly description: string }[]
}

function deterministicDimensions(context: RiskContextSnapshot) {
  const findings = context.ruleEvaluation.findings
  const risk: RiskVerdict = findings.some(item => item.severity === 'critical') ? 'CRITICAL' : findings.some(item => item.severity === 'high') ? 'HIGH' : findings.some(item => item.category === 'unknown-tool' || item.category === 'shell-ambiguity') ? 'UNKNOWN' : findings.some(item => item.severity === 'medium') ? 'MEDIUM' : context.ruleEvaluation.status === 'READY' && context.ruleEvaluation.parserConfidence === 'high' && context.ruleEvaluation.operationKind !== 'unknown' && context.ruleEvaluation.mutating !== 'unknown' && context.ruleEvaluation.externalEffect !== 'unknown' && context.ruleEvaluation.networkEffect !== 'unknown' ? 'LOW' : 'UNKNOWN'
  const evidenceQuality: EvidenceQualityVerdict = context.degraded ? 'LOW' : 'MEDIUM'
  return {
    risk: dimension('RISK', risk, risk === 'UNKNOWN' ? 'UNKNOWN' : 'RULE', evidenceQuality, featureIdsForRisk(context), [...(risk === 'UNKNOWN' ? ['RISK_SEMANTICS_UNRESOLVED'] : ['DETERMINISTIC_RULE_EVALUATION']), ...historyReasonCodes(context)], risk === 'UNKNOWN' ? 'Deterministic operation semantics remain incomplete.' : 'Risk verdict derives from accepted deterministic findings.'),
    authorization: dimension('AUTHORIZATION', 'UNKNOWN', 'UNKNOWN', evidenceQuality, ['authorization.goalKnown'], ['AUTHORIZATION_SEMANTICS_UNRESOLVED'], 'Authorization relation is not proven by deterministic Phase 5 facts.'),
    necessity: dimension('NECESSITY', 'UNKNOWN', 'UNKNOWN', evidenceQuality, ['authorization.goalKnown'], ['NECESSITY_UNRESOLVED'], 'Necessity is not proven by retry or failure history alone.'),
    privilege: dimension('PRIVILEGE', 'UNKNOWN', 'UNKNOWN', evidenceQuality, ['privilege.minimumScopeEvidenceAvailable'], ['MINIMUM_PRIVILEGE_UNRESOLVED', ...escalationReasonCodes(context)], 'Minimum required authority is not available in Phase 5.'),
    alternatives: dimension('ALTERNATIVES', 'NO_KNOWN_SAFER_ALTERNATIVE', 'RULE', evidenceQuality, [], ['NO_VERIFIED_ALTERNATIVE'], 'No deterministic verified safer alternative is registered in Phase 5.'),
    evidenceQuality: dimension('EVIDENCE_QUALITY', evidenceQuality, 'RULE', evidenceQuality, evidenceFeatureIds(context), evidenceQuality === 'LOW' ? ['STRUCTURAL_DEGRADATION'] : ['PHASE5_EVIDENCE_CAP'], evidenceQuality === 'LOW' ? 'Local evidence structure is degraded.' : 'Evidence quality is deterministic and capped before later evidence phases.'),
  } as const
}

function mergeDimensions(base: RiskAssessment, input: JudgeMergeInput, model: string) {
  const result = { ...base.dimensions }
  for (const item of input.results) {
    const key = item.dimension === 'RISK' ? 'risk' : item.dimension === 'AUTHORIZATION' ? 'authorization' : item.dimension === 'NECESSITY' ? 'necessity' : 'privilege'
    const current = result[key]
    if (current.verdict !== 'UNKNOWN') continue
    result[key] = { ...current, verdict: item.verdict as never, source: 'JUDGE', judge: { invoked: true, model, rationale: item.rationale }, reasons: Object.freeze([...current.reasons, { code: 'JUDGE_SEMANTIC_GAP_FILL', message: 'Bounded Judge semantic gap-fill was accepted without changing deterministic feature values.', strength: 'INFERRED' as const }]) } as never
  }
  return result
}

function dimension<T extends string>(name: DimensionName, verdict: T, source: 'RULE' | 'JUDGE' | 'UNKNOWN' | 'MIXED', evidenceQuality: EvidenceQualityVerdict, basisFeatureIds: readonly string[], reasonCodes: readonly string[], message: string): DimensionAssessment<T> {
  return Object.freeze({ dimension: name, verdict, source, evidenceQuality, basisFeatureIds: Object.freeze([...basisFeatureIds]), basisEventIds: Object.freeze([]), reasons: Object.freeze(reasonCodes.map(code => ({ code, message, strength: source === 'JUDGE' ? 'INFERRED' as const : 'DETERMINISTIC' as const }))) })
}

function assessmentStatus(context: RiskContextSnapshot, dimensions: { readonly risk: DimensionAssessment; readonly authorization: DimensionAssessment; readonly necessity: DimensionAssessment; readonly privilege: DimensionAssessment; readonly alternatives: DimensionAssessment; readonly evidenceQuality: DimensionAssessment }): AssessmentStatus {
  if (context.degraded) return 'DEGRADED'
  return [dimensions.risk, dimensions.authorization, dimensions.necessity, dimensions.privilege, dimensions.alternatives].some(item => item.verdict === 'UNKNOWN') || context.historyOmitted ? 'PARTIAL' : 'COMPLETE'
}

function assessmentFindings(context: RiskContextSnapshot): readonly AssessmentFinding[] {
  return Object.freeze(context.ruleEvaluation.findings.slice(0, 32).map(item => ({
    findingId: `rule-${item.id}`,
    dimension: findingDimension(item),
    severity: (item.severity === 'critical' ? 'CRITICAL' : item.severity === 'high' ? 'SERIOUS' : item.severity === 'medium' ? 'WARNING' : 'INFO') as AssessmentFinding['severity'],
    code: item.id,
    title: item.summary,
    detail: item.summary,
    strength: 'DETERMINISTIC' as const,
    basisFeatureIds: Object.freeze(featureIdsForFinding(item)),
    basisEventIds: Object.freeze([]),
  })))
}

function uncertaintiesFor(context: RiskContextSnapshot, dimensions: { readonly risk: DimensionAssessment; readonly authorization: DimensionAssessment; readonly necessity: DimensionAssessment; readonly privilege: DimensionAssessment; readonly alternatives: DimensionAssessment; readonly evidenceQuality: DimensionAssessment }, extra: readonly string[] = []): readonly AssessmentUncertainty[] {
  const values: AssessmentUncertainty[] = []
  const add = (code: string, dimension: DimensionName | undefined, impact: AssessmentUncertainty['impact'], description: string) => values.push({ uncertaintyId: `uncertainty-${code.toLowerCase()}`, code, ...(dimension === undefined ? {} : { dimension }), description, impact, resolvable: true })
  add('CANONICAL_TARGETS_UNAVAILABLE', 'RISK', 'MEDIUM', 'Canonical target evidence belongs to a later phase.')
  add('RECOVERY_EVIDENCE_UNAVAILABLE', 'RISK', 'MEDIUM', 'Checkpoint, backup and rollback evidence are unavailable in Phase 5.')
  if (context.historyOmitted) add('USER_HISTORY_OMITTED', 'AUTHORIZATION', 'MEDIUM', 'Complete direct-user history was not observed by the bounded live ring.')
  if (dimensions.authorization.verdict === 'UNKNOWN') add('AUTHORIZATION_SEMANTICS_UNRESOLVED', 'AUTHORIZATION', 'HIGH', 'Trusted direct-user context was not semantically matched in Phase 5 deterministic code.')
  if (dimensions.necessity.verdict === 'UNKNOWN') add('NECESSITY_UNRESOLVED', 'NECESSITY', 'HIGH', 'Necessity remains unknown without a bounded semantic gap-fill.')
  if (dimensions.privilege.verdict === 'UNKNOWN') add('MINIMUM_PRIVILEGE_UNRESOLVED', 'PRIVILEGE', 'HIGH', 'Minimum required authority is not proven.')
  for (const code of extra) add(code, undefined, 'LOW', 'Bounded Phase 5 Judge metadata.')
  return Object.freeze(values)
}

function evidenceSummary(context: RiskContextSnapshot, dimensions: { readonly risk: DimensionAssessment; readonly authorization: DimensionAssessment; readonly necessity: DimensionAssessment; readonly privilege: DimensionAssessment; readonly alternatives: DimensionAssessment; readonly evidenceQuality: DimensionAssessment }) {
  const features = context.features.features
  const counts = { authoritative: features.filter(item => item.strength === 'AUTHORITATIVE').length, deterministic: features.filter(item => item.strength === 'DETERMINISTIC').length, inferred: features.filter(item => item.strength === 'INFERRED').length, judge: Object.values(dimensions).filter(item => item.source === 'JUDGE' || item.source === 'MIXED').length }
  return Object.freeze({ featureIds: Object.freeze(features.map(item => item.id)), eventIds: Object.freeze([]), counts: Object.freeze(counts), ledgerHealth: context.ledger.health })
}

function findingDimension(finding: RuleFinding): DimensionName {
  return finding.category === 'permission' ? 'PRIVILEGE' : finding.category === 'workspace-boundary' || finding.category === 'path-alias' || finding.category === 'shell-ambiguity' || finding.category === 'unknown-tool' || finding.category === 'reversibility' ? 'EVIDENCE_QUALITY' : 'RISK'
}
function featureIdsForFinding(finding: RuleFinding): string[] {
  if (finding.category === 'permission') return finding.id === 'PERMISSION_ESCALATION_RETRY'
    ? ['privilege.privilegeEscalation']
    : finding.id === 'PERMISSION_ACCESS_CONTROL_MUTATION'
      ? ['operation.changesPermissions']
      : ['privilege.requestedScope']
  if (finding.category === 'destructive') return ['operation.deletesState', 'operation.persistentEffect']
  if (finding.category === 'system-change') return ['operation.changesConfiguration', 'scope.systemScope']
  if (finding.category === 'credential') return ['operation.accessesCredentials']
  if (finding.category === 'network') return ['operation.networkEgress']
  if (finding.category === 'install') return ['operation.installsSoftware']
  if (finding.category === 'reversibility') return ['recovery.reversible']
  if (finding.category === 'shell-ambiguity') return ['operation.executesCode', 'operation.kindKnown']
  if (finding.category === 'unknown-tool') return ['operation.kindKnown']
  if (finding.category === 'path-alias' || finding.category === 'workspace-boundary') return ['scope.canonicalTargetsKnown']
  return []
}
function featureIdsForRisk(context: RiskContextSnapshot): string[] { return context.features.features.filter(item => item.id.startsWith('operation.') || item.id.startsWith('scope.')).slice(0, 24).map(item => item.id) }
function evidenceFeatureIds(context: RiskContextSnapshot): string[] { return context.features.features.filter(item => item.id.startsWith('scope.') || item.id.startsWith('recovery.')).map(item => item.id) }
function hasCategory(findings: readonly RuleFinding[], category: RuleFinding['category']): boolean { return findings.some(item => item.category === category) }
function hasId(findings: readonly RuleFinding[], id: string): boolean { return findings.some(item => item.id === id) }
function hasAnyId(findings: readonly RuleFinding[], ids: readonly string[]): boolean { return ids.some(id => hasId(findings, id)) }
function knownNonMutating(evaluation: RuleEvaluation): boolean { return evaluation.mutating === false }
function knownOperationKind(kind: RuleEvaluation['operationKind']): boolean { return kind !== 'unknown' }
function positiveScope(targetScope: FoundationDiagnostic['boundary']['targetScope'], expected: 'workspace'): boolean { return targetScope !== 'unknown' && targetScope !== expected }
function requestedScope(permission: ReviewerOperationSeed['requestedPermission']): FeatureValue { return permission === 'workspace-write' ? 'workspace' : permission === 'danger-full-access' ? 'unrestricted' : 'unknown' }
function historyReasonCodes(context: RiskContextSnapshot): readonly string[] {
  return context.failureSummary.retryCount > 0 || context.failureSummary.recentFailureCount > 0 ? ['REPEATED_FAILURE', 'FAILURE_HISTORY'] : []
}
function escalationReasonCodes(context: RiskContextSnapshot): readonly string[] {
  return context.failureSummary.permissionEscalation === true ? ['PERMISSION_ESCALATION_RETRY', 'REPEATED_ESCALATION'] : []
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  if (Array.isArray(value)) for (const item of value) deepFreeze(item)
  else for (const item of Object.values(value as Record<string, unknown>)) deepFreeze(item)
  return value
}
