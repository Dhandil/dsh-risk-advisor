import {
  CORRECTION_NEXT_CHECK_ENDPOINT,
  CORRECTION_NEXT_CHECK_RPC_CHANNEL,
  parseCorrectionNextCheckRead,
  type CorrectionNextCheckClientResult,
  type CorrectionNextCheckRequestV1,
} from '../correction-next-check-contract.ts'

export interface CorrectionNextCheckRpcLike {
  readonly call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown>
}

export interface CorrectionNextCheckBridgeClient {
  readonly read: (request: CorrectionNextCheckRequestV1, signal?: AbortSignal) => Promise<CorrectionNextCheckClientResult>
}

export function createCorrectionNextCheckBridgeClient(rpc: CorrectionNextCheckRpcLike): CorrectionNextCheckBridgeClient {
  return Object.freeze({
    read: async (request: CorrectionNextCheckRequestV1, signal?: AbortSignal): Promise<CorrectionNextCheckClientResult> => {
      if (signal?.aborted) return unavailable('CANCELLED')
      try {
        const carrier = await rpc.call(CORRECTION_NEXT_CHECK_RPC_CHANNEL, CORRECTION_NEXT_CHECK_ENDPOINT,
          Object.freeze({ sessionId: request.sessionId, findingId: request.findingId }), signal)
        if (signal?.aborted) return unavailable('CANCELLED')
        if (!isPlainRecord(carrier) || typeof carrier.ok !== 'boolean') return unavailable('PROTOCOL_INVALID')
        if (carrier.ok === false) return exactKeys(carrier, ['ok', 'error']) && isRpcFailure(carrier.error)
          ? unavailable('HOST_REJECTED') : unavailable('PROTOCOL_INVALID')
        if (!exactKeys(carrier, ['ok', 'value'])) return unavailable('PROTOCOL_INVALID')
        const parsed = parseCorrectionNextCheckRead(carrier.value)
        return parsed === undefined || parsed.sessionId !== request.sessionId || parsed.findingId !== request.findingId
          ? unavailable('PROTOCOL_INVALID') : parsed
      } catch { return unavailable(signal?.aborted ? 'CANCELLED' : 'TRANSPORT_UNAVAILABLE') }
    },
  })
}

function unavailable(reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'): CorrectionNextCheckClientResult {
  return Object.freeze({ kind: 'CLIENT_UNAVAILABLE', reason })
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Reflect.ownKeys(value)
  return actual.length === keys.length && keys.every(key => Object.hasOwn(value, key))
    && actual.every(key => typeof key === 'string' && keys.includes(key))
}

function isRpcFailure(value: unknown): boolean {
  return isPlainRecord(value) && exactKeys(value, ['code', 'message', 'details'])
    && typeof value.code === 'string' && typeof value.message === 'string' && isPlainRecord(value.details)
}
