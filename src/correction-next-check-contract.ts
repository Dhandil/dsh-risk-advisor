import { isBoundedIdentifier, isPlainRecord } from './bridge-contract.ts'
import type { LiveCorrectionFindingKind } from './host/live-correction.ts'

export const CORRECTION_NEXT_CHECK_RPC_CHANNEL = '/api' as const
export const CORRECTION_NEXT_CHECK_ENDPOINT = 'risk-advisor/correction-next-check' as const
export const CORRECTION_NEXT_CHECK_ROUTE = '/api/risk-advisor/correction-next-check' as const
export const CORRECTION_NEXT_CHECK_MAX_RESPONSE_CHARS = 4096
export const CORRECTION_NEXT_CHECK_REASON_CODES_V1 = ['EVIDENCE_UNAVAILABLE', 'PROJECTION_UNAVAILABLE'] as const
export type CorrectionNextCheckReasonCodeV1 = typeof CORRECTION_NEXT_CHECK_REASON_CODES_V1[number]

export type CorrectionNextCheckEvidenceCodeV1 =
  | 'F1_CONTIGUOUS_RETRY_FINDING_V1'
  | 'F2_CURRENT_VERIFIED_MISMATCH_V1'

export type CorrectionNextCheckCodeV1 =
  | 'REVIEW_EXACT_RETRY_PREREQUISITES_V1'
  | 'INSPECT_WRITTEN_CONTENT_V1'
  | 'INSPECT_EDIT_REPLACEMENT_V1'
  | 'CHECK_DIRECTORY_POSTSTATE_V1'
  | 'CHECK_COPY_DESTINATION_V1'
  | 'CHECK_ACTIVE_GIT_BRANCH_V1'
  | 'CHECK_DEPENDENCY_RESOLUTION_V1'

export interface CorrectionNextCheckRequestV1 {
  readonly sessionId: string
  readonly findingId: string
}

export type CorrectionNextCheckReadV1 =
  | {
      readonly schemaVersion: 1
      readonly kind: 'VIEW'
      readonly sessionId: string
      readonly findingId: string
      readonly findingKind: LiveCorrectionFindingKind
      readonly checkCode: CorrectionNextCheckCodeV1
      readonly evidenceCode: CorrectionNextCheckEvidenceCodeV1
      readonly observedAt: number
    }
  | { readonly schemaVersion: 1; readonly kind: 'NOT_FOUND'; readonly sessionId: string; readonly findingId: string }
  | {
      readonly schemaVersion: 1
      readonly kind: 'UNAVAILABLE'
      readonly sessionId: string
      readonly findingId: string
      readonly reasonCodes: readonly CorrectionNextCheckReasonCodeV1[]
    }

export type CorrectionNextCheckClientResult = CorrectionNextCheckReadV1
  | { readonly kind: 'CLIENT_UNAVAILABLE'; readonly reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED' }

const F1_CHECK: CorrectionNextCheckCodeV1 = 'REVIEW_EXACT_RETRY_PREREQUISITES_V1'
const F2_CHECKS = new Set<CorrectionNextCheckCodeV1>([
  'INSPECT_WRITTEN_CONTENT_V1', 'INSPECT_EDIT_REPLACEMENT_V1', 'CHECK_DIRECTORY_POSTSTATE_V1',
  'CHECK_COPY_DESTINATION_V1', 'CHECK_ACTIVE_GIT_BRANCH_V1', 'CHECK_DEPENDENCY_RESOLUTION_V1',
])

export function isCorrectionNextCheckFindingId(value: unknown): value is string {
  return typeof value === 'string' && /^ra-correction-v1_[a-f0-9]{64}$/.test(value)
}

export function parseCorrectionNextCheckRequest(value: unknown): CorrectionNextCheckRequestV1 | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['sessionId', 'findingId'])
    || !isBoundedIdentifier(value.sessionId) || !isCorrectionNextCheckFindingId(value.findingId)) return undefined
  return Object.freeze({ sessionId: value.sessionId, findingId: value.findingId })
}

export function parseCorrectionNextCheckRead(value: unknown): CorrectionNextCheckReadV1 | undefined {
  try {
    if (!isPlainRecord(value) || value.schemaVersion !== 1
      || !isBoundedIdentifier(value.sessionId) || !isCorrectionNextCheckFindingId(value.findingId)) return undefined
    const { sessionId, findingId } = value as { sessionId: string; findingId: string }
    if (value.kind === 'NOT_FOUND') return exactKeys(value, ['schemaVersion', 'kind', 'sessionId', 'findingId'])
      ? Object.freeze({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, findingId }) : undefined
    if (value.kind === 'UNAVAILABLE') {
      const reasons = value.reasonCodes
      if (!exactKeys(value, ['schemaVersion', 'kind', 'sessionId', 'findingId', 'reasonCodes'])
        || !Array.isArray(reasons) || reasons.length !== 1
        || !CORRECTION_NEXT_CHECK_REASON_CODES_V1.includes(reasons[0] as CorrectionNextCheckReasonCodeV1)) return undefined
      return deepFreeze({ schemaVersion: 1 as const, kind: 'UNAVAILABLE' as const, sessionId, findingId,
        reasonCodes: [...reasons] as CorrectionNextCheckReasonCodeV1[] })
    }
    if (value.kind !== 'VIEW' || !exactKeys(value, [
      'schemaVersion', 'kind', 'sessionId', 'findingId', 'findingKind', 'checkCode', 'evidenceCode', 'observedAt',
    ]) || (value.findingKind !== 'REPEATED_FAILURE_WITHOUT_PROGRESS' && value.findingKind !== 'POSTCONDITION_NOT_SATISFIED')
      || typeof value.observedAt !== 'number' || !Number.isSafeInteger(value.observedAt) || value.observedAt < 0) return undefined
    const findingKind = value.findingKind as LiveCorrectionFindingKind
    const evidenceCode = value.evidenceCode as CorrectionNextCheckEvidenceCodeV1
    const checkCode = value.checkCode as CorrectionNextCheckCodeV1
    const validPair = findingKind === 'REPEATED_FAILURE_WITHOUT_PROGRESS'
      ? evidenceCode === 'F1_CONTIGUOUS_RETRY_FINDING_V1' && checkCode === F1_CHECK
      : evidenceCode === 'F2_CURRENT_VERIFIED_MISMATCH_V1' && F2_CHECKS.has(checkCode)
    if (!validPair) return undefined
    const parsed: CorrectionNextCheckReadV1 = {
      schemaVersion: 1, kind: 'VIEW', sessionId, findingId, findingKind, checkCode, evidenceCode,
      observedAt: value.observedAt,
    }
    if (!withinResponseBound(parsed)) return undefined
    return Object.freeze(parsed)
  } catch { return undefined }
}

export function freezeCorrectionNextCheckRead(value: CorrectionNextCheckReadV1): CorrectionNextCheckReadV1 | undefined {
  return parseCorrectionNextCheckRead(value)
}

function withinResponseBound(value: CorrectionNextCheckReadV1): boolean {
  const serialized = JSON.stringify(value)
  return serialized.length <= CORRECTION_NEXT_CHECK_MAX_RESPONSE_CHARS
    && new TextEncoder().encode(serialized).byteLength <= CORRECTION_NEXT_CHECK_MAX_RESPONSE_CHARS
}

function exactKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value)
  return keys.length === required.length && required.every(key => Object.hasOwn(value, key))
    && keys.every(key => typeof key === 'string' && required.includes(key))
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  if (Array.isArray(value)) for (const child of value) deepFreeze(child)
  else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return value
}
