import { isBoundedIdentifier, isPlainRecord } from './bridge-contract.ts'

export const HISTORICAL_CONTEXT_ENDPOINT = 'risk-advisor/historical-context' as const
export const HISTORICAL_CONTEXT_ROUTE = '/api/risk-advisor/historical-context' as const
export const HISTORICAL_CONTEXT_REASON_CODES_V1 = ['GUIDANCE_UNAVAILABLE', 'PROJECTION_UNAVAILABLE'] as const
export type HistoricalContextReasonCodeV1 = typeof HISTORICAL_CONTEXT_REASON_CODES_V1[number]

export interface HistoricalContextV1 {
  readonly guidanceId: string
  readonly guidanceRevisionId: string
  readonly patternId: string
  readonly patternRevisionId: string
  readonly patternProvenanceDigest: string
  readonly evidenceStrength: 'QUALIFIED_PATTERN'
  readonly supportCount: number
  readonly supportUtcDateCount: number
  readonly title: 'Verified historical pattern'
  readonly observation: string
  readonly contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.'
  readonly nextCheck: 'Independently verify the current target and expected postcondition.'
  readonly authorityNotice: 'This guidance does not determine risk or grant permission or approval.'
}

export type HistoricalContextReadV1 =
  | {
      readonly schemaVersion: 1
      readonly kind: 'VIEW'
      readonly sessionId: string
      readonly executionId: string
      readonly assessmentId: string
      readonly historical: HistoricalContextV1
      readonly observedAt: number
    }
  | { readonly schemaVersion: 1; readonly kind: 'NOT_FOUND'; readonly sessionId: string }
  | {
      readonly schemaVersion: 1
      readonly kind: 'UNAVAILABLE'
      readonly sessionId: string
      readonly reasonCodes: readonly HistoricalContextReasonCodeV1[]
    }

export type HistoricalContextClientResult = HistoricalContextReadV1
  | { readonly kind: 'CLIENT_UNAVAILABLE'; readonly reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED' }

export function parseHistoricalContextRead(value: unknown): HistoricalContextReadV1 | undefined {
  try {
    if (!isPlainRecord(value) || own(value, 'schemaVersion') !== 1 || !isBoundedIdentifier(own(value, 'sessionId'))) return undefined
    const kind = own(value, 'kind')
    const sessionId = own(value, 'sessionId') as string
    if (kind === 'NOT_FOUND') {
      return exactKeys(value, ['schemaVersion', 'kind', 'sessionId'])
        ? Object.freeze({ schemaVersion: 1, kind, sessionId })
        : undefined
    }
    if (kind === 'UNAVAILABLE') {
      const reasons = own(value, 'reasonCodes')
      if (!exactKeys(value, ['schemaVersion', 'kind', 'sessionId', 'reasonCodes'])
        || !Array.isArray(reasons) || reasons.length !== 1
        || !HISTORICAL_CONTEXT_REASON_CODES_V1.includes(reasons[0] as HistoricalContextReasonCodeV1)) return undefined
      return deepFreeze({ schemaVersion: 1 as const, kind, sessionId, reasonCodes: [...reasons] as HistoricalContextReasonCodeV1[] })
    }
    if (kind !== 'VIEW' || !exactKeys(value, ['schemaVersion', 'kind', 'sessionId', 'executionId', 'assessmentId', 'historical', 'observedAt'])) return undefined
    const executionId = own(value, 'executionId')
    const assessmentId = own(value, 'assessmentId')
    const historical = parseHistorical(own(value, 'historical'))
    const observedAt = own(value, 'observedAt')
    if (!isBoundedIdentifier(executionId) || !isBoundedIdentifier(assessmentId)
      || historical === undefined || !safeTimestamp(observedAt)) return undefined
    return deepFreeze({ schemaVersion: 1 as const, kind, sessionId, executionId, assessmentId, historical, observedAt })
  } catch { return undefined }
}

export function freezeHistoricalContextRead(value: HistoricalContextReadV1): HistoricalContextReadV1 | undefined {
  return parseHistoricalContextRead(value)
}

function parseHistorical(value: unknown): HistoricalContextV1 | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, [
    'guidanceId', 'guidanceRevisionId', 'patternId', 'patternRevisionId', 'patternProvenanceDigest',
    'evidenceStrength', 'supportCount', 'supportUtcDateCount', 'title', 'observation',
    'contextCaveat', 'nextCheck', 'authorityNotice',
  ])) return undefined
  const guidanceId = own(value, 'guidanceId')
  const guidanceRevisionId = own(value, 'guidanceRevisionId')
  const patternId = own(value, 'patternId')
  const patternRevisionId = own(value, 'patternRevisionId')
  const digest = own(value, 'patternProvenanceDigest')
  const supportCount = own(value, 'supportCount')
  const supportUtcDateCount = own(value, 'supportUtcDateCount')
  const patternRevision = typeof patternRevisionId === 'string' ? /^ra-pattern-v1_([a-f0-9]{64})_([0-9]{8})$/.exec(patternRevisionId) : null
  const guidanceRevision = typeof guidanceRevisionId === 'string' ? /^ra-guidance-v1_([a-f0-9]{64})_([0-9]{8})$/.exec(guidanceRevisionId) : null
  if (!isBoundedIdentifier(guidanceId) || !/^ra-guidance-v1_[a-f0-9]{64}$/.test(guidanceId)
    || !isBoundedIdentifier(patternId) || !/^ra-pattern-v1_[a-f0-9]{64}$/.test(patternId)
    || patternRevision === null || patternRevision[0] !== patternRevisionId || patternRevision[1] !== patternId.slice('ra-pattern-v1_'.length)
    || guidanceRevision === null || guidanceRevision[1] !== guidanceId.slice('ra-guidance-v1_'.length)
    || patternRevision[2] !== guidanceRevision[2]
    || typeof digest !== 'string' || !/^[a-f0-9]{64}$/.test(digest)
    || own(value, 'evidenceStrength') !== 'QUALIFIED_PATTERN'
    || !boundedCount(supportCount, 3, 10_000) || !boundedCount(supportUtcDateCount, 2, 10_000)
    || own(value, 'title') !== 'Verified historical pattern'
    || own(value, 'observation') !== `A qualified verified-success pattern covers ${supportCount} distinct Episodes across ${supportUtcDateCount} UTC dates.`
    || own(value, 'contextCaveat') !== 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.'
    || own(value, 'nextCheck') !== 'Independently verify the current target and expected postcondition.'
    || own(value, 'authorityNotice') !== 'This guidance does not determine risk or grant permission or approval.') return undefined
  return Object.freeze({
    guidanceId,
    guidanceRevisionId: guidanceRevisionId as string,
    patternId,
    patternRevisionId: patternRevisionId as string,
    patternProvenanceDigest: digest,
    evidenceStrength: 'QUALIFIED_PATTERN',
    supportCount,
    supportUtcDateCount,
    title: 'Verified historical pattern',
    observation: own(value, 'observation') as string,
    contextCaveat: 'Historical evidence is advisory only; it does not establish that the current operation is safe or correctly targeted.',
    nextCheck: 'Independently verify the current target and expected postcondition.',
    authorityNotice: 'This guidance does not determine risk or grant permission or approval.',
  })
}

function exactKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value)
  return keys.length === required.length && required.every(key => Object.hasOwn(value, key))
    && keys.every(key => typeof key === 'string' && required.includes(key))
}

function own(value: Record<string, unknown>, key: string): unknown { return value[key] }
function safeTimestamp(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 }
function boundedCount(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum
}
function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value
  Object.freeze(value)
  if (Array.isArray(value)) for (const item of value) deepFreeze(item)
  else for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child)
  return value
}
