import { isBoundedIdentifier, isPlainRecord } from './bridge-contract.ts'
import { parseHistoricalContextRead, type HistoricalContextV1 } from './historical-context-contract.ts'
import type { LiveCorrectionFindingKind } from './host/live-correction.ts'

export const CORRECTION_HISTORICAL_CONTEXT_RPC_CHANNEL = '/api' as const
export const CORRECTION_HISTORICAL_CONTEXT_ENDPOINT = 'risk-advisor/correction-historical-context' as const
export const CORRECTION_HISTORICAL_CONTEXT_ROUTE = '/api/risk-advisor/correction-historical-context' as const
export const CORRECTION_HISTORICAL_CONTEXT_MAX_RESPONSE_CHARS = 24_000
export const CORRECTION_HISTORICAL_CONTEXT_REASON_CODES_V1 = [
  'GUIDANCE_UNAVAILABLE', 'PROJECTION_UNAVAILABLE', 'BINDING_UNAVAILABLE',
] as const
export type CorrectionHistoricalContextReasonCodeV1 = typeof CORRECTION_HISTORICAL_CONTEXT_REASON_CODES_V1[number]

export interface CorrectionHistoricalContextRequestV1 {
  readonly sessionId: string
  readonly findingId: string
}

export type CorrectionHistoricalContextReadV1 =
  | {
      readonly schemaVersion: 1
      readonly kind: 'VIEW'
      readonly sessionId: string
      readonly findingId: string
      readonly findingKind: LiveCorrectionFindingKind
      readonly historical: HistoricalContextV1
      readonly observedAt: number
    }
  | { readonly schemaVersion: 1; readonly kind: 'NOT_FOUND'; readonly sessionId: string; readonly findingId: string }
  | {
      readonly schemaVersion: 1
      readonly kind: 'UNAVAILABLE'
      readonly sessionId: string
      readonly findingId: string
      readonly reasonCodes: readonly CorrectionHistoricalContextReasonCodeV1[]
    }

export type CorrectionHistoricalContextClientResult = CorrectionHistoricalContextReadV1
  | { readonly kind: 'CLIENT_UNAVAILABLE'; readonly reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED' }

export function isCorrectionHistoricalFindingId(value: unknown): value is string {
  return typeof value === 'string' && /^ra-correction-v1_[a-f0-9]{64}$/.test(value)
}

export function parseCorrectionHistoricalContextRequest(value: unknown): CorrectionHistoricalContextRequestV1 | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['sessionId', 'findingId'])
    || !isBoundedIdentifier(value.sessionId) || !isCorrectionHistoricalFindingId(value.findingId)) return undefined
  return Object.freeze({ sessionId: value.sessionId, findingId: value.findingId })
}

export function parseCorrectionHistoricalContextRead(value: unknown): CorrectionHistoricalContextReadV1 | undefined {
  try {
    if (!isPlainRecord(value) || value.schemaVersion !== 1
      || !isBoundedIdentifier(value.sessionId) || !isCorrectionHistoricalFindingId(value.findingId)) return undefined
    const { sessionId, findingId } = value as { sessionId: string; findingId: string }
    if (value.kind === 'NOT_FOUND') return exactKeys(value, ['schemaVersion', 'kind', 'sessionId', 'findingId'])
      ? Object.freeze({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, findingId }) : undefined
    if (value.kind === 'UNAVAILABLE') {
      const reasons = value.reasonCodes
      if (!exactKeys(value, ['schemaVersion', 'kind', 'sessionId', 'findingId', 'reasonCodes'])
        || !Array.isArray(reasons) || reasons.length < 1 || reasons.length > CORRECTION_HISTORICAL_CONTEXT_REASON_CODES_V1.length
        || reasons.some((reason, index) => !CORRECTION_HISTORICAL_CONTEXT_REASON_CODES_V1.includes(reason as CorrectionHistoricalContextReasonCodeV1)
          || reasons.indexOf(reason) !== index)) return undefined
      return deepFreeze({ schemaVersion: 1 as const, kind: 'UNAVAILABLE' as const, sessionId, findingId,
        reasonCodes: [...reasons] as CorrectionHistoricalContextReasonCodeV1[] })
    }
    if (value.kind !== 'VIEW' || !exactKeys(value, [
      'schemaVersion', 'kind', 'sessionId', 'findingId', 'findingKind', 'historical', 'observedAt',
    ]) || (value.findingKind !== 'REPEATED_FAILURE_WITHOUT_PROGRESS' && value.findingKind !== 'POSTCONDITION_NOT_SATISFIED')
      || typeof value.observedAt !== 'number' || !Number.isSafeInteger(value.observedAt) || value.observedAt < 0) return undefined
    // Reuse the frozen Phase 14.2 HistoricalContextV1 validator without changing its wire contract.
    const historicalRead = parseHistoricalContextRead({
      schemaVersion: 1, kind: 'VIEW', sessionId, executionId: 'correction-context-internal',
      assessmentId: 'correction-context-internal', historical: value.historical, observedAt: value.observedAt,
    })
    if (historicalRead?.kind !== 'VIEW') return undefined
    const parsed: CorrectionHistoricalContextReadV1 = {
      schemaVersion: 1, kind: 'VIEW', sessionId, findingId,
      findingKind: value.findingKind, historical: historicalRead.historical, observedAt: value.observedAt,
    }
    if (JSON.stringify(parsed).length > CORRECTION_HISTORICAL_CONTEXT_MAX_RESPONSE_CHARS) return undefined
    return deepFreeze(parsed)
  } catch { return undefined }
}

export function freezeCorrectionHistoricalContextRead(value: CorrectionHistoricalContextReadV1): CorrectionHistoricalContextReadV1 | undefined {
  return parseCorrectionHistoricalContextRead(value)
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
