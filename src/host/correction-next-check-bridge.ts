import type { Context } from '@deepseek-ai/cordis'
import {
  clientRequestSchema,
  RpcId,
  type ConnectionFetchRoute,
  type HostConnectionFetch,
} from '@deepseek-ai/dsh-client-connection'
import type { SessionId, SessionStore } from '@deepseek-ai/dsh-session'
import {
  CORRECTION_NEXT_CHECK_ENDPOINT,
  CORRECTION_NEXT_CHECK_MAX_RESPONSE_CHARS,
  CORRECTION_NEXT_CHECK_ROUTE,
  freezeCorrectionNextCheckRead,
  parseCorrectionNextCheckRequest,
  type CorrectionNextCheckCodeV1,
  type CorrectionNextCheckEvidenceCodeV1,
  type CorrectionNextCheckReadV1,
  type CorrectionNextCheckReasonCodeV1,
} from '../correction-next-check-contract.ts'
import type { ExecutionId } from './correlation.ts'
import type { LiveCorrectionDiagnostics, LiveCorrectionFindingV1 } from './live-correction.ts'
import type { VerificationDiagnostics, VerificationRecordV1 } from './verification-store.ts'

export interface CorrectionNextCheckHostConnectionLike {
  readonly fetch: HostConnectionFetch
}

interface RpcFailure { readonly code: string; readonly message: string; readonly details: object }
type RpcResult = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: RpcFailure }
type Projection = { readonly checkCode: CorrectionNextCheckCodeV1; readonly evidenceCode: CorrectionNextCheckEvidenceCodeV1 }
const EMPTY_DETAILS = Object.freeze({})
const INVALID_REQUEST_RPC_ID = RpcId('invalid-request')
const MAX_FAILURE_COUNT = 1_000_000
const F1_EVIDENCE: CorrectionNextCheckEvidenceCodeV1 = 'F1_CONTIGUOUS_RETRY_FINDING_V1'
const F2_EVIDENCE: CorrectionNextCheckEvidenceCodeV1 = 'F2_CURRENT_VERIFIED_MISMATCH_V1'

const F2_CHECKS: Readonly<Record<string, CorrectionNextCheckCodeV1>> = Object.freeze({
  'tool-contract:tool.write.v1': 'INSPECT_WRITTEN_CONTENT_V1',
  'tool-contract:tool.edit.v1': 'INSPECT_EDIT_REPLACEMENT_V1',
  'known-adapter:shell.mkdir.v1': 'CHECK_DIRECTORY_POSTSTATE_V1',
  'known-adapter:shell.copy-file.v1': 'CHECK_COPY_DESTINATION_V1',
  'known-adapter:git.branch-switch.v1': 'CHECK_ACTIVE_GIT_BRANCH_V1',
  'known-adapter:package.node-resolve.v1': 'CHECK_DEPENDENCY_RESOLUTION_V1',
})

/** Installs a separate optional read-only projection; it never participates in Tool or approval hooks. */
export function installCorrectionNextCheckBrowserBridge(
  ctx: Context,
  connection: CorrectionNextCheckHostConnectionLike,
  liveCorrection: LiveCorrectionDiagnostics,
  verification: VerificationDiagnostics,
): void {
  ctx.effect(async () => {
    const registration = connection.fetch.register(createRoute(ctx.sessions, liveCorrection, verification))
    return async () => { await registration() }
  }, 'risk-advisor-phase14.5-correction-next-check-bridge-generation')
}

export async function handleCorrectionNextCheckRpc(
  sessions: SessionStore,
  liveCorrection: LiveCorrectionDiagnostics,
  verification: VerificationDiagnostics,
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
): Promise<RpcResult> {
  try {
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (endpoint !== CORRECTION_NEXT_CHECK_ENDPOINT) return failure('risk-advisor/endpoint-not-found', 'endpoint not found')
    const request = parseCorrectionNextCheckRequest(payload)
    if (request === undefined) return failure('risk-advisor/bad-request', 'invalid request')
    const { sessionId, findingId } = request
    const session = sessions.get(sessionId as SessionId)
    if (session === undefined) return notFound(sessionId, findingId)
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')

    const finding = newestFinding(liveCorrection, session)
    if (!eligibleFinding(finding) || finding.findingId !== findingId) return notFound(sessionId, findingId)
    const projection = project(finding, verification)
    if ('unavailable' in projection) return unavailable(sessionId, findingId, projection.unavailable)
    if (projection.value === undefined) return notFound(sessionId, findingId)
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')

    // Re-read every authority immediately before returning. Diagnostics may be reentrant in tests or during teardown.
    if (sessions.get(sessionId as SessionId) !== session) return notFound(sessionId, findingId)
    const currentFinding = newestFinding(liveCorrection, session)
    if (!sameFinding(finding, currentFinding)) return notFound(sessionId, findingId)
    const currentProjection = project(finding, verification)
    if ('unavailable' in currentProjection) return unavailable(sessionId, findingId, currentProjection.unavailable)
    if (currentProjection.value === undefined || !sameProjection(projection, currentProjection)) {
      return notFound(sessionId, findingId)
    }
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')

    const result: CorrectionNextCheckReadV1 = {
      schemaVersion: 1,
      kind: 'VIEW',
      sessionId,
      findingId,
      findingKind: finding.kind,
      checkCode: projection.value.checkCode,
      evidenceCode: projection.value.evidenceCode,
      observedAt: Date.now(),
    }
    if (serializedLength(result) > CORRECTION_NEXT_CHECK_MAX_RESPONSE_CHARS) {
      return unavailable(sessionId, findingId, 'PROJECTION_UNAVAILABLE')
    }
    return success(result)
  } catch {
    return failure('risk-advisor/internal', 'bridge unavailable')
  }
}

function createRoute(
  sessions: SessionStore,
  liveCorrection: LiveCorrectionDiagnostics,
  verification: VerificationDiagnostics,
): ConnectionFetchRoute {
  return {
    path: CORRECTION_NEXT_CHECK_ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: request => handleFetch(request, sessions, liveCorrection, verification),
  }
}

async function handleFetch(
  request: Request,
  sessions: SessionStore,
  liveCorrection: LiveCorrectionDiagnostics,
  verification: VerificationDiagnostics,
): Promise<Response> {
  if (request.method !== 'POST') return new Response('not found', { status: 404 })
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') return new Response('content type must be application/json', { status: 415 })
  let body: unknown
  try { body = await request.json() } catch { return new Response('body is not JSON', { status: 400 }) }
  const parsed = clientRequestSchema.safeParse(body)
  if (!parsed.success) return connectionResponse(INVALID_REQUEST_RPC_ID, failure('gateway/bad-request', 'invalid client-request message'))
  const message = parsed.data
  if (message.method !== CORRECTION_NEXT_CHECK_ENDPOINT) {
    return connectionResponse(message.rpcId, failure('gateway/bad-request', 'request method does not match route endpoint'))
  }
  if (!isTransportIdentifier(message.rpcId)) return connectionResponse(INVALID_REQUEST_RPC_ID, failure('gateway/bad-request', 'invalid request'))
  try {
    const result = await handleCorrectionNextCheckRpc(sessions, liveCorrection, verification,
      message.method, message.payload, request.signal)
    return connectionResponse(message.rpcId, result)
  } catch {
    return connectionResponse(message.rpcId, failure('risk-advisor/internal', 'bridge unavailable'))
  }
}

function newestFinding(diagnostics: LiveCorrectionDiagnostics, session: Parameters<LiveCorrectionDiagnostics['forSession']>[0]): LiveCorrectionFindingV1 | undefined {
  return [...diagnostics.forSession(session).findings]
    .sort((a, b) => b.observedAt - a.observedAt || a.findingId.localeCompare(b.findingId))[0]
}

function eligibleFinding(finding: LiveCorrectionFindingV1 | undefined): finding is LiveCorrectionFindingV1 {
  if (finding === undefined || finding.disposition !== 'ADVISE') return false
  if (finding.kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS') {
    return finding.diagnosis === 'REPEATED_SAME_SIGNATURE_FAILURE'
      && finding.advisoryCode === 'STOP_EXACT_RETRY_PATH_V1'
      && Number.isSafeInteger(finding.retryCount) && finding.retryCount! > 0 && finding.retryCount! <= MAX_FAILURE_COUNT
      && Number.isSafeInteger(finding.recentFailureCount) && finding.recentFailureCount! >= 2
      && finding.recentFailureCount! <= MAX_FAILURE_COUNT
      && finding.verifierSource === undefined && finding.verifierAdapterId === undefined && finding.evidenceQuality === undefined
  }
  return finding.kind === 'POSTCONDITION_NOT_SATISFIED'
    && finding.diagnosis === 'VERIFIED_POSTCONDITION_MISMATCH'
    && finding.advisoryCode === 'INSPECT_UNSATISFIED_POSTCONDITION_V1'
    && finding.retryCount === undefined && finding.recentFailureCount === undefined
    && (finding.evidenceQuality === 'high' || finding.evidenceQuality === 'medium')
    && finding.verifierSource !== undefined && finding.verifierAdapterId !== undefined
}

type ProjectResult = {
  readonly value?: Projection
  /** Exact immutable stored record identity is an internal revision fence; it is never serialized. */
  readonly verifierRevision?: VerificationRecordV1
  readonly unavailable?: CorrectionNextCheckReasonCodeV1
}

function project(finding: LiveCorrectionFindingV1, diagnostics: VerificationDiagnostics): ProjectResult {
  if (finding.kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS') return {
    value: { checkCode: 'REVIEW_EXACT_RETRY_PREREQUISITES_V1', evidenceCode: F1_EVIDENCE },
  }
  let record: VerificationRecordV1 | undefined
  try { record = diagnostics.get(finding.executionId as ExecutionId) }
  catch { return { unavailable: 'EVIDENCE_UNAVAILABLE' } }
  if (record === undefined || !eligibleVerifier(finding, record)) return {}
  const checkCode = F2_CHECKS[`${record.source}:${record.adapterId}`]
  return checkCode === undefined ? {} : { value: { checkCode, evidenceCode: F2_EVIDENCE }, verifierRevision: record }
}

function eligibleVerifier(finding: LiveCorrectionFindingV1, record: VerificationRecordV1): boolean {
  return record.schemaVersion === 1
    && record.executionId === finding.executionId
    && record.status === 'MISMATCHED'
    && record.semanticSuccess === false
    && (record.evidenceQuality === 'high' || record.evidenceQuality === 'medium')
    && record.reasonCodes.includes('POSTCONDITION_MISMATCH')
    && record.source === finding.verifierSource
    && record.adapterId === finding.verifierAdapterId
    && record.evidenceQuality === finding.evidenceQuality
    && Number.isSafeInteger(record.observedAt) && record.observedAt === finding.observedAt
}

function sameFinding(a: LiveCorrectionFindingV1, b: LiveCorrectionFindingV1 | undefined): boolean {
  return b !== undefined && a.findingId === b.findingId && a.executionId === b.executionId
    && a.kind === b.kind && a.diagnosis === b.diagnosis && a.disposition === b.disposition
    && a.advisoryCode === b.advisoryCode && a.observedAt === b.observedAt
    && a.retryCount === b.retryCount && a.recentFailureCount === b.recentFailureCount
    && a.verifierSource === b.verifierSource && a.verifierAdapterId === b.verifierAdapterId
    && a.evidenceQuality === b.evidenceQuality
}

function sameProjection(a: ProjectResult, b: ProjectResult): boolean {
  if (a.verifierRevision !== b.verifierRevision) return false
  if (a.value === undefined || b.value === undefined) return a.value === b.value
  return a.value.checkCode === b.value.checkCode && a.value.evidenceCode === b.value.evidenceCode
}

function serializedLength(value: CorrectionNextCheckReadV1): number {
  const serialized = JSON.stringify(value)
  return Math.max(serialized.length, new TextEncoder().encode(serialized).byteLength)
}

function isTransportIdentifier(value: string): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= 256
}

function success(value: CorrectionNextCheckReadV1): RpcResult {
  const frozen = freezeCorrectionNextCheckRead(value)
  return frozen === undefined ? unavailable(value.sessionId, value.findingId, 'PROJECTION_UNAVAILABLE')
    : Object.freeze({ ok: true as const, value: frozen })
}

function notFound(sessionId: string, findingId: string): RpcResult {
  return success({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, findingId })
}

function unavailable(sessionId: string, findingId: string, reason: CorrectionNextCheckReasonCodeV1): RpcResult {
  return success({ schemaVersion: 1, kind: 'UNAVAILABLE', sessionId, findingId, reasonCodes: [reason] })
}

function failure(code: string, message: string): RpcResult {
  return Object.freeze({ ok: false as const, error: Object.freeze({ code, message, details: EMPTY_DETAILS }) })
}

function connectionResponse(rpcId: string, result: RpcResult): Response {
  return Response.json({ type: 'server-response', rpcId, result })
}
