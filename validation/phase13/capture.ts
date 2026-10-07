import type { F2Settlement, Phase13FindingKind } from './schema.ts'

export const PHASE13_VERIFICATION_SETTLE_DEADLINE_MS = 15_000
export const PHASE13_VERIFICATION_POLL_INTERVAL_MS = 50

export interface PublicCorrelationDiagnostic {
  readonly lookup: (session: unknown, callId: string | undefined) => unknown
}

export interface PublicLiveCorrectionDiagnostic {
  readonly forExecution: (executionId: string) => unknown
  readonly forSession: (session: unknown) => unknown
}

export interface PublicVerificationDiagnostic {
  readonly get: (executionId: string) => unknown
}

export type ExecutionCapture =
  | { readonly status: 'FOUND'; readonly executionId: string }
  | { readonly status: 'CAPTURE_INVALID'; readonly reason: 'NOT_FOUND' | 'AMBIGUOUS' | 'MALFORMED' | 'THREW' }

export interface CapturedFinding {
  readonly kind: Phase13FindingKind
  readonly findingId: string
  readonly advisoryCode?: 'STOP_EXACT_RETRY_PATH_V1' | 'INSPECT_UNSATISFIED_POSTCONDITION_V1'
}

export interface FindingCapture {
  readonly status: 'VALID' | 'CAPTURE_INVALID'
  readonly findings: readonly CapturedFinding[]
  readonly sessionFindingIds: readonly string[]
  readonly truncated: boolean
}

export type SessionFindingIdentityCapture =
  | { readonly status: 'VALID'; readonly ids: readonly string[]; readonly truncated: boolean }
  | { readonly status: 'CAPTURE_INVALID' }

export type VerificationSettlement =
  | { readonly status: 'NOT_REQUIRED' }
  | { readonly status: 'SETTLED'; readonly verificationStatus: 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'UNAVAILABLE' }
  | { readonly status: 'MISSING' }
  | { readonly status: 'CAPTURE_INVALID' }

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function ownValue(value: Record<string, unknown>, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined
}

export function captureExecutionId(
  correlation: PublicCorrelationDiagnostic,
  session: unknown,
  callId: string | undefined,
): ExecutionCapture {
  try {
    const result = correlation.lookup(session, callId)
    if (!isRecord(result)) return { status: 'CAPTURE_INVALID', reason: 'MALFORMED' }
    const status = ownValue(result, 'status')
    const keys = Reflect.ownKeys(result)
    if (status === 'FOUND' && keys.length === 2 && keys.every(key => key === 'status' || key === 'executionId')) {
      const executionId = ownValue(result, 'executionId')
      if (typeof executionId === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(executionId)) return Object.freeze({ status, executionId })
      return { status: 'CAPTURE_INVALID', reason: 'MALFORMED' }
    }
    if (status === 'NOT_FOUND') return { status: 'CAPTURE_INVALID', reason: 'NOT_FOUND' }
    if (status === 'AMBIGUOUS') return { status: 'CAPTURE_INVALID', reason: 'AMBIGUOUS' }
    return { status: 'CAPTURE_INVALID', reason: 'MALFORMED' }
  } catch { return { status: 'CAPTURE_INVALID', reason: 'THREW' } }
}

function captureOneFinding(value: unknown): CapturedFinding | undefined {
  if (!isRecord(value)) return undefined
  const kind = ownValue(value, 'kind')
  const findingId = ownValue(value, 'findingId')
  const advisoryCode = ownValue(value, 'advisoryCode')
  if ((kind !== 'REPEATED_FAILURE_WITHOUT_PROGRESS' && kind !== 'POSTCONDITION_NOT_SATISFIED')
    || typeof findingId !== 'string' || !/^ra-correction-v1_[a-f0-9]{64}$/.test(findingId)) return undefined
  if (advisoryCode !== undefined
    && advisoryCode !== 'STOP_EXACT_RETRY_PATH_V1'
    && advisoryCode !== 'INSPECT_UNSATISFIED_POSTCONDITION_V1') return undefined
  return Object.freeze({ kind, findingId, ...(advisoryCode === undefined ? {} : { advisoryCode }) })
}

export function captureSessionFindingIds(live: PublicLiveCorrectionDiagnostic, session: unknown): SessionFindingIdentityCapture {
  try {
    const view = live.forSession(session)
    if (!isRecord(view)) return { status: 'CAPTURE_INVALID' }
    const findings = ownValue(view, 'findings')
    const truncated = ownValue(view, 'truncated')
    if (!Array.isArray(findings) || findings.length > 64 || typeof truncated !== 'boolean') return { status: 'CAPTURE_INVALID' }
    const ids: string[] = []
    for (const item of findings) {
      const captured = captureOneFinding(item)
      if (captured === undefined) return { status: 'CAPTURE_INVALID' }
      ids.push(captured.findingId)
    }
    return Object.freeze({ status: 'VALID', ids: Object.freeze(ids), truncated })
  } catch { return { status: 'CAPTURE_INVALID' } }
}

/** Copy only public, sanitized diagnostic fields needed by the truth ledger. */
export function captureFindings(
  live: PublicLiveCorrectionDiagnostic,
  session: unknown,
  executionId: string,
): FindingCapture {
  try {
    const raw = live.forExecution(executionId)
    const after = captureSessionFindingIds(live, session)
    if (!Array.isArray(raw) || raw.length > 64 || after.status !== 'VALID') {
      return { status: 'CAPTURE_INVALID', findings: Object.freeze([]), sessionFindingIds: Object.freeze([]), truncated: false }
    }
    const findings: CapturedFinding[] = []
    for (const value of raw) {
      const finding = captureOneFinding(value)
      if (finding === undefined) return { status: 'CAPTURE_INVALID', findings: Object.freeze([]), sessionFindingIds: after.ids, truncated: after.truncated }
      findings.push(finding)
    }
    return Object.freeze({ status: 'VALID', findings: Object.freeze(findings), sessionFindingIds: after.ids, truncated: after.truncated })
  } catch { return { status: 'CAPTURE_INVALID', findings: Object.freeze([]), sessionFindingIds: Object.freeze([]), truncated: false } }
}

function verificationStatus(value: unknown): 'MATCHED' | 'MISMATCHED' | 'UNKNOWN' | 'UNAVAILABLE' | 'INVALID' | undefined {
  if (!isRecord(value)) return undefined
  const status = ownValue(value, 'status')
  return status === 'MATCHED' || status === 'MISMATCHED' || status === 'UNKNOWN' || status === 'UNAVAILABLE' ? status : 'INVALID'
}

function readVerification(diagnostics: PublicVerificationDiagnostic, executionId: string): VerificationSettlement {
  try {
    const status = verificationStatus(diagnostics.get(executionId))
    if (status === undefined) return { status: 'MISSING' }
    if (status === 'INVALID') return { status: 'CAPTURE_INVALID' }
    return { status: 'SETTLED', verificationStatus: status }
  } catch { return { status: 'CAPTURE_INVALID' } }
}

export async function settleVerification(
  diagnostics: PublicVerificationDiagnostic,
  executionId: string,
  settlement: F2Settlement,
  dependencies: { readonly now?: () => number; readonly wait?: (milliseconds: number) => Promise<void> } = {},
): Promise<VerificationSettlement> {
  if (settlement === 'NONE') return { status: 'NOT_REQUIRED' }
  const now = dependencies.now ?? Date.now
  const wait = dependencies.wait ?? (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
  if (settlement === 'DIRECT') return readVerification(diagnostics, executionId)
  const deadline = now() + PHASE13_VERIFICATION_SETTLE_DEADLINE_MS
  while (true) {
    const result = readVerification(diagnostics, executionId)
    if (result.status !== 'MISSING') return result
    const remaining = deadline - now()
    if (remaining <= 0) return { status: 'MISSING' }
    await wait(Math.min(PHASE13_VERIFICATION_POLL_INTERVAL_MS, remaining))
  }
}
