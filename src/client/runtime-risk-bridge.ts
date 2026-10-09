import {
  RISK_ADVISOR_RPC_CHANNEL,
  RISK_ADVISOR_RUNTIME_RISK_ENDPOINT,
  parseRuntimeRiskAwarenessRead,
  isBoundedIdentifier,
  type RuntimeRiskAwarenessClientResult,
} from '../bridge-contract.ts'

export interface RuntimeRiskRpcLike {
  readonly call: (channel: string, endpoint: string, payload: unknown, signal?: AbortSignal) => Promise<unknown>
}

export interface RuntimeRiskBridgeClient {
  readonly read: (sessionId: string, signal?: AbortSignal) => Promise<RuntimeRiskAwarenessClientResult>
}

export function createRuntimeRiskBridgeClient(rpc: RuntimeRiskRpcLike): RuntimeRiskBridgeClient {
  return Object.freeze({
    read: async (sessionId: string, signal?: AbortSignal): Promise<RuntimeRiskAwarenessClientResult> => {
      if (signal?.aborted) return clientUnavailable('CANCELLED')
      if (!isBoundedIdentifier(sessionId)) return clientUnavailable('PROTOCOL_INVALID')
      try {
        const carrier = await rpc.call(RISK_ADVISOR_RPC_CHANNEL, RISK_ADVISOR_RUNTIME_RISK_ENDPOINT, Object.freeze({ sessionId }), signal)
        if (signal?.aborted) return clientUnavailable('CANCELLED')
        if (!isPlainRecord(carrier) || typeof carrier.ok !== 'boolean') return clientUnavailable('PROTOCOL_INVALID')
        if (carrier.ok === false) return exactKeys(carrier, ['ok', 'error']) && isRpcFailure(carrier.error)
          ? clientUnavailable('HOST_REJECTED')
          : clientUnavailable('PROTOCOL_INVALID')
        if (!exactKeys(carrier, ['ok', 'value'])) return clientUnavailable('PROTOCOL_INVALID')
        const parsed = parseRuntimeRiskAwarenessRead(carrier.value)
        if (parsed === undefined || parsed.sessionId !== sessionId) return clientUnavailable('PROTOCOL_INVALID')
        return parsed
      } catch {
        return clientUnavailable(signal?.aborted ? 'CANCELLED' : 'TRANSPORT_UNAVAILABLE')
      }
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

function clientUnavailable(reason: 'TRANSPORT_UNAVAILABLE' | 'HOST_REJECTED' | 'PROTOCOL_INVALID' | 'CANCELLED'): RuntimeRiskAwarenessClientResult {
  return Object.freeze({ kind: 'CLIENT_UNAVAILABLE' as const, reason })
}
