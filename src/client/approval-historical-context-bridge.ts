import { isPlainRecord, RISK_ADVISOR_RPC_CHANNEL, type ClientConnectionRpcLike } from '../bridge-contract.ts'
import {
  APPROVAL_HISTORICAL_CONTEXT_ENDPOINT,
  parseApprovalHistoricalContextRead,
  parseApprovalHistoricalContextRequest,
  type ApprovalHistoricalContextClientResult,
  type ApprovalHistoricalContextRequestV1,
  type ApprovalHistoricalContextReadV1,
} from '../approval-historical-context-contract.ts'

export interface ApprovalHistoricalContextBridgeClient {
  readonly read: (request: ApprovalHistoricalContextRequestV1, signal?: AbortSignal) => Promise<ApprovalHistoricalContextClientResult>
}

export function createApprovalHistoricalContextBridgeClient(rpc: ClientConnectionRpcLike): ApprovalHistoricalContextBridgeClient {
  return Object.freeze({
    read: async (request: ApprovalHistoricalContextRequestV1, signal?: AbortSignal): Promise<ApprovalHistoricalContextClientResult> => {
      if (signal?.aborted) return unavailable('CANCELLED')
      const parsedRequest = parseApprovalHistoricalContextRequest(request)
      if (parsedRequest === undefined) return unavailable('PROTOCOL_INVALID')
      try {
        const carrier = await rpc.call(RISK_ADVISOR_RPC_CHANNEL, APPROVAL_HISTORICAL_CONTEXT_ENDPOINT, parsedRequest, signal)
        if (signal?.aborted) return unavailable('CANCELLED')
        if (!isPlainRecord(carrier) || typeof carrier.ok !== 'boolean') return unavailable('PROTOCOL_INVALID')
        if (carrier.ok === false) return exactKeys(carrier, ['ok', 'error']) && isRpcFailure(carrier.error)
          ? unavailable('HOST_REJECTED') : unavailable('PROTOCOL_INVALID')
        if (!exactKeys(carrier, ['ok', 'value'])) return unavailable('PROTOCOL_INVALID')
        const parsed = parseApprovalHistoricalContextRead(carrier.value)
        if (parsed === undefined || !matchesRequest(parsed, parsedRequest)) return unavailable('PROTOCOL_INVALID')
        return parsed
      } catch { return unavailable(signal?.aborted ? 'CANCELLED' : 'TRANSPORT_UNAVAILABLE') }
    },
  })
}

function matchesRequest(value: ApprovalHistoricalContextReadV1, request: ApprovalHistoricalContextRequestV1): boolean {
  return value.sessionId === request.sessionId && value.callId === request.callId
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
function unavailable(reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'): ApprovalHistoricalContextClientResult {
  return Object.freeze({ kind: 'CLIENT_UNAVAILABLE', reason })
}
