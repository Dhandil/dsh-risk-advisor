import { isBoundedIdentifier, isPlainRecord } from './bridge-contract.ts'
import {
  HISTORICAL_CONTEXT_REASON_CODES_V1,
  parseHistoricalContextRead,
  type HistoricalContextV1,
} from './historical-context-contract.ts'

export const APPROVAL_HISTORICAL_CONTEXT_ENDPOINT = 'risk-advisor/approval-historical-context' as const
export const APPROVAL_HISTORICAL_CONTEXT_ROUTE = '/api/risk-advisor/approval-historical-context' as const
export const APPROVAL_HISTORICAL_CONTEXT_REASON_CODES_V1 = HISTORICAL_CONTEXT_REASON_CODES_V1
export type ApprovalHistoricalContextReasonCodeV1 = typeof APPROVAL_HISTORICAL_CONTEXT_REASON_CODES_V1[number]

export interface ApprovalHistoricalContextRequestV1 {
  readonly sessionId: string
  readonly callId: string
}

export type ApprovalHistoricalContextReadV1 =
  | {
      readonly schemaVersion: 1
      readonly kind: 'VIEW'
      readonly sessionId: string
      readonly callId: string
      readonly approvalId: string
      readonly executionId: string
      readonly baseAssessmentId: string
      readonly historical: HistoricalContextV1
      readonly observedAt: number
    }
  | { readonly schemaVersion: 1; readonly kind: 'NOT_FOUND'; readonly sessionId: string; readonly callId: string }
  | {
      readonly schemaVersion: 1
      readonly kind: 'UNAVAILABLE'
      readonly sessionId: string
      readonly callId: string
      readonly reasonCodes: readonly ApprovalHistoricalContextReasonCodeV1[]
    }

export type ApprovalHistoricalContextClientResult = ApprovalHistoricalContextReadV1
  | { readonly kind: 'CLIENT_UNAVAILABLE'; readonly reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED' }

export function parseApprovalHistoricalContextRequest(value: unknown): ApprovalHistoricalContextRequestV1 | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['sessionId', 'callId'])
    || !isBoundedIdentifier(value.sessionId) || !isBoundedIdentifier(value.callId)) return undefined
  return Object.freeze({ sessionId: value.sessionId, callId: value.callId })
}

export function parseApprovalHistoricalContextRead(value: unknown): ApprovalHistoricalContextReadV1 | undefined {
  try {
    if (!isPlainRecord(value) || own(value, 'schemaVersion') !== 1
      || !isBoundedIdentifier(own(value, 'sessionId')) || !isBoundedIdentifier(own(value, 'callId'))) return undefined
    const kind = own(value, 'kind')
    const sessionId = own(value, 'sessionId') as string
    const callId = own(value, 'callId') as string
    if (kind === 'NOT_FOUND') return exactKeys(value, ['schemaVersion', 'kind', 'sessionId', 'callId'])
      ? Object.freeze({ schemaVersion: 1, kind, sessionId, callId }) : undefined
    if (kind === 'UNAVAILABLE') {
      const reasons = own(value, 'reasonCodes')
      if (!exactKeys(value, ['schemaVersion', 'kind', 'sessionId', 'callId', 'reasonCodes'])
        || !Array.isArray(reasons) || reasons.length !== 1
        || !APPROVAL_HISTORICAL_CONTEXT_REASON_CODES_V1.includes(reasons[0] as ApprovalHistoricalContextReasonCodeV1)) return undefined
      return deepFreeze({ schemaVersion: 1 as const, kind, sessionId, callId, reasonCodes: [...reasons] as ApprovalHistoricalContextReasonCodeV1[] })
    }
    if (kind !== 'VIEW' || !exactKeys(value, [
      'schemaVersion', 'kind', 'sessionId', 'callId', 'approvalId', 'executionId', 'baseAssessmentId', 'historical', 'observedAt',
    ])) return undefined
    const approvalId = own(value, 'approvalId')
    const executionId = own(value, 'executionId')
    const baseAssessmentId = own(value, 'baseAssessmentId')
    const observedAt = own(value, 'observedAt')
    if (!isBoundedIdentifier(approvalId) || !isBoundedIdentifier(executionId) || !isBoundedIdentifier(baseAssessmentId)
      || typeof observedAt !== 'number' || !Number.isSafeInteger(observedAt) || observedAt < 0) return undefined
    // Reuse the accepted five-field historical parser without changing its V1 wire.
    const historicalRead = parseHistoricalContextRead({
      schemaVersion: 1, kind: 'VIEW', sessionId, executionId, assessmentId: baseAssessmentId,
      historical: own(value, 'historical'), observedAt,
    })
    if (historicalRead?.kind !== 'VIEW') return undefined
    return deepFreeze({ schemaVersion: 1 as const, kind, sessionId, callId, approvalId, executionId, baseAssessmentId,
      historical: historicalRead.historical, observedAt })
  } catch { return undefined }
}

export function freezeApprovalHistoricalContextRead(value: ApprovalHistoricalContextReadV1): ApprovalHistoricalContextReadV1 | undefined {
  return parseApprovalHistoricalContextRead(value)
}

function exactKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value)
  return keys.length === required.length && required.every(key => Object.hasOwn(value, key))
    && keys.every(key => typeof key === 'string' && required.includes(key))
}
function own(value: Record<string, unknown>, key: string): unknown { return value[key] }
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  if (Array.isArray(value)) for (const item of value) deepFreeze(item)
  else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return value
}
