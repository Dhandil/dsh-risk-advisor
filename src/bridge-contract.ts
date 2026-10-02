export const RISK_ADVISOR_RPC_CHANNEL = '/risk-advisor' as const
export const BRIDGE_IDENTIFIER_LIMIT = 256

export const BROWSER_SAFE_REASON_CODES = [
  'ASSESSOR_NOT_IMPLEMENTED', 'FOUNDATION_DEGRADED', 'FOUNDATION_UNAVAILABLE', 'MISSING_CALL_ID',
  'MISSING_SCOPE_IDENTITY', 'NO_ACTIVE_EXECUTION', 'RUNTIME_STATE_LOST', 'OBSERVATION_UNAVAILABLE',
  'AMBIGUOUS_EXECUTION', 'CORRELATION_CONFLICT',
] as const
export type BrowserSafeReasonCode = typeof BROWSER_SAFE_REASON_CODES[number]

export const BROWSER_SAFE_REASON_CODES_V2 = [
  'FOUNDATION_DEGRADED', 'FOUNDATION_UNAVAILABLE', 'MISSING_CALL_ID', 'MISSING_SCOPE_IDENTITY',
  'NO_ACTIVE_EXECUTION', 'RUNTIME_STATE_LOST', 'OBSERVATION_UNAVAILABLE', 'AMBIGUOUS_EXECUTION',
  'CORRELATION_CONFLICT', 'CONTEXT_DEGRADED', 'REDACTION_FAILED', 'HISTORY_OMITTED',
  'CANONICAL_TARGETS_UNAVAILABLE', 'RECOVERY_EVIDENCE_UNAVAILABLE', 'JUDGE_DISABLED',
  'JUDGE_CONFIG_UNAVAILABLE', 'JUDGE_CAPABILITY_UNAVAILABLE', 'JUDGE_ROUTE_UNAVAILABLE',
  'JUDGE_QUEUE_SATURATED', 'JUDGE_TIMEOUT', 'JUDGE_STREAM_ERROR', 'JUDGE_ABORTED',
  'JUDGE_INVALID_OUTPUT', 'NATIVE_OUTCOME_OBSERVED', 'ASSESSMENT_UNAVAILABLE',
] as const
export type BrowserSafeReasonCodeV2 = typeof BROWSER_SAFE_REASON_CODES_V2[number]
export const BROWSER_SAFE_REASON_CODES_V3 = [...BROWSER_SAFE_REASON_CODES_V2, 'EVIDENCE_CAPABILITY_UNAVAILABLE', 'EVIDENCE_PENDING', 'EVIDENCE_COLLECTION_DEGRADED', 'EVIDENCE_OUTSIDE_WORKSPACE', 'EVIDENCE_PATH_ALIAS', 'PACKAGE_LIFECYCLE_SCRIPTS_PRESENT'] as const
export type BrowserSafeReasonCodeV3 = typeof BROWSER_SAFE_REASON_CODES_V3[number]

export type BrowserOperationKind = 'filesystem-read' | 'filesystem-write' | 'filesystem-edit' | 'shell' | 'network-read' | 'unknown'
export type BrowserResourceKind = 'path' | 'url' | 'query' | 'workdir' | 'other'
export type BrowserDimensionSource = 'RULE' | 'JUDGE' | 'MIXED' | 'UNKNOWN'
export type BrowserEvidenceQuality = 'HIGH' | 'MEDIUM' | 'LOW'
export type BrowserFindingDimension = 'RISK' | 'AUTHORIZATION' | 'NECESSITY' | 'PRIVILEGE' | 'ALTERNATIVES' | 'EVIDENCE_QUALITY'
export type BrowserFindingSeverity = 'INFO' | 'WARNING' | 'SERIOUS' | 'CRITICAL'
export type BrowserFindingStrength = 'AUTHORITATIVE' | 'DETERMINISTIC' | 'INFERRED' | 'JUDGE'
export type BrowserUncertaintyImpact = 'LOW' | 'MEDIUM' | 'HIGH'
export type BrowserAlternativeSource = 'REGISTERED_RECIPE' | 'HISTORICAL_SUCCESS' | 'CAPABILITY_RULE' | 'MODEL_SUGGESTED'
export type BrowserAlternativeVerification = 'VERIFIED' | 'UNVERIFIED'

export interface OperationPresentationV1 {
  readonly schemaVersion: 1
  readonly kind: BrowserOperationKind
  readonly toolName: string
  readonly title: string
  readonly summary: string
  readonly resources: readonly { readonly kind: BrowserResourceKind; readonly label: string }[]
  readonly requestedPermission?: 'workspace-write' | 'danger-full-access'
  readonly parserConfidence: 'high' | 'medium' | 'low'
  readonly mutating: boolean | 'unknown'
  readonly externalEffect: boolean | 'unknown'
  readonly networkEffect: 'none' | 'read' | 'write' | 'unknown'
  readonly workspaceContained: 'unknown'
  readonly sandboxCovered: 'unknown'
  readonly reversible: 'unknown'
}

export interface BrowserDimension {
  readonly verdict: string
  readonly source: BrowserDimensionSource
  readonly evidenceQuality: BrowserEvidenceQuality
  readonly reasons: readonly { readonly code: string; readonly message: string }[]
}

export interface BrowserRiskAssessmentV1 {
  readonly schemaVersion: 1
  readonly assessmentId: string
  readonly status: 'COMPLETE' | 'PARTIAL' | 'DEGRADED'
  readonly dimensions: { readonly risk: BrowserDimension; readonly authorization: BrowserDimension; readonly necessity: BrowserDimension; readonly privilege: BrowserDimension; readonly alternatives: BrowserDimension; readonly evidenceQuality: BrowserDimension }
  readonly aggregate: {
    readonly recommendation: 'APPROVE' | 'APPROVE_WITH_CAUTION' | 'PREFER_SAFER_ALTERNATIVE' | 'NEED_MORE_INFORMATION' | 'REJECT_RECOMMENDED'
    readonly hazardLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'UNKNOWN'
    readonly attention: 'NORMAL' | 'ELEVATED' | 'URGENT'
    readonly primaryReasonCodes: readonly string[]
  }
  readonly findings: readonly { readonly code: string; readonly title: string; readonly detail: string; readonly dimension: BrowserFindingDimension; readonly severity: BrowserFindingSeverity; readonly strength: BrowserFindingStrength }[]
  readonly uncertainties: readonly { readonly code: string; readonly description: string; readonly dimension?: BrowserFindingDimension; readonly impact: BrowserUncertaintyImpact; readonly resolutionHint?: string }[]
  readonly alternatives: readonly { readonly title: string; readonly description: string; readonly source: BrowserAlternativeSource; readonly verification: BrowserAlternativeVerification }[]
  readonly evidence: { readonly ledgerHealth: 'HEALTHY' | 'RECOVERED' | 'DEGRADED' }
  readonly judgeAssisted: boolean
  readonly supersedesAssessmentId?: string
}

export interface FailureContextPresentationV1 {
  readonly schemaVersion: 1
  readonly retryCount: number
  readonly recentFailureCount: number
  readonly sameRootCause: boolean | 'unknown'
  readonly permissionEscalation: boolean | 'unknown'
  readonly truncated: boolean
}

export interface RiskAdvisorBridgeViewV1 {
  readonly schemaVersion: 1
  readonly sessionId: string
  readonly callId: string
  readonly assessmentId?: string
  readonly association: 'BOUND' | 'UNBOUND'
  readonly status: 'unavailable'
  readonly stage: 'not-started'
  readonly reasonCodes: readonly BrowserSafeReasonCode[]
  readonly updatedAt: number
}

export interface RiskAdvisorBridgeViewV2 {
  readonly schemaVersion: 2
  readonly sessionId: string
  readonly callId: string
  readonly assessmentId?: string
  readonly association: 'BOUND' | 'UNBOUND'
  readonly status: 'pending' | 'ready' | 'unavailable' | 'cancelled'
  readonly stage: 'rules' | 'fast' | 'complete'
  readonly operation?: OperationPresentationV1
  readonly assessment?: BrowserRiskAssessmentV1
  readonly failureContext?: FailureContextPresentationV1
  readonly reasonCodes: readonly BrowserSafeReasonCodeV2[]
  readonly updatedAt: number
}

export interface BrowserEvidenceSummaryV1 {
  readonly status: 'COMPLETE' | 'PARTIAL'
  readonly workspaceContained: boolean | 'unknown'
  readonly canonicalTargetsKnown: boolean | 'unknown'
  readonly versionControlled: boolean | 'unknown'
  readonly checkpointAvailable: boolean | 'unknown'
  readonly pathAliasObserved: boolean | 'unknown'
  readonly itemCount: number
  readonly truncated: boolean
}

export interface RiskAdvisorBridgeViewV3 extends Omit<RiskAdvisorBridgeViewV2, 'schemaVersion' | 'stage' | 'reasonCodes'> {
  readonly schemaVersion: 3
  readonly stage: 'rules' | 'fast' | 'evidence' | 'complete'
  readonly reasonCodes: readonly BrowserSafeReasonCodeV3[]
  readonly evidence?: BrowserEvidenceSummaryV1
}

export type RiskAdvisorBridgeRead =
  | { readonly kind: 'VIEW'; readonly view: RiskAdvisorBridgeViewV1 | RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3 }
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'AMBIGUOUS'; readonly reasonCodes: readonly ['MULTIPLE_ACTIVE_APPROVALS'] }

export type BrowserBridgeClientResult = RiskAdvisorBridgeRead | { readonly kind: 'UNAVAILABLE'; readonly reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED' }

export interface ClientConnectionRpcLike { call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown> }

export function isBoundedIdentifier(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= BRIDGE_IDENTIFIER_LIMIT }

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return (prototype === Object.prototype || prototype === null) && Reflect.ownKeys(value).every(key => typeof key === 'string' && isDataProperty(value, key))
  } catch { return false }
}

export function parseBridgeRead(value: unknown): RiskAdvisorBridgeRead | undefined {
  try {
    if (!isPlainRecord(value) || typeof own(value, 'kind') !== 'string') return undefined
    const kind = own(value, 'kind')
    if (kind === 'NOT_FOUND') return exactKeys(value, ['kind']) ? Object.freeze({ kind: 'NOT_FOUND' as const }) : undefined
    if (kind === 'AMBIGUOUS') {
      const reasons = own(value, 'reasonCodes')
      if (!exactKeys(value, ['kind', 'reasonCodes']) || !Array.isArray(reasons) || reasons.length !== 1 || reasons[0] !== 'MULTIPLE_ACTIVE_APPROVALS') return undefined
      return Object.freeze({ kind: 'AMBIGUOUS' as const, reasonCodes: Object.freeze(['MULTIPLE_ACTIVE_APPROVALS'] as const) })
    }
    if (kind !== 'VIEW' || !exactKeys(value, ['kind', 'view']) || !isPlainRecord(own(value, 'view'))) return undefined
    const rawView = own(value, 'view') as Record<string, unknown>
    const version = own(rawView, 'schemaVersion')
    const view = version === 1 ? parseV1View(rawView) : version === 2 ? parseV2View(rawView) : version === 3 ? parseV3View(rawView) : undefined
    return view === undefined ? undefined : Object.freeze({ kind: 'VIEW' as const, view })
  } catch { return undefined }
}

export function freezeBridgeRead(value: RiskAdvisorBridgeRead): RiskAdvisorBridgeRead {
  if (value.kind === 'VIEW') return Object.freeze({ kind: 'VIEW' as const, view: freezeView(value.view) })
  if (value.kind === 'AMBIGUOUS') return Object.freeze({ kind: 'AMBIGUOUS' as const, reasonCodes: Object.freeze(['MULTIPLE_ACTIVE_APPROVALS'] as const) })
  return Object.freeze({ kind: 'NOT_FOUND' as const })
}

export function freezeView(view: RiskAdvisorBridgeViewV1 | RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3): RiskAdvisorBridgeViewV1 | RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3 { return deepFreeze({ ...view, reasonCodes: [...view.reasonCodes] }) as RiskAdvisorBridgeViewV1 | RiskAdvisorBridgeViewV2 | RiskAdvisorBridgeViewV3 }
export function isBrowserSafeReasonCode(value: unknown): value is BrowserSafeReasonCode { return typeof value === 'string' && (BROWSER_SAFE_REASON_CODES as readonly string[]).includes(value) }
export function isBrowserSafeReasonCodeV2(value: unknown): value is BrowserSafeReasonCodeV2 { return typeof value === 'string' && (BROWSER_SAFE_REASON_CODES_V2 as readonly string[]).includes(value) }
export function isBrowserSafeReasonCodeV3(value: unknown): value is BrowserSafeReasonCodeV3 { return typeof value === 'string' && (BROWSER_SAFE_REASON_CODES_V3 as readonly string[]).includes(value) }

function parseV1View(value: Record<string, unknown>): RiskAdvisorBridgeViewV1 | undefined {
  if (!exactKeys(value, ['schemaVersion', 'sessionId', 'callId', 'association', 'status', 'stage', 'reasonCodes', 'updatedAt'], ['assessmentId'])) return undefined
  const sessionId = own(value, 'sessionId'); const callId = own(value, 'callId'); const assessmentId = own(value, 'assessmentId'); const reasons = own(value, 'reasonCodes')
  if (own(value, 'schemaVersion') !== 1 || !isBoundedIdentifier(sessionId) || !isBoundedIdentifier(callId) || (own(value, 'association') !== 'BOUND' && own(value, 'association') !== 'UNBOUND') || own(value, 'status') !== 'unavailable' || own(value, 'stage') !== 'not-started' || !Array.isArray(reasons) || reasons.length > BROWSER_SAFE_REASON_CODES.length || reasons.some(reason => !isBrowserSafeReasonCode(reason)) || !finiteNonNegative(own(value, 'updatedAt'))) return undefined
  if (assessmentId !== undefined && !isBoundedIdentifier(assessmentId)) return undefined
  if ((own(value, 'association') === 'BOUND') !== (assessmentId !== undefined)) return undefined
  return deepFreeze({ schemaVersion: 1 as const, sessionId, callId, ...(assessmentId === undefined ? {} : { assessmentId }), association: own(value, 'association'), status: 'unavailable' as const, stage: 'not-started' as const, reasonCodes: [...reasons] as BrowserSafeReasonCode[], updatedAt: own(value, 'updatedAt') }) as RiskAdvisorBridgeViewV1
}

function parseV2View(value: Record<string, unknown>): RiskAdvisorBridgeViewV2 | undefined {
  if (!exactKeys(value, ['schemaVersion', 'sessionId', 'callId', 'association', 'status', 'stage', 'reasonCodes', 'updatedAt'], ['assessmentId', 'operation', 'assessment', 'failureContext'])) return undefined
  const sessionId = own(value, 'sessionId'); const callId = own(value, 'callId'); const assessmentId = own(value, 'assessmentId'); const association = own(value, 'association'); const status = own(value, 'status'); const stage = own(value, 'stage'); const reasons = own(value, 'reasonCodes')
  if (own(value, 'schemaVersion') !== 2 || !isBoundedIdentifier(sessionId) || !isBoundedIdentifier(callId) || (association !== 'BOUND' && association !== 'UNBOUND') || !isEnum(status, ['pending', 'ready', 'unavailable', 'cancelled']) || !isEnum(stage, ['rules', 'fast', 'complete']) || !Array.isArray(reasons) || reasons.length > 24 || reasons.some(reason => !isBrowserSafeReasonCodeV2(reason)) || !finiteNonNegative(own(value, 'updatedAt'))) return undefined
  if (assessmentId !== undefined && !isBoundedIdentifier(assessmentId)) return undefined
  if (association === 'UNBOUND' && assessmentId !== undefined) return undefined
  if (status !== 'pending' && association === 'BOUND' && assessmentId === undefined) return undefined
  if (status === 'pending' && association !== 'BOUND') return undefined
  if (status === 'pending' && stage !== 'rules') return undefined
  if (status === 'ready' && stage === 'rules') return undefined
  if (status === 'cancelled' && stage !== 'complete') return undefined
  const operationValue = own(value, 'operation'); const assessmentValue = own(value, 'assessment'); const failureValue = own(value, 'failureContext')
  const operation = operationValue === undefined ? undefined : parseOperation(operationValue)
  const assessment = assessmentValue === undefined ? undefined : parseAssessment(assessmentValue)
  const failureContext = failureValue === undefined ? undefined : parseFailureContext(failureValue)
  if ((operationValue !== undefined && operation === undefined) || (assessmentValue !== undefined && assessment === undefined) || (failureValue !== undefined && failureContext === undefined)) return undefined
  if (status === 'ready' && (association !== 'BOUND' || assessmentId === undefined || operation === undefined || assessment === undefined || failureContext === undefined)) return undefined
  if ((status === 'pending' || status === 'unavailable' || status === 'cancelled') && assessment !== undefined) return undefined
  return deepFreeze({ schemaVersion: 2 as const, sessionId, callId, ...(assessmentId === undefined ? {} : { assessmentId }), association, status, stage, ...(operation === undefined ? {} : { operation }), ...(assessment === undefined ? {} : { assessment }), ...(failureContext === undefined ? {} : { failureContext }), reasonCodes: [...reasons] as BrowserSafeReasonCodeV2[], updatedAt: own(value, 'updatedAt') }) as RiskAdvisorBridgeViewV2
}

function parseV3View(value: Record<string, unknown>): RiskAdvisorBridgeViewV3 | undefined {
  if (!exactKeys(value, ['schemaVersion', 'sessionId', 'callId', 'association', 'status', 'stage', 'reasonCodes', 'updatedAt'], ['assessmentId', 'operation', 'assessment', 'failureContext', 'evidence'])) return undefined
  const sessionId = own(value, 'sessionId'); const callId = own(value, 'callId'); const assessmentId = own(value, 'assessmentId'); const association = own(value, 'association'); const status = own(value, 'status'); const stage = own(value, 'stage'); const reasons = own(value, 'reasonCodes')
  if (own(value, 'schemaVersion') !== 3 || !isBoundedIdentifier(sessionId) || !isBoundedIdentifier(callId) || (association !== 'BOUND' && association !== 'UNBOUND') || !isEnum(status, ['pending', 'ready', 'unavailable', 'cancelled']) || !isEnum(stage, ['rules', 'fast', 'evidence', 'complete']) || !Array.isArray(reasons) || reasons.length > 32 || reasons.some(reason => !isBrowserSafeReasonCodeV3(reason)) || !finiteNonNegative(own(value, 'updatedAt'))) return undefined
  if (assessmentId !== undefined && !isBoundedIdentifier(assessmentId)) return undefined
  if (association === 'UNBOUND' && assessmentId !== undefined) return undefined
  if (status !== 'pending' && association === 'BOUND' && assessmentId === undefined) return undefined
  if (status === 'pending' && association !== 'BOUND') return undefined
  if (status === 'pending' && stage !== 'rules' && stage !== 'fast' && stage !== 'evidence') return undefined
  if (status === 'ready' && stage === 'rules') return undefined
  if (status === 'cancelled' && stage !== 'complete') return undefined
  const operationValue = own(value, 'operation'); const assessmentValue = own(value, 'assessment'); const failureValue = own(value, 'failureContext'); const evidenceValue = own(value, 'evidence')
  const operation = operationValue === undefined ? undefined : parseOperation(operationValue)
  const assessment = assessmentValue === undefined ? undefined : parseAssessment(assessmentValue)
  const failureContext = failureValue === undefined ? undefined : parseFailureContext(failureValue)
  const evidence = evidenceValue === undefined ? undefined : parseEvidenceSummary(evidenceValue)
  if ((operationValue !== undefined && operation === undefined) || (assessmentValue !== undefined && assessment === undefined) || (failureValue !== undefined && failureContext === undefined) || (evidenceValue !== undefined && evidence === undefined)) return undefined
  if (status === 'ready' && (association !== 'BOUND' || assessmentId === undefined || operation === undefined || assessment === undefined || failureContext === undefined)) return undefined
  if ((status === 'pending' || status === 'unavailable' || status === 'cancelled') && assessment !== undefined) return undefined
  return deepFreeze({ schemaVersion: 3 as const, sessionId, callId, ...(assessmentId === undefined ? {} : { assessmentId }), association, status, stage, ...(operation === undefined ? {} : { operation }), ...(assessment === undefined ? {} : { assessment }), ...(failureContext === undefined ? {} : { failureContext }), ...(evidence === undefined ? {} : { evidence }), reasonCodes: [...reasons] as BrowserSafeReasonCodeV3[], updatedAt: own(value, 'updatedAt') }) as RiskAdvisorBridgeViewV3
}

function parseEvidenceSummary(value: unknown): BrowserEvidenceSummaryV1 | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['status', 'workspaceContained', 'canonicalTargetsKnown', 'versionControlled', 'checkpointAvailable', 'pathAliasObserved', 'itemCount', 'truncated'])) return undefined
  const status = own(value, 'status'); const itemCount = own(value, 'itemCount')
  if (!isEnum(status, ['COMPLETE', 'PARTIAL']) || !boolOrUnknown(own(value, 'workspaceContained')) || !boolOrUnknown(own(value, 'canonicalTargetsKnown')) || !boolOrUnknown(own(value, 'versionControlled')) || !boolOrUnknown(own(value, 'checkpointAvailable')) || !boolOrUnknown(own(value, 'pathAliasObserved')) || !safeCount(itemCount) || typeof own(value, 'truncated') !== 'boolean') return undefined
  return { status, workspaceContained: own(value, 'workspaceContained') as boolean | 'unknown', canonicalTargetsKnown: own(value, 'canonicalTargetsKnown') as boolean | 'unknown', versionControlled: own(value, 'versionControlled') as boolean | 'unknown', checkpointAvailable: own(value, 'checkpointAvailable') as boolean | 'unknown', pathAliasObserved: own(value, 'pathAliasObserved') as boolean | 'unknown', itemCount: itemCount as number, truncated: own(value, 'truncated') as boolean }
}

function parseOperation(value: unknown): OperationPresentationV1 | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['schemaVersion', 'kind', 'toolName', 'title', 'summary', 'resources', 'parserConfidence', 'mutating', 'externalEffect', 'networkEffect', 'workspaceContained', 'sandboxCovered', 'reversible'], ['requestedPermission'])) return undefined
  const kind = own(value, 'kind'); const toolName = own(value, 'toolName'); const title = own(value, 'title'); const summary = own(value, 'summary'); const resources = own(value, 'resources'); const permission = own(value, 'requestedPermission'); const parserConfidence = own(value, 'parserConfidence'); const mutating = own(value, 'mutating'); const externalEffect = own(value, 'externalEffect'); const networkEffect = own(value, 'networkEffect')
  if (own(value, 'schemaVersion') !== 1 || !isEnum(kind, ['filesystem-read', 'filesystem-write', 'filesystem-edit', 'shell', 'network-read', 'unknown']) || !boundedString(toolName, 128, true) || !boundedString(title, 160, true) || !boundedString(summary, 1200) || !Array.isArray(resources) || resources.length > 8 || !isEnum(parserConfidence, ['high', 'medium', 'low']) || !boolOrUnknown(mutating) || !boolOrUnknown(externalEffect) || !isEnum(networkEffect, ['none', 'read', 'write', 'unknown']) || own(value, 'workspaceContained') !== 'unknown' || own(value, 'sandboxCovered') !== 'unknown' || own(value, 'reversible') !== 'unknown' || (permission !== undefined && !isEnum(permission, ['workspace-write', 'danger-full-access']))) return undefined
  const parsed = resources.map(parseResource)
  return parsed.some(item => item === undefined) ? undefined : { schemaVersion: 1, kind, toolName, title, summary, resources: parsed as OperationPresentationV1['resources'], ...(permission === undefined ? {} : { requestedPermission: permission }), parserConfidence, mutating, externalEffect, networkEffect, workspaceContained: 'unknown', sandboxCovered: 'unknown', reversible: 'unknown' }
}

function parseResource(value: unknown): OperationPresentationV1['resources'][number] | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['kind', 'label'])) return undefined
  const kind = own(value, 'kind'); const label = own(value, 'label')
  return isEnum(kind, ['path', 'url', 'query', 'workdir', 'other']) && boundedString(label, 512) ? { kind, label } : undefined
}

function parseAssessment(value: unknown): BrowserRiskAssessmentV1 | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['schemaVersion', 'assessmentId', 'status', 'dimensions', 'aggregate', 'findings', 'uncertainties', 'alternatives', 'evidence', 'judgeAssisted'], ['supersedesAssessmentId'])) return undefined
  const dimensions = own(value, 'dimensions'); const aggregate = own(value, 'aggregate'); const findings = own(value, 'findings'); const uncertainties = own(value, 'uncertainties'); const alternatives = own(value, 'alternatives'); const evidence = own(value, 'evidence'); const supersedes = own(value, 'supersedesAssessmentId')
  if (own(value, 'schemaVersion') !== 1 || !isBoundedIdentifier(own(value, 'assessmentId')) || !isEnum(own(value, 'status'), ['COMPLETE', 'PARTIAL', 'DEGRADED']) || !isPlainRecord(dimensions) || !exactKeys(dimensions, ['risk', 'authorization', 'necessity', 'privilege', 'alternatives', 'evidenceQuality']) || !isPlainRecord(aggregate) || parseAggregate(aggregate) === undefined || !Array.isArray(findings) || findings.length > 32 || !Array.isArray(uncertainties) || uncertainties.length > 16 || !Array.isArray(alternatives) || alternatives.length > 3 || !isPlainRecord(evidence) || !exactKeys(evidence, ['ledgerHealth']) || !isEnum(own(evidence, 'ledgerHealth'), ['HEALTHY', 'RECOVERED', 'DEGRADED']) || typeof own(value, 'judgeAssisted') !== 'boolean') return undefined
  const dimensionValues = ['risk', 'authorization', 'necessity', 'privilege', 'alternatives', 'evidenceQuality'].map(key => parseDimension(own(dimensions, key), key))
  const parsedFindings = findings.map(parseFinding); const parsedUncertainties = uncertainties.map(parseUncertainty); const parsedAlternatives = alternatives.map(parseAlternative)
  if (dimensionValues.some(item => item === undefined) || parsedFindings.some(item => item === undefined) || parsedUncertainties.some(item => item === undefined) || parsedAlternatives.some(item => item === undefined) || (supersedes !== undefined && !isBoundedIdentifier(supersedes))) return undefined
  return { schemaVersion: 1, assessmentId: own(value, 'assessmentId'), status: own(value, 'status'), dimensions: { risk: dimensionValues[0]!, authorization: dimensionValues[1]!, necessity: dimensionValues[2]!, privilege: dimensionValues[3]!, alternatives: dimensionValues[4]!, evidenceQuality: dimensionValues[5]! }, aggregate: parseAggregate(aggregate)!, findings: parsedFindings as BrowserRiskAssessmentV1['findings'], uncertainties: parsedUncertainties as BrowserRiskAssessmentV1['uncertainties'], alternatives: parsedAlternatives as BrowserRiskAssessmentV1['alternatives'], evidence: { ledgerHealth: own(evidence, 'ledgerHealth') }, judgeAssisted: own(value, 'judgeAssisted'), ...(supersedes === undefined ? {} : { supersedesAssessmentId: supersedes }) } as BrowserRiskAssessmentV1
}

function parseDimension(value: unknown, key: string): BrowserDimension | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['verdict', 'source', 'evidenceQuality', 'reasons']) || !boundedString(own(value, 'verdict'), 64, true) || !isEnum(own(value, 'source'), ['RULE', 'JUDGE', 'MIXED', 'UNKNOWN']) || !isEnum(own(value, 'evidenceQuality'), ['HIGH', 'MEDIUM', 'LOW'])) return undefined
  if (!validDimensionVerdict(key, own(value, 'verdict'))) return undefined
  const reasons = own(value, 'reasons'); if (!Array.isArray(reasons) || reasons.length > 8) return undefined
  const parsed = reasons.map(reason => isPlainRecord(reason) && exactKeys(reason, ['code', 'message']) && boundedString(own(reason, 'code'), 256, true) && boundedString(own(reason, 'message'), 256) ? { code: own(reason, 'code'), message: own(reason, 'message') } : undefined)
  return parsed.some(item => item === undefined) ? undefined : { verdict: own(value, 'verdict'), source: own(value, 'source'), evidenceQuality: own(value, 'evidenceQuality'), reasons: parsed as BrowserDimension['reasons'] } as BrowserDimension
}

function parseAggregate(value: Record<string, unknown>): BrowserRiskAssessmentV1['aggregate'] | undefined {
  if (!exactKeys(value, ['recommendation', 'hazardLevel', 'attention', 'primaryReasonCodes'])) return undefined
  const codes = own(value, 'primaryReasonCodes')
  if (!isEnum(own(value, 'recommendation'), ['APPROVE', 'APPROVE_WITH_CAUTION', 'PREFER_SAFER_ALTERNATIVE', 'NEED_MORE_INFORMATION', 'REJECT_RECOMMENDED']) || !isEnum(own(value, 'hazardLevel'), ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN']) || !isEnum(own(value, 'attention'), ['NORMAL', 'ELEVATED', 'URGENT']) || !Array.isArray(codes) || codes.length > 8 || codes.some(code => !boundedString(code, 128, true))) return undefined
  return { recommendation: own(value, 'recommendation'), hazardLevel: own(value, 'hazardLevel'), attention: own(value, 'attention'), primaryReasonCodes: [...codes] } as BrowserRiskAssessmentV1['aggregate']
}

function parseFinding(value: unknown): BrowserRiskAssessmentV1['findings'][number] | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['code', 'title', 'detail', 'dimension', 'severity', 'strength'])) return undefined
  return boundedString(own(value, 'code'), 128, true) && boundedString(own(value, 'title'), 160, true) && boundedString(own(value, 'detail'), 800) && isEnum(own(value, 'dimension'), ['RISK', 'AUTHORIZATION', 'NECESSITY', 'PRIVILEGE', 'ALTERNATIVES', 'EVIDENCE_QUALITY']) && isEnum(own(value, 'severity'), ['INFO', 'WARNING', 'SERIOUS', 'CRITICAL']) && isEnum(own(value, 'strength'), ['AUTHORITATIVE', 'DETERMINISTIC', 'INFERRED', 'JUDGE']) ? { code: own(value, 'code'), title: own(value, 'title'), detail: own(value, 'detail'), dimension: own(value, 'dimension'), severity: own(value, 'severity'), strength: own(value, 'strength') } as BrowserRiskAssessmentV1['findings'][number] : undefined
}

function parseUncertainty(value: unknown): BrowserRiskAssessmentV1['uncertainties'][number] | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['code', 'description', 'impact'], ['dimension', 'resolutionHint'])) return undefined
  const dimension = own(value, 'dimension'); const hint = own(value, 'resolutionHint')
  if (!boundedString(own(value, 'code'), 128, true) || !boundedString(own(value, 'description'), 800) || (dimension !== undefined && !isEnum(dimension, ['RISK', 'AUTHORIZATION', 'NECESSITY', 'PRIVILEGE', 'ALTERNATIVES', 'EVIDENCE_QUALITY'])) || !isEnum(own(value, 'impact'), ['LOW', 'MEDIUM', 'HIGH']) || (hint !== undefined && !boundedString(hint, 800))) return undefined
  return { code: own(value, 'code'), description: own(value, 'description'), ...(dimension === undefined ? {} : { dimension }), impact: own(value, 'impact'), ...(hint === undefined ? {} : { resolutionHint: hint }) } as BrowserRiskAssessmentV1['uncertainties'][number]
}

function parseAlternative(value: unknown): BrowserRiskAssessmentV1['alternatives'][number] | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['title', 'description', 'source', 'verification'])) return undefined
  return boundedString(own(value, 'title'), 160, true) && boundedString(own(value, 'description'), 800) && isEnum(own(value, 'source'), ['REGISTERED_RECIPE', 'HISTORICAL_SUCCESS', 'CAPABILITY_RULE', 'MODEL_SUGGESTED']) && isEnum(own(value, 'verification'), ['VERIFIED', 'UNVERIFIED']) ? { title: own(value, 'title'), description: own(value, 'description'), source: own(value, 'source'), verification: own(value, 'verification') } as BrowserRiskAssessmentV1['alternatives'][number] : undefined
}

function parseFailureContext(value: unknown): FailureContextPresentationV1 | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['schemaVersion', 'retryCount', 'recentFailureCount', 'sameRootCause', 'permissionEscalation', 'truncated']) || own(value, 'schemaVersion') !== 1 || !safeCount(own(value, 'retryCount')) || !safeCount(own(value, 'recentFailureCount')) || !boolOrUnknown(own(value, 'sameRootCause')) || !boolOrUnknown(own(value, 'permissionEscalation')) || typeof own(value, 'truncated') !== 'boolean') return undefined
  return { schemaVersion: 1, retryCount: own(value, 'retryCount'), recentFailureCount: own(value, 'recentFailureCount'), sameRootCause: own(value, 'sameRootCause'), permissionEscalation: own(value, 'permissionEscalation'), truncated: own(value, 'truncated') } as FailureContextPresentationV1
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean { const allowed = new Set([...required, ...optional]); const keys = Object.keys(value); return required.every(key => Object.hasOwn(value, key)) && keys.every(key => allowed.has(key)) }
function own(value: Record<string, unknown>, key: string): unknown { return value[key] }
function isDataProperty(value: object, key: string): boolean { const descriptor = Object.getOwnPropertyDescriptor(value, key); return descriptor !== undefined && 'value' in descriptor }
function boundedString(value: unknown, limit: number, nonEmpty = false): value is string { return typeof value === 'string' && value.length <= limit && (!nonEmpty || value.length > 0) }
function finiteNonNegative(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0 }
function safeCount(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000 }
function boolOrUnknown(value: unknown): value is boolean | 'unknown' { return typeof value === 'boolean' || value === 'unknown' }
function isEnum<T extends string>(value: unknown, values: readonly T[]): value is T { return typeof value === 'string' && values.includes(value as T) }
function validDimensionVerdict(key: string, value: unknown): boolean {
  if (key === 'risk') return isEnum(value, ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'UNKNOWN'])
  if (key === 'authorization') return isEnum(value, ['EXPLICITLY_AUTHORIZED', 'PARTIALLY_AUTHORIZED', 'NOT_AUTHORIZED', 'EXPLICITLY_DENIED', 'UNKNOWN'])
  if (key === 'necessity') return isEnum(value, ['NECESSARY', 'LIKELY_NECESSARY', 'NOT_NECESSARY', 'UNKNOWN'])
  if (key === 'privilege') return isEnum(value, ['MINIMAL', 'PROPORTIONATE', 'EXCESSIVE', 'UNKNOWN'])
  if (key === 'alternatives') return isEnum(value, ['SAFER_ALTERNATIVE_AVAILABLE', 'NO_KNOWN_SAFER_ALTERNATIVE', 'UNKNOWN'])
  return isEnum(value, ['HIGH', 'MEDIUM', 'LOW'])
}
function deepFreeze<T>(value: T): T { if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value; Object.freeze(value); if (Array.isArray(value)) for (const item of value) deepFreeze(item); else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); return value }
