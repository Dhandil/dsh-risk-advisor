const REPLACEMENT = '[REDACTED]'
const MAX_INPUT = 64 * 1024

export interface RedactionResult {
  readonly value: string
  readonly changed: boolean
}

/** One deterministic, side-effect-free redactor used by both seed and Judge paths. */
export class SecretRedactor {
  redact(value: string): RedactionResult {
    if (typeof value !== 'string' || value.length > MAX_INPUT) throw new RangeError('redactor input exceeds the bounded limit')
    let output = value
    output = output.replace(/-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g, REPLACEMENT)
    output = output.replace(/\b(?:sk|sk-proj)-[A-Za-z0-9_-]{8,}\b/g, REPLACEMENT)
    output = output.replace(/\bgithub_pat_[A-Za-z0-9_]{8,}\b/g, REPLACEMENT)
    output = output.replace(/\bghp_[A-Za-z0-9]{8,}\b/g, REPLACEMENT)
    output = output.replace(/(authorization\s*:\s*bearer\s+)([^\s,;]+)/gi, `$1${REPLACEMENT}`)
    output = output.replace(/((?:password|token|api[_-]?key|secret|credential)\s*[=:]\s*)("[^"]*"|'[^']*'|[^\s&;,]+)/gi, `$1${REPLACEMENT}`)
    output = redactCredentialUrls(output)
    return Object.freeze({ value: output, changed: output !== value })
  }
}

export const DEFAULT_SECRET_REDACTOR = new SecretRedactor()

export function redactSecret(value: string): string {
  return DEFAULT_SECRET_REDACTOR.redact(value).value
}

function redactCredentialUrls(value: string): string {
  return value.replace(/\bhttps?:\/\/[^\s<>"']+/gi, raw => {
    try {
      const url = new URL(raw)
      let changed = false
      if (url.username && url.username !== REPLACEMENT) {
        url.username = REPLACEMENT
        changed = true
      }
      if (url.password && url.password !== REPLACEMENT) {
        url.password = REPLACEMENT
        changed = true
      }
      for (const key of [...url.searchParams.keys()]) {
        if (!/(?:token|key|secret|password|credential|auth|api[_-]?key)/i.test(key)) continue
        const values = url.searchParams.getAll(key)
        if (values.some(item => item !== REPLACEMENT)) {
          url.searchParams.delete(key)
          url.searchParams.set(key, REPLACEMENT)
          changed = true
        }
      }
      return changed ? url.toString() : raw
    } catch {
      // A malformed URL is still data. The URL parser is not allowed to turn
      // a redaction error into an unsafe retained value.
      return raw
    }
})
}
