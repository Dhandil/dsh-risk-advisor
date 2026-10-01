export type DimensionName = 'RISK' | 'AUTHORIZATION' | 'NECESSITY' | 'PRIVILEGE' | 'ALTERNATIVES' | 'EVIDENCE_QUALITY'
export type EvidenceQualityVerdict = 'HIGH' | 'MEDIUM' | 'LOW'
export type RiskVerdict = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'
export type AuthorizationVerdict = 'EXPLICITLY_AUTHORIZED' | 'PARTIALLY_AUTHORIZED' | 'NOT_AUTHORIZED' | 'EXPLICITLY_DENIED' | 'UNKNOWN'
export type NecessityVerdict = 'NECESSARY' | 'LIKELY_NECESSARY' | 'NOT_NECESSARY' | 'UNKNOWN'
export type PrivilegeVerdict = 'MINIMAL' | 'PROPORTIONATE' | 'EXCESSIVE' | 'UNKNOWN'
export type AlternativesVerdict = 'SAFER_ALTERNATIVE_AVAILABLE' | 'NO_KNOWN_SAFER_ALTERNATIVE' | 'UNKNOWN'
export type AssessmentStatus = 'COMPLETE' | 'PARTIAL' | 'DEGRADED'
export type DimensionSource = 'RULE' | 'JUDGE' | 'MIXED' | 'UNKNOWN'
export type ReasonStrength = 'AUTHORITATIVE' | 'DETERMINISTIC' | 'INFERRED'

export interface DimensionReason {
  readonly code: string
  readonly message: string
  readonly strength: ReasonStrength
}

export interface DimensionAssessment<TVerdict extends string = string> {
  readonly dimension: DimensionName
  readonly verdict: TVerdict
  readonly source: DimensionSource
  readonly evidenceQuality: EvidenceQualityVerdict
  readonly basisFeatureIds: readonly string[]
  readonly basisEventIds: readonly string[]
  readonly reasons: readonly DimensionReason[]
  readonly judge?: { readonly invoked: boolean; readonly model?: string; readonly rationale?: string }
}

export type HazardLevel = RiskVerdict
export type AdvisoryRecommendation = 'APPROVE' | 'APPROVE_WITH_CAUTION' | 'PREFER_SAFER_ALTERNATIVE' | 'NEED_MORE_INFORMATION' | 'REJECT_RECOMMENDED'
export type AttentionLevel = 'NORMAL' | 'ELEVATED' | 'URGENT'

export interface AggregateAssessment {
  readonly hazardLevel: HazardLevel
  readonly recommendation: AdvisoryRecommendation
  readonly attentionLevel: AttentionLevel
  readonly primaryReasonCodes: readonly string[]
  readonly policyFlags: {
    readonly explicitDenial: boolean
    readonly authorizationGap: boolean
    readonly excessivePrivilege: boolean
    readonly privilegeEscalation: boolean
    readonly saferAlternativeAvailable: boolean
    readonly criticalUnknowns: boolean
    readonly degradedEvidence: boolean
    readonly repeatedFailure: boolean
    readonly repeatedEscalation: boolean
  }
}

export interface AggregatorInput {
  readonly risk: DimensionAssessment<RiskVerdict>
  readonly authorization: DimensionAssessment<AuthorizationVerdict>
  readonly necessity: DimensionAssessment<NecessityVerdict>
  readonly privilege: DimensionAssessment<PrivilegeVerdict>
  readonly alternatives: DimensionAssessment<AlternativesVerdict>
  readonly evidenceQuality: DimensionAssessment<EvidenceQualityVerdict>
  readonly assessmentStatus: AssessmentStatus
}

export function aggregateAssessment(input: AggregatorInput): AggregateAssessment {
  const flags = computePolicyFlags(input)
  const hazardLevel = input.risk.verdict
  if (input.authorization.verdict === 'EXPLICITLY_DENIED') return result(hazardLevel, 'REJECT_RECOMMENDED', 'URGENT', flags, ['AUTH_EXPLICIT_DENIAL'])
  if (input.authorization.verdict === 'NOT_AUTHORIZED') return result(hazardLevel, 'REJECT_RECOMMENDED', attentionFor(hazardLevel, 'REJECT_RECOMMENDED', flags.criticalUnknowns), flags, ['AUTH_SCOPE_VIOLATION'])
  if (criticalEvidenceGap(input)) return result(hazardLevel, 'NEED_MORE_INFORMATION', attentionFor(hazardLevel, 'NEED_MORE_INFORMATION', true), flags, ['INSUFFICIENT_CRITICAL_EVIDENCE'])
  if (input.alternatives.verdict === 'SAFER_ALTERNATIVE_AVAILABLE' && (['MEDIUM', 'HIGH', 'CRITICAL'].includes(hazardLevel) || input.privilege.verdict === 'EXCESSIVE')) {
    return result(hazardLevel, 'PREFER_SAFER_ALTERNATIVE', attentionFor(hazardLevel, 'PREFER_SAFER_ALTERNATIVE', flags.criticalUnknowns), flags, ['VERIFIED_SAFER_ALTERNATIVE'])
  }
  if (input.privilege.verdict === 'EXCESSIVE') {
    if (input.necessity.verdict === 'NOT_NECESSARY') return result(hazardLevel, 'REJECT_RECOMMENDED', attentionFor(hazardLevel, 'REJECT_RECOMMENDED', flags.criticalUnknowns), flags, ['EXCESSIVE_PRIVILEGE_NOT_NECESSARY'])
    if (input.necessity.verdict === 'UNKNOWN') return result(hazardLevel, 'NEED_MORE_INFORMATION', attentionFor(hazardLevel, 'NEED_MORE_INFORMATION', flags.criticalUnknowns), flags, ['EXCESSIVE_PRIVILEGE_UNJUSTIFIED'])
    return result(hazardLevel, 'PREFER_SAFER_ALTERNATIVE', attentionFor(hazardLevel, 'PREFER_SAFER_ALTERNATIVE', flags.criticalUnknowns), flags, ['PRIVILEGE_SCOPE_EXCESSIVE'])
  }
  if (hazardLevel === 'CRITICAL') {
    if (input.necessity.verdict === 'NOT_NECESSARY') return result(hazardLevel, 'REJECT_RECOMMENDED', 'URGENT', flags, ['CRITICAL_HAZARD_NOT_NECESSARY'])
    if (input.authorization.verdict === 'EXPLICITLY_AUTHORIZED' && (input.necessity.verdict === 'NECESSARY' || input.necessity.verdict === 'LIKELY_NECESSARY') && (input.privilege.verdict === 'MINIMAL' || input.privilege.verdict === 'PROPORTIONATE') && input.alternatives.verdict === 'NO_KNOWN_SAFER_ALTERNATIVE' && input.evidenceQuality.verdict !== 'LOW') {
      return result(hazardLevel, 'APPROVE_WITH_CAUTION', 'URGENT', flags, ['CRITICAL_BUT_JUSTIFIED'])
    }
    return result(hazardLevel, 'NEED_MORE_INFORMATION', 'URGENT', flags, ['INSUFFICIENT_CRITICAL_EVIDENCE'])
  }
  if (hazardLevel === 'HIGH') {
    if (input.necessity.verdict === 'NOT_NECESSARY') return result(hazardLevel, 'REJECT_RECOMMENDED', 'URGENT', flags, ['HIGH_HAZARD_NOT_NECESSARY'])
    if (input.authorization.verdict === 'PARTIALLY_AUTHORIZED' || input.authorization.verdict === 'UNKNOWN' || input.necessity.verdict === 'UNKNOWN') return result(hazardLevel, 'NEED_MORE_INFORMATION', 'ELEVATED', flags, ['HIGH_HAZARD_UNRESOLVED_CONTEXT'])
    if (input.authorization.verdict === 'EXPLICITLY_AUTHORIZED' && (input.necessity.verdict === 'NECESSARY' || input.necessity.verdict === 'LIKELY_NECESSARY') && (input.privilege.verdict === 'MINIMAL' || input.privilege.verdict === 'PROPORTIONATE') && input.alternatives.verdict === 'NO_KNOWN_SAFER_ALTERNATIVE' && input.evidenceQuality.verdict !== 'LOW') return result(hazardLevel, 'APPROVE_WITH_CAUTION', 'ELEVATED', flags, ['HIGH_HAZARD_JUSTIFIED'])
    return result(hazardLevel, 'NEED_MORE_INFORMATION', 'ELEVATED', flags, ['HIGH_HAZARD_UNRESOLVED_CONTEXT'])
  }
  if (hazardLevel === 'MEDIUM') return result(hazardLevel, 'APPROVE_WITH_CAUTION', attentionFor(hazardLevel, 'APPROVE_WITH_CAUTION', flags.criticalUnknowns), flags, ['MEDIUM_HAZARD'])
  if (hazardLevel === 'LOW' && (input.authorization.verdict === 'EXPLICITLY_AUTHORIZED' || input.authorization.verdict === 'PARTIALLY_AUTHORIZED') && input.necessity.verdict !== 'NOT_NECESSARY') return result(hazardLevel, 'APPROVE', 'NORMAL', flags, ['LOW_HAZARD'])
  return result(hazardLevel, 'NEED_MORE_INFORMATION', attentionFor(hazardLevel, 'NEED_MORE_INFORMATION', flags.criticalUnknowns), flags, ['UNKNOWN_FALLBACK'])
}

function criticalEvidenceGap(input: AggregatorInput): boolean {
  return input.assessmentStatus === 'DEGRADED'
    || input.risk.verdict === 'UNKNOWN'
    || (input.authorization.verdict === 'UNKNOWN' && (input.risk.verdict === 'HIGH' || input.risk.verdict === 'CRITICAL'))
    || (input.privilege.verdict === 'UNKNOWN' && input.risk.verdict === 'CRITICAL')
    || (input.necessity.verdict === 'UNKNOWN' && input.risk.verdict === 'CRITICAL')
}

function computePolicyFlags(input: AggregatorInput): AggregateAssessment['policyFlags'] {
  const reasons = [...input.risk.reasons, ...input.authorization.reasons, ...input.necessity.reasons, ...input.privilege.reasons, ...input.alternatives.reasons]
  const codes = new Set(reasons.map(reason => reason.code))
  const criticalUnknowns = criticalEvidenceGap(input)
  return Object.freeze({
    explicitDenial: input.authorization.verdict === 'EXPLICITLY_DENIED',
    authorizationGap: input.authorization.verdict === 'UNKNOWN' || input.authorization.verdict === 'PARTIALLY_AUTHORIZED',
    excessivePrivilege: input.privilege.verdict === 'EXCESSIVE',
    privilegeEscalation: codes.has('PERMISSION_ESCALATION_RETRY') || codes.has('PRIVILEGE_ESCALATION'),
    saferAlternativeAvailable: input.alternatives.verdict === 'SAFER_ALTERNATIVE_AVAILABLE',
    criticalUnknowns,
    degradedEvidence: input.assessmentStatus === 'DEGRADED' || input.evidenceQuality.verdict === 'LOW',
    repeatedFailure: codes.has('REPEATED_FAILURE') || codes.has('FAILURE_HISTORY'),
    repeatedEscalation: codes.has('PERMISSION_ESCALATION_RETRY') || codes.has('REPEATED_ESCALATION'),
  })
}

function attentionFor(hazard: HazardLevel, recommendation: AdvisoryRecommendation, criticalUnknown: boolean): AttentionLevel {
  if (hazard === 'CRITICAL' || (recommendation === 'REJECT_RECOMMENDED' && hazard === 'HIGH')) return 'URGENT'
  if (hazard === 'HIGH' || recommendation === 'PREFER_SAFER_ALTERNATIVE') return 'ELEVATED'
  if (recommendation === 'NEED_MORE_INFORMATION' && criticalUnknown) return 'ELEVATED'
  return hazard === 'LOW' && recommendation === 'APPROVE' ? 'NORMAL' : 'ELEVATED'
}

function result(hazardLevel: HazardLevel, recommendation: AdvisoryRecommendation, attentionLevel: AttentionLevel, policyFlags: AggregateAssessment['policyFlags'], primaryReasonCodes: readonly string[]): AggregateAssessment {
  return Object.freeze({ hazardLevel, recommendation, attentionLevel, policyFlags, primaryReasonCodes: Object.freeze([...primaryReasonCodes].slice(0, 3)) })
}
