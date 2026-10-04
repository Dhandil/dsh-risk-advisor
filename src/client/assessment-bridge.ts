import {
  RISK_ADVISOR_ACTIVE_ENDPOINT,
  RISK_ADVISOR_ASSESSMENT_ENDPOINT,
  RISK_ADVISOR_RPC_CHANNEL,
  freezeBridgeRead,
  isBoundedIdentifier,
  isPlainRecord,
  parseBridgeRead,
  type BrowserBridgeClientResult,
  type ClientConnectionRpcLike,
  type RiskAdvisorBridgeRead,
} from '../bridge-contract.ts'

export interface RiskAdvisorBridgeClient {
  readonly active: (sessionId: string, callId: string, signal?: AbortSignal) => Promise<BrowserBridgeClientResult>
  readonly assessment: (assessmentId: string, signal?: AbortSignal) => Promise<BrowserBridgeClientResult>
}

export function createRiskAdvisorBridgeClient(rpc: ClientConnectionRpcLike): RiskAdvisorBridgeClient {
  return Object.freeze({
    active: (sessionId: string, callId: string, signal?: AbortSignal) => read(rpc, RISK_ADVISOR_ACTIVE_ENDPOINT, { sessionId, callId }, [sessionId, callId], signal),
    assessment: (assessmentId: string, signal?: AbortSignal) => read(rpc, RISK_ADVISOR_ASSESSMENT_ENDPOINT, { assessmentId }, [assessmentId], signal),
  })
}

async function read(
  rpc: ClientConnectionRpcLike,
  endpoint: typeof RISK_ADVISOR_ACTIVE_ENDPOINT | typeof RISK_ADVISOR_ASSESSMENT_ENDPOINT,
  payload: Record<string, string>,
  identifiers: readonly string[],
  signal?: AbortSignal,
): Promise<BrowserBridgeClientResult> {
  if (isAborted(signal)) return unavailable('CANCELLED')
  if (identifiers.some(identifier => !isBoundedIdentifier(identifier))) return unavailable('PROTOCOL_INVALID')
  try {
    const carrier = await rpc.call(RISK_ADVISOR_RPC_CHANNEL, endpoint, Object.freeze({ ...payload }), signal)
    if (isAborted(signal)) return unavailable('CANCELLED')
    if (!isPlainRecord(carrier) || typeof carrier.ok !== 'boolean') return unavailable('PROTOCOL_INVALID')
    if (carrier.ok === false) return unavailable(isRpcFailure(carrier.error) ? 'HOST_REJECTED' : 'PROTOCOL_INVALID')
    if (!Object.hasOwn(carrier, 'value')) return unavailable('PROTOCOL_INVALID')
    const parsed = parseBridgeRead(carrier.value)
    return parsed === undefined ? unavailable('PROTOCOL_INVALID') : freezeBridgeRead(parsed)
  } catch {
    return isAborted(signal) ? unavailable('CANCELLED') : unavailable('TRANSPORT_UNAVAILABLE')
  }
}

function isRpcFailure(value: unknown): boolean {
  return isPlainRecord(value)
    && typeof value.code === 'string'
    && typeof value.message === 'string'
    && isPlainRecord(value.details)
}

function unavailable(reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'): BrowserBridgeClientResult {
  return Object.freeze({ kind: 'UNAVAILABLE' as const, reason })
}

function isAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true
}

export type { BrowserBridgeClientResult, RiskAdvisorBridgeRead }
