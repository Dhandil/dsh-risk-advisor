/** Independent, browser-safe Phase 12.2 read contract. */

export const ONLINE_CORRECTION_RPC_CHANNEL = '/api' as const
export const ONLINE_CORRECTION_ENDPOINT = 'risk-advisor/online-correction' as const
export const ONLINE_CORRECTION_ROUTE = '/api/risk-advisor/online-correction' as const
export const ONLINE_CORRECTION_IDENTIFIER_LIMIT = 256
export const ONLINE_CORRECTION_MAX_FINDINGS = 64

export type BrowserOnlineCorrectionKind =
  | 'REPEATED_FAILURE_WITHOUT_PROGRESS'
  | 'POSTCONDITION_NOT_SATISFIED'

export type BrowserOnlineCorrectionDiagnosis =
  | 'REPEATED_SAME_SIGNATURE_FAILURE'
  | 'VERIFIED_POSTCONDITION_MISMATCH'

export type BrowserOnlineCorrectionAdvisoryCode =
  | 'STOP_EXACT_RETRY_PATH_V1'
  | 'INSPECT_UNSATISFIED_POSTCONDITION_V1'

export type BrowserOnlineCorrectionReasonCode = 'SESSION_TRUNCATED' | 'F2_SIGNAL_SATURATED'

export interface BrowserOnlineCorrectionFindingV1 {
  readonly findingId: string
  readonly kind: BrowserOnlineCorrectionKind
  readonly diagnosis: BrowserOnlineCorrectionDiagnosis
  readonly disposition: 'ADVISE'
  readonly advisoryCode: BrowserOnlineCorrectionAdvisoryCode
  readonly observedAt: number
}

export interface BrowserOnlineCorrectionViewV1 {
  readonly schemaVersion: 1
  readonly sessionId: string
  readonly findings: readonly BrowserOnlineCorrectionFindingV1[]
  readonly truncated: boolean
  readonly reasonCodes: readonly BrowserOnlineCorrectionReasonCode[]
}

export type OnlineCorrectionBridgeRead =
  | { readonly kind: 'VIEW'; readonly view: BrowserOnlineCorrectionViewV1 }
  | { readonly kind: 'NOT_FOUND' }

export type OnlineCorrectionClientResult = OnlineCorrectionBridgeRead | {
  readonly kind: 'UNAVAILABLE'
  readonly reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'
}

export function isOnlineCorrectionIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= ONLINE_CORRECTION_IDENTIFIER_LIMIT
}

/** Require the endpoint's sole request field and return a detached frozen copy. */
export function parseOnlineCorrectionRequest(value: unknown): { readonly sessionId: string } | undefined {
  if (!isPlainRecord(value) || !exactKeys(value, ['sessionId']) || !isOnlineCorrectionIdentifier(value.sessionId)) return undefined
  return Object.freeze({ sessionId: value.sessionId })
}

/** Strict parser shared at the Host and Browser boundary. */
export function parseOnlineCorrectionRead(value: unknown): OnlineCorrectionBridgeRead | undefined {
  if (!isPlainRecord(value) || typeof value.kind !== 'string') return undefined
  if (value.kind === 'NOT_FOUND') return exactKeys(value, ['kind']) ? Object.freeze({ kind: 'NOT_FOUND' }) : undefined
  if (value.kind !== 'VIEW' || !exactKeys(value, ['kind', 'view']) || !isPlainRecord(value.view)) return undefined
  const view = parseView(value.view)
  return view === undefined ? undefined : Object.freeze({ kind: 'VIEW' as const, view })
}

export function freezeOnlineCorrectionRead(value: OnlineCorrectionBridgeRead): OnlineCorrectionBridgeRead {
  if (value.kind === 'NOT_FOUND') return Object.freeze({ kind: 'NOT_FOUND' as const })
  const findings = Object.freeze(value.view.findings.map(finding => Object.freeze({ ...finding })))
  return Object.freeze({
    kind: 'VIEW' as const,
    view: Object.freeze({
      schemaVersion: 1 as const,
      sessionId: value.view.sessionId,
      findings,
      truncated: value.view.truncated,
      reasonCodes: Object.freeze([...value.view.reasonCodes]),
    }),
  })
}

function parseView(value: Record<string, unknown>): BrowserOnlineCorrectionViewV1 | undefined {
  if (!exactKeys(value, ['schemaVersion', 'sessionId', 'findings', 'truncated', 'reasonCodes'])) return undefined
  if (value.schemaVersion !== 1 || !isOnlineCorrectionIdentifier(value.sessionId) || typeof value.truncated !== 'boolean') return undefined
  if (!Array.isArray(value.findings) || value.findings.length > ONLINE_CORRECTION_MAX_FINDINGS) return undefined
  const findings: BrowserOnlineCorrectionFindingV1[] = []
  const ids = new Set<string>()
  for (const item of value.findings) {
    if (!isPlainRecord(item) || !exactKeys(item, ['findingId', 'kind', 'diagnosis', 'disposition', 'advisoryCode', 'observedAt'])) return undefined
    const { findingId, kind, diagnosis, disposition, advisoryCode, observedAt } = item
    if (typeof findingId !== 'string' || !/^ra-correction-v1_[a-f0-9]{64}$/.test(findingId) || ids.has(findingId)) return undefined
    if (typeof observedAt !== 'number' || !Number.isFinite(observedAt) || observedAt < 0 || disposition !== 'ADVISE') return undefined
    if (kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS') {
      if (diagnosis !== 'REPEATED_SAME_SIGNATURE_FAILURE' || advisoryCode !== 'STOP_EXACT_RETRY_PATH_V1') return undefined
    } else if (kind === 'POSTCONDITION_NOT_SATISFIED') {
      if (diagnosis !== 'VERIFIED_POSTCONDITION_MISMATCH' || advisoryCode !== 'INSPECT_UNSATISFIED_POSTCONDITION_V1') return undefined
    } else return undefined
    ids.add(findingId)
    findings.push(Object.freeze({ findingId, kind, diagnosis, disposition, advisoryCode, observedAt }) as BrowserOnlineCorrectionFindingV1)
  }
  if (!Array.isArray(value.reasonCodes) || value.reasonCodes.length > 2) return undefined
  const reasonCodes: BrowserOnlineCorrectionReasonCode[] = []
  for (const reason of value.reasonCodes) {
    if ((reason !== 'SESSION_TRUNCATED' && reason !== 'F2_SIGNAL_SATURATED') || reasonCodes.includes(reason)) return undefined
    reasonCodes.push(reason)
  }
  if (value.truncated !== reasonCodes.includes('SESSION_TRUNCATED')) return undefined
  return Object.freeze({
    schemaVersion: 1,
    sessionId: value.sessionId,
    findings: Object.freeze(findings),
    truncated: value.truncated,
    reasonCodes: Object.freeze(reasonCodes),
  })
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return (prototype === Object.prototype || prototype === null) && Reflect.ownKeys(value).every(key => {
      if (typeof key !== 'string') return false
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      return descriptor !== undefined && descriptor.enumerable && Object.hasOwn(descriptor, 'value')
    })
  } catch { return false }
}

function exactKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value)
  return keys.length === required.length && required.every(key => Object.hasOwn(value, key))
    && keys.every(key => typeof key === 'string' && required.includes(key))
}
