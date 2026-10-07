import { createHash } from 'node:crypto'

type JsonPrimitive = null | boolean | number | string
type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue }

function canonicalize(value: unknown, ancestors: Set<object>): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'object') throw new TypeError('non-json-value')
  if (ancestors.has(value)) throw new TypeError('cyclic-json-value')
  ancestors.add(value)
  try {
    if (Array.isArray(value)) return value.map(item => canonicalize(item, ancestors))
    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError('non-plain-json-object')
    const result: Record<string, JsonValue> = Object.create(null) as Record<string, JsonValue>
    for (const key of Object.keys(value).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)
      if (descriptor === undefined || !('value' in descriptor)) throw new TypeError('json-accessor-not-allowed')
      result[key] = canonicalize(descriptor.value, ancestors)
    }
    return result
  } finally {
    ancestors.delete(value)
  }
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value, new Set()))
}

export function sha256Hex(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}
