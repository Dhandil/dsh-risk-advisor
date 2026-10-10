import {
  CORRECTION_HISTORICAL_CONTEXT_ENDPOINT,
  CORRECTION_HISTORICAL_CONTEXT_RPC_CHANNEL,
  parseCorrectionHistoricalContextRead,
  type CorrectionHistoricalContextClientResult,
  type CorrectionHistoricalContextRequestV1,
} from '../correction-historical-context-contract.ts'

export interface CorrectionHistoricalContextRpcLike {
  readonly call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown>
}

export interface CorrectionHistoricalContextBridgeClient {
  readonly read: (request: CorrectionHistoricalContextRequestV1, signal?: AbortSignal) => Promise<CorrectionHistoricalContextClientResult>
}

export function createCorrectionHistoricalContextBridgeClient(rpc: CorrectionHistoricalContextRpcLike): CorrectionHistoricalContextBridgeClient {
  return Object.freeze({
    read: async (request: CorrectionHistoricalContextRequestV1, signal?: AbortSignal): Promise<CorrectionHistoricalContextClientResult> => {
      if (signal?.aborted) return unavailable('CANCELLED')
      try {
        const carrier = await rpc.call(CORRECTION_HISTORICAL_CONTEXT_RPC_CHANNEL,
          CORRECTION_HISTORICAL_CONTEXT_ENDPOINT, Object.freeze({ ...request }), signal)
        if (signal?.aborted) return unavailable('CANCELLED')
        if (!isPlainRecord(carrier) || typeof carrier.ok !== 'boolean') return unavailable('PROTOCOL_INVALID')
        if (carrier.ok === false) return exactKeys(carrier, ['ok', 'error']) && isRpcFailure(carrier.error)
          ? unavailable('HOST_REJECTED') : unavailable('PROTOCOL_INVALID')
        if (!exactKeys(carrier, ['ok', 'value'])) return unavailable('PROTOCOL_INVALID')
        const parsed = parseCorrectionHistoricalContextRead(carrier.value)
        return parsed === undefined || parsed.sessionId !== request.sessionId || parsed.findingId !== request.findingId
          ? unavailable('PROTOCOL_INVALID') : parsed
      } catch { return unavailable(signal?.aborted ? 'CANCELLED' : 'TRANSPORT_UNAVAILABLE') }
    },
  })
}

function isRpcFailure(value: unknown): boolean {
  return isPlainRecord(value) && exactKeys(value, ['code', 'message', 'details'])
    && typeof value.code === 'string' && typeof value.message === 'string' && isPlainRecord(value.details)
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

function unavailable(reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'): CorrectionHistoricalContextClientResult {
  return Object.freeze({ kind: 'CLIENT_UNAVAILABLE', reason })
}
