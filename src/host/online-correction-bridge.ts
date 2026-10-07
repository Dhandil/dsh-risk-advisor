import type { Context } from '@deepseek-ai/cordis'
import {
  clientRequestSchema,
  RpcId,
  type ConnectionFetchRoute,
  type HostConnectionFetch,
} from '@deepseek-ai/dsh-client-connection'
import type { SessionId, SessionStore } from '@deepseek-ai/dsh-session'
import {
  ONLINE_CORRECTION_ENDPOINT,
  ONLINE_CORRECTION_ROUTE,
  freezeOnlineCorrectionRead,
  isOnlineCorrectionIdentifier,
  parseOnlineCorrectionRead,
  parseOnlineCorrectionRequest,
  type BrowserOnlineCorrectionFindingV1,
  type BrowserOnlineCorrectionReasonCode,
  type OnlineCorrectionBridgeRead,
} from '../online-correction-contract.ts'
import type { LiveCorrectionDiagnostics, LiveCorrectionFindingV1 } from './live-correction.ts'

export interface OnlineCorrectionHostConnectionLike {
  readonly fetch: HostConnectionFetch
}

interface RpcFailure {
  readonly code: string
  readonly message: string
  readonly details: object
}

type RpcResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: RpcFailure }

const EMPTY_DETAILS = Object.freeze({})
const INVALID_REQUEST_RPC_ID = RpcId('invalid-request')

/** Install the dedicated read-only Phase 12.2 route independently of Approval. */
export function installOnlineCorrectionBrowserBridge(
  ctx: Context,
  connection: OnlineCorrectionHostConnectionLike,
  diagnostics: LiveCorrectionDiagnostics,
): void {
  ctx.effect(async () => {
    const registration = connection.fetch.register(createRoute(ctx.sessions, diagnostics))
    return async () => { await registration() }
  }, 'risk-advisor-online-correction-bridge-generation')
}

export async function handleOnlineCorrectionRpc(
  sessions: SessionStore,
  diagnostics: LiveCorrectionDiagnostics,
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
): Promise<RpcResult> {
  try {
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (endpoint !== ONLINE_CORRECTION_ENDPOINT) return failure('risk-advisor/endpoint-not-found', 'endpoint not found')
    const request = parseOnlineCorrectionRequest(payload)
    if (request === undefined) return failure('risk-advisor/bad-request', 'invalid request')
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    const session = sessions.get(request.sessionId as SessionId)
    if (session === undefined) return success({ kind: 'NOT_FOUND' })
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    const sessionView = diagnostics.forSession(session)
    const runtimeStatus = diagnostics.status()
    const findings = sessionView.findings.map(toBrowserFinding)
    const reasonCodes: BrowserOnlineCorrectionReasonCode[] = []
    if (sessionView.truncated) reasonCodes.push('SESSION_TRUNCATED')
    if (runtimeStatus.f2Availability === 'SATURATED') reasonCodes.push('F2_SIGNAL_SATURATED')
    const candidate = {
      kind: 'VIEW' as const,
      view: {
        schemaVersion: 1 as const,
        sessionId: request.sessionId,
        findings,
        truncated: sessionView.truncated,
        reasonCodes,
      },
    }
    const parsed = parseOnlineCorrectionRead(candidate)
    if (parsed === undefined) return failure('risk-advisor/internal', 'bridge unavailable')
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    return success(parsed)
  } catch {
    return failure('risk-advisor/internal', 'bridge unavailable')
  }
}

function createRoute(sessions: SessionStore, diagnostics: LiveCorrectionDiagnostics): ConnectionFetchRoute {
  return {
    path: ONLINE_CORRECTION_ROUTE,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: request => handleFetch(request, sessions, diagnostics),
  }
}

async function handleFetch(
  request: Request,
  sessions: SessionStore,
  diagnostics: LiveCorrectionDiagnostics,
): Promise<Response> {
  if (request.method !== 'POST') return new Response('not found', { status: 404 })
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') return new Response('content type must be application/json', { status: 415 })
  let body: unknown
  try { body = await request.json() } catch { return new Response('body is not JSON', { status: 400 }) }
  const parsed = clientRequestSchema.safeParse(body)
  if (!parsed.success) return connectionResponse(INVALID_REQUEST_RPC_ID, failure('gateway/bad-request', 'invalid client-request message'))
  const message = parsed.data
  if (message.method !== ONLINE_CORRECTION_ENDPOINT) {
    return connectionResponse(message.rpcId, failure('gateway/bad-request', 'request method does not match route endpoint'))
  }
  if (!isOnlineCorrectionIdentifier(message.rpcId)) return connectionResponse(INVALID_REQUEST_RPC_ID, failure('gateway/bad-request', 'invalid request'))
  try {
    const result = await handleOnlineCorrectionRpc(sessions, diagnostics, message.method, message.payload, request.signal)
    return connectionResponse(message.rpcId, result)
  } catch {
    return connectionResponse(message.rpcId, failure('risk-advisor/internal', 'bridge unavailable'))
  }
}

function connectionResponse(rpcId: string, result: RpcResult): Response {
  return Response.json({ type: 'server-response', rpcId, result })
}

function success(value: OnlineCorrectionBridgeRead): RpcResult {
  return Object.freeze({ ok: true as const, value: freezeOnlineCorrectionRead(value) })
}

function failure(code: string, message: string): RpcResult {
  return Object.freeze({ ok: false as const, error: Object.freeze({ code, message, details: EMPTY_DETAILS }) })
}

function toBrowserFinding(finding: LiveCorrectionFindingV1): BrowserOnlineCorrectionFindingV1 {
  return Object.freeze({
    findingId: finding.findingId,
    kind: finding.kind,
    diagnosis: finding.diagnosis,
    disposition: finding.disposition,
    advisoryCode: finding.advisoryCode,
    observedAt: finding.observedAt,
  })
}
