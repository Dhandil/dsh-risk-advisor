import {
  isBoundedIdentifier,
  isPlainRecord,
  RISK_ADVISOR_RPC_CHANNEL,
  type ClientConnectionRpcLike,
} from '../bridge-contract.ts'
import {
  HISTORICAL_CONTEXT_ENDPOINT,
  parseHistoricalContextRead,
  type HistoricalContextClientResult,
  type HistoricalContextReadV1,
} from '../historical-context-contract.ts'

export interface HistoricalContextBridgeClient {
  readonly read: (request: HistoricalContextRequest, signal?: AbortSignal) => Promise<HistoricalContextClientResult>
}

export interface HistoricalContextRequest {
  readonly sessionId: string
  readonly executionId: string
  readonly assessmentId: string
}

export function createHistoricalContextBridgeClient(rpc: ClientConnectionRpcLike): HistoricalContextBridgeClient {
  return Object.freeze({
    read: async (request: HistoricalContextRequest, signal?: AbortSignal): Promise<HistoricalContextClientResult> => {
      if (signal?.aborted) return unavailable('CANCELLED')
      if (!isBoundedIdentifier(request.sessionId) || !isBoundedIdentifier(request.executionId)
        || !isBoundedIdentifier(request.assessmentId)) return unavailable('PROTOCOL_INVALID')
      try {
        const payload = Object.freeze({ sessionId: request.sessionId, executionId: request.executionId, assessmentId: request.assessmentId })
        const carrier = await rpc.call(RISK_ADVISOR_RPC_CHANNEL, HISTORICAL_CONTEXT_ENDPOINT, payload, signal)
        if (signal?.aborted) return unavailable('CANCELLED')
        if (!isPlainRecord(carrier) || typeof carrier.ok !== 'boolean') return unavailable('PROTOCOL_INVALID')
        if (carrier.ok === false) return exactKeys(carrier, ['ok', 'error']) && isRpcFailure(carrier.error)
          ? unavailable('HOST_REJECTED')
          : unavailable('PROTOCOL_INVALID')
        if (!exactKeys(carrier, ['ok', 'value'])) return unavailable('PROTOCOL_INVALID')
        const parsed = parseHistoricalContextRead(carrier.value)
        if (parsed === undefined || !matchesRequest(parsed, request)) return unavailable('PROTOCOL_INVALID')
        return parsed
      } catch { return unavailable(signal?.aborted ? 'CANCELLED' : 'TRANSPORT_UNAVAILABLE') }
    },
  })
}

function matchesRequest(value: HistoricalContextReadV1, request: HistoricalContextRequest): boolean {
  if (value.sessionId !== request.sessionId) return false
  return value.kind !== 'VIEW' || (value.executionId === request.executionId && value.assessmentId === request.assessmentId)
}

function isRpcFailure(value: unknown): boolean {
  return isPlainRecord(value) && exactKeys(value, ['code', 'message', 'details'])
    && typeof value.code === 'string' && typeof value.message === 'string' && isPlainRecord(value.details)
}

function exactKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  const keys = Reflect.ownKeys(value)
  return keys.length === required.length && required.every(key => Object.hasOwn(value, key))
    && keys.every(key => typeof key === 'string' && required.includes(key))
}

function unavailable(reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'): HistoricalContextClientResult {
  return Object.freeze({ kind: 'CLIENT_UNAVAILABLE', reason })
}
