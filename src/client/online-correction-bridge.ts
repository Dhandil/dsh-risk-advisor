import {
  ONLINE_CORRECTION_ENDPOINT,
  ONLINE_CORRECTION_RPC_CHANNEL,
  isOnlineCorrectionIdentifier,
  parseOnlineCorrectionRead,
  type OnlineCorrectionClientResult,
} from '../online-correction-contract.ts'

export interface OnlineCorrectionRpcLike {
  readonly call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown>
}

export interface OnlineCorrectionBridgeClient {
  readonly read: (sessionId: string, signal?: AbortSignal) => Promise<OnlineCorrectionClientResult>
}

export function createOnlineCorrectionBridgeClient(rpc: OnlineCorrectionRpcLike): OnlineCorrectionBridgeClient {
  return Object.freeze({
    read: async (sessionId: string, signal?: AbortSignal): Promise<OnlineCorrectionClientResult> => {
      if (signal?.aborted) return unavailable('CANCELLED')
      if (!isOnlineCorrectionIdentifier(sessionId)) return unavailable('PROTOCOL_INVALID')
      try {
        const carrier = await rpc.call(ONLINE_CORRECTION_RPC_CHANNEL, ONLINE_CORRECTION_ENDPOINT, Object.freeze({ sessionId }), signal)
        if (signal?.aborted) return unavailable('CANCELLED')
        if (!isPlainRecord(carrier) || typeof carrier.ok !== 'boolean') return unavailable('PROTOCOL_INVALID')
        if (carrier.ok === false) {
          return exactKeys(carrier, ['ok', 'error']) && isRpcFailure(carrier.error)
            ? unavailable('HOST_REJECTED')
            : unavailable('PROTOCOL_INVALID')
        }
        if (!exactKeys(carrier, ['ok', 'value'])) return unavailable('PROTOCOL_INVALID')
        const parsed = parseOnlineCorrectionRead(carrier.value)
        return parsed === undefined ? unavailable('PROTOCOL_INVALID') : parsed
      } catch {
        return unavailable(signal?.aborted ? 'CANCELLED' : 'TRANSPORT_UNAVAILABLE')
      }
    },
  })
}

function isRpcFailure(value: unknown): boolean {
  return isPlainRecord(value)
    && exactKeys(value, ['code', 'message', 'details'])
    && typeof value.code === 'string'
    && typeof value.message === 'string'
    && isPlainRecord(value.details)
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

function unavailable(reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'): OnlineCorrectionClientResult {
  return Object.freeze({ kind: 'UNAVAILABLE' as const, reason })
}
