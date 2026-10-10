import type { Context } from '@deepseek-ai/cordis'
import {
  clientRequestSchema,
  RpcId,
  type ConnectionFetchRoute,
  type HostConnectionFetch,
} from '@deepseek-ai/dsh-client-connection'
import type { SessionId, SessionStore } from '@deepseek-ai/dsh-session'
import {
  CORRECTION_HISTORICAL_CONTEXT_ENDPOINT,
  CORRECTION_HISTORICAL_CONTEXT_MAX_RESPONSE_CHARS,
  CORRECTION_HISTORICAL_CONTEXT_ROUTE,
  freezeCorrectionHistoricalContextRead,
  parseCorrectionHistoricalContextRequest,
  type CorrectionHistoricalContextReadV1,
  type CorrectionHistoricalContextReasonCodeV1,
} from '../correction-historical-context-contract.ts'
import type { GuidanceDiagnostics } from './guidance-store.ts'
import { renderGuidance } from './guidance-schema.ts'
import type { LiveCorrectionDiagnostics, LiveCorrectionFindingV1 } from './live-correction.ts'
import type { CorrectionHistoricalIdentityRegistry } from './correction-historical-identity.ts'

export interface CorrectionHistoricalContextHostConnectionLike {
  readonly fetch: HostConnectionFetch
}

interface RpcFailure { readonly code: string; readonly message: string; readonly details: object }
type RpcResult = { readonly ok: true; readonly value: unknown } | { readonly ok: false; readonly error: RpcFailure }
const EMPTY_DETAILS = Object.freeze({})
const INVALID_REQUEST_RPC_ID = RpcId('invalid-request')

/** Installs an additive read-only route without changing Phase 12's Finding route. */
export function installCorrectionHistoricalContextBrowserBridge(
  ctx: Context,
  connection: CorrectionHistoricalContextHostConnectionLike,
  liveCorrection: LiveCorrectionDiagnostics,
  identities: CorrectionHistoricalIdentityRegistry,
  guidance: GuidanceDiagnostics,
): void {
  ctx.effect(async () => {
    const registration = connection.fetch.register(createRoute(ctx.sessions, liveCorrection, identities, guidance))
    return async () => { await registration() }
  }, 'risk-advisor-phase14.4-correction-historical-context-bridge-generation')
}

export async function handleCorrectionHistoricalContextRpc(
  sessions: SessionStore,
  liveCorrection: LiveCorrectionDiagnostics,
  identities: CorrectionHistoricalIdentityRegistry,
  guidance: GuidanceDiagnostics,
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
): Promise<RpcResult> {
  try {
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (endpoint !== CORRECTION_HISTORICAL_CONTEXT_ENDPOINT) return failure('risk-advisor/endpoint-not-found', 'endpoint not found')
    const request = parseCorrectionHistoricalContextRequest(payload)
    if (request === undefined) return failure('risk-advisor/bad-request', 'invalid request')
    const { sessionId, findingId } = request
    const session = sessions.get(sessionId as SessionId)
    if (session === undefined) return success({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, findingId })
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')

    const finding = newestFinding(liveCorrection, session)
    if (!isEligibleFinding(finding) || finding.findingId !== findingId) {
      return success({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, findingId })
    }
    const patternId = identities.currentForSettled(session, finding.executionId)
    if (patternId === undefined) return success({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, findingId })
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (guidance.status() !== 'READY') return unavailable(sessionId, findingId, 'GUIDANCE_UNAVAILABLE')

    const revision = guidance.currentForPattern(patternId)
    if (revision === undefined) return guidance.status() === 'READY'
      ? success({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, findingId })
      : unavailable(sessionId, findingId, 'GUIDANCE_UNAVAILABLE')
    if (!eligibleGuidance(revision, patternId)) return unavailable(sessionId, findingId, 'PROJECTION_UNAVAILABLE')
    const rendered = renderGuidance(revision)
    if (rendered === undefined) return unavailable(sessionId, findingId, 'PROJECTION_UNAVAILABLE')
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')

    // Reconfirm the exact Session, top Finding, settled opaque association and current Guidance revision.
    if (sessions.get(sessionId as SessionId) !== session) return notFound(sessionId, findingId)
    const currentFinding = newestFinding(liveCorrection, session)
    const currentPatternId = identities.currentForSettled(session, finding.executionId)
    if (!sameFinding(finding, currentFinding) || currentPatternId !== patternId) return notFound(sessionId, findingId)
    if (guidance.status() !== 'READY') return unavailable(sessionId, findingId, 'GUIDANCE_UNAVAILABLE')
    const currentRevision = guidance.currentForPattern(patternId)
    if (currentRevision === undefined) return notFound(sessionId, findingId)
    if (!eligibleGuidance(currentRevision, patternId)
      || currentRevision.revisionId !== revision.revisionId
      || currentRevision.patternRevisionId !== revision.patternRevisionId
      || currentRevision.patternProvenanceDigest !== revision.patternProvenanceDigest) {
      return unavailable(sessionId, findingId, 'PROJECTION_UNAVAILABLE')
    }

    const value: CorrectionHistoricalContextReadV1 = {
      schemaVersion: 1,
      kind: 'VIEW',
      sessionId,
      findingId,
      findingKind: finding.kind,
      historical: {
        guidanceId: revision.guidanceId,
        guidanceRevisionId: revision.revisionId,
        patternId: revision.patternId,
        patternRevisionId: revision.patternRevisionId,
        patternProvenanceDigest: revision.patternProvenanceDigest,
        evidenceStrength: revision.evidenceStrength!,
        supportCount: revision.supportCount!,
        supportUtcDateCount: revision.supportUtcDateCount!,
        ...rendered,
      },
      observedAt: Date.now(),
    }
    if (JSON.stringify(value).length > CORRECTION_HISTORICAL_CONTEXT_MAX_RESPONSE_CHARS) {
      return unavailable(sessionId, findingId, 'PROJECTION_UNAVAILABLE')
    }
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    return success(value)
  } catch {
    return failure('risk-advisor/internal', 'bridge unavailable')
  }
}

function createRoute(
  sessions: SessionStore,
  liveCorrection: LiveCorrectionDiagnostics,
  identities: CorrectionHistoricalIdentityRegistry,
  guidance: GuidanceDiagnostics,
): ConnectionFetchRoute {
  return {
    path: CORRECTION_HISTORICAL_CONTEXT_ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: request => handleFetch(request, sessions, liveCorrection, identities, guidance),
  }
}

async function handleFetch(
  request: Request,
  sessions: SessionStore,
  liveCorrection: LiveCorrectionDiagnostics,
  identities: CorrectionHistoricalIdentityRegistry,
  guidance: GuidanceDiagnostics,
): Promise<Response> {
  if (request.method !== 'POST') return new Response('not found', { status: 404 })
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') return new Response('content type must be application/json', { status: 415 })
  let body: unknown
  try { body = await request.json() } catch { return new Response('body is not JSON', { status: 400 }) }
  const parsed = clientRequestSchema.safeParse(body)
  if (!parsed.success) return connectionResponse(INVALID_REQUEST_RPC_ID, failure('gateway/bad-request', 'invalid client-request message'))
  const message = parsed.data
  if (message.method !== CORRECTION_HISTORICAL_CONTEXT_ENDPOINT) {
    return connectionResponse(message.rpcId, failure('gateway/bad-request', 'request method does not match route endpoint'))
  }
  try {
    const result = await handleCorrectionHistoricalContextRpc(sessions, liveCorrection, identities, guidance,
      message.method, message.payload, request.signal)
    return connectionResponse(message.rpcId, result)
  } catch {
    return connectionResponse(message.rpcId, failure('risk-advisor/internal', 'bridge unavailable'))
  }
}

function newestFinding(diagnostics: LiveCorrectionDiagnostics, session: Parameters<LiveCorrectionDiagnostics['forSession']>[0]): LiveCorrectionFindingV1 | undefined {
  const view = diagnostics.forSession(session)
  return [...view.findings].sort((a, b) => b.observedAt - a.observedAt || a.findingId.localeCompare(b.findingId))[0]
}

function isEligibleFinding(finding: LiveCorrectionFindingV1 | undefined): finding is LiveCorrectionFindingV1 {
  return finding !== undefined && (finding.kind === 'REPEATED_FAILURE_WITHOUT_PROGRESS' || finding.kind === 'POSTCONDITION_NOT_SATISFIED')
}

function sameFinding(a: LiveCorrectionFindingV1, b: LiveCorrectionFindingV1 | undefined): boolean {
  return b !== undefined && a.findingId === b.findingId && a.executionId === b.executionId
    && a.kind === b.kind && a.observedAt === b.observedAt
}

function eligibleGuidance(
  revision: NonNullable<ReturnType<GuidanceDiagnostics['currentForPattern']>>,
  patternId: string,
): boolean {
  return revision.patternId === patternId && revision.state === 'ACTIVE' && revision.patternState === 'QUALIFIED'
    && revision.evidenceStrength === 'QUALIFIED_PATTERN' && revision.supportCount !== undefined
    && revision.supportUtcDateCount !== undefined && revision.guidanceId.length <= 256
    && revision.revisionId.length <= 256 && revision.patternRevisionId.length <= 256
    && /^[a-f0-9]{64}$/.test(revision.patternProvenanceDigest)
}

function success(value: CorrectionHistoricalContextReadV1): RpcResult {
  const frozen = freezeCorrectionHistoricalContextRead(value)
  return frozen === undefined
    ? unavailable(value.sessionId, value.findingId, 'PROJECTION_UNAVAILABLE')
    : Object.freeze({ ok: true as const, value: frozen })
}

function notFound(sessionId: string, findingId: string): RpcResult {
  return success({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, findingId })
}

function unavailable(sessionId: string, findingId: string, reason: CorrectionHistoricalContextReasonCodeV1): RpcResult {
  return success({ schemaVersion: 1, kind: 'UNAVAILABLE', sessionId, findingId, reasonCodes: [reason] })
}

function failure(code: string, message: string): RpcResult {
  return Object.freeze({ ok: false as const, error: Object.freeze({ code, message, details: EMPTY_DETAILS }) })
}

function connectionResponse(rpcId: string, result: RpcResult): Response {
  return Response.json({ type: 'server-response', rpcId, result })
}
