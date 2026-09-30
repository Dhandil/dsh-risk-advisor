export const RISK_ADVISOR_RPC_CHANNEL = '/risk-advisor' as const
export const BRIDGE_IDENTIFIER_LIMIT = 256

export const BROWSER_SAFE_REASON_CODES = [
  'ASSESSOR_NOT_IMPLEMENTED',
  'FOUNDATION_DEGRADED',
  'FOUNDATION_UNAVAILABLE',
  'MISSING_CALL_ID',
  'MISSING_SCOPE_IDENTITY',
  'NO_ACTIVE_EXECUTION',
  'RUNTIME_STATE_LOST',
  'OBSERVATION_UNAVAILABLE',
  'AMBIGUOUS_EXECUTION',
  'CORRELATION_CONFLICT',
] as const

export type BrowserSafeReasonCode = typeof BROWSER_SAFE_REASON_CODES[number]

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

export type RiskAdvisorBridgeRead =
  | { readonly kind: 'VIEW'; readonly view: RiskAdvisorBridgeViewV1 }
  | { readonly kind: 'NOT_FOUND' }
  | { readonly kind: 'AMBIGUOUS'; readonly reasonCodes: readonly ['MULTIPLE_ACTIVE_APPROVALS'] }

export type BrowserBridgeClientResult =
  | RiskAdvisorBridgeRead
  | {
    readonly kind: 'UNAVAILABLE'
    readonly reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'
  }

export interface ClientConnectionRpcLike {
  call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown>
}

export function isBoundedIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= BRIDGE_IDENTIFIER_LIMIT
}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  try {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  } catch {
    return false
  }
}

export function parseBridgeRead(value: unknown): RiskAdvisorBridgeRead | undefined {
  try {
    if (!isPlainRecord(value) || typeof value.kind !== 'string') return undefined
    if (value.kind === 'NOT_FOUND') return exactKeys(value, ['kind']) ? Object.freeze({ kind: 'NOT_FOUND' as const }) : undefined
    if (value.kind === 'AMBIGUOUS') {
      if (!exactKeys(value, ['kind', 'reasonCodes']) || !Array.isArray(value.reasonCodes) || value.reasonCodes.length !== 1) return undefined
      if (value.reasonCodes[0] !== 'MULTIPLE_ACTIVE_APPROVALS') return undefined
      return Object.freeze({ kind: 'AMBIGUOUS' as const, reasonCodes: Object.freeze(['MULTIPLE_ACTIVE_APPROVALS'] as const) })
    }
    if (value.kind !== 'VIEW' || !exactKeys(value, ['kind', 'view']) || !isPlainRecord(value.view)) return undefined
    const view = parseView(value.view)
    return view === undefined ? undefined : Object.freeze({ kind: 'VIEW' as const, view })
  } catch {
    return undefined
  }
}

export function freezeBridgeRead(value: RiskAdvisorBridgeRead): RiskAdvisorBridgeRead {
  if (value.kind === 'VIEW') return Object.freeze({ kind: 'VIEW' as const, view: freezeView(value.view) })
  if (value.kind === 'AMBIGUOUS') return Object.freeze({ kind: 'AMBIGUOUS' as const, reasonCodes: Object.freeze(['MULTIPLE_ACTIVE_APPROVALS'] as const) })
  return Object.freeze({ kind: 'NOT_FOUND' as const })
}

export function freezeView(view: RiskAdvisorBridgeViewV1): RiskAdvisorBridgeViewV1 {
  return Object.freeze({
    schemaVersion: 1 as const,
    sessionId: view.sessionId,
    callId: view.callId,
    ...view.assessmentId === undefined ? {} : { assessmentId: view.assessmentId },
    association: view.association,
    status: 'unavailable' as const,
    stage: 'not-started' as const,
    reasonCodes: Object.freeze([...view.reasonCodes]),
    updatedAt: view.updatedAt,
  })
}

function parseView(value: Record<string, unknown>): RiskAdvisorBridgeViewV1 | undefined {
  if (!exactKeys(value, ['schemaVersion', 'sessionId', 'callId', 'association', 'status', 'stage', 'reasonCodes', 'updatedAt'], ['assessmentId'])) return undefined
  if (value.schemaVersion !== 1 || !isBoundedIdentifier(value.sessionId) || !isBoundedIdentifier(value.callId)) return undefined
  if (value.association !== 'BOUND' && value.association !== 'UNBOUND') return undefined
  if (value.status !== 'unavailable' || value.stage !== 'not-started') return undefined
  if (!Array.isArray(value.reasonCodes) || value.reasonCodes.length > BROWSER_SAFE_REASON_CODES.length) return undefined
  if (value.reasonCodes.some(reason => !isBrowserSafeReasonCode(reason))) return undefined
  if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt) || value.updatedAt < 0) return undefined
  const assessmentId = value.assessmentId
  if (assessmentId !== undefined && !isBoundedIdentifier(assessmentId)) return undefined
  if (value.association === 'BOUND' && assessmentId === undefined) return undefined
  if (value.association === 'UNBOUND' && assessmentId !== undefined) return undefined
  return freezeView({
    schemaVersion: 1,
    sessionId: value.sessionId,
    callId: value.callId,
    ...(assessmentId === undefined ? {} : { assessmentId }),
    association: value.association,
    status: 'unavailable',
    stage: 'not-started',
    reasonCodes: [...value.reasonCodes] as BrowserSafeReasonCode[],
    updatedAt: value.updatedAt,
  })
}

export function isBrowserSafeReasonCode(value: unknown): value is BrowserSafeReasonCode {
  return typeof value === 'string' && (BROWSER_SAFE_REASON_CODES as readonly string[]).includes(value)
}

function exactKeys(value: Record<string, unknown>, required: readonly string[], optional: readonly string[] = []): boolean {
  const allowed = new Set([...required, ...optional])
  const keys = Object.keys(value)
  return required.every(key => Object.hasOwn(value, key)) && keys.every(key => allowed.has(key))
}
