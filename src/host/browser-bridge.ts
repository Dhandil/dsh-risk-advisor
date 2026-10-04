import type { Context } from '@deepseek-ai/cordis'
import {
  clientRequestSchema,
  RpcId,
  type ConnectionFetchRoute,
  type HostConnectionFetch,
} from '@deepseek-ai/dsh-client-connection'
import type { SessionId, SessionStore } from '@deepseek-ai/dsh-session'
import type {
  ApprovalAssessmentCoordinator,
  Phase6PresentationQuery,
} from './assessment-envelope.ts'
import {
  RISK_ADVISOR_ACTIVE_ENDPOINT,
  RISK_ADVISOR_ACTIVE_ROUTE,
  RISK_ADVISOR_ASSESSMENT_ENDPOINT,
  RISK_ADVISOR_ASSESSMENT_ROUTE,
  isBoundedIdentifier,
  isPlainRecord,
  type RiskAdvisorBridgeRead,
  freezeBridgeRead,
} from '../bridge-contract.ts'

export interface HostConnectionLike {
  readonly fetch: HostConnectionFetch
}

export interface ConnectionRpcFailureLike {
  readonly code: string
  readonly message: string
  readonly details: object
}

export type ConnectionRpcResultLike =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly error: ConnectionRpcFailureLike }

export type ConnectionRpcHandler = (
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
) => Promise<ConnectionRpcResultLike>

const EMPTY_DETAILS = Object.freeze({})

export function installRiskAdvisorBrowserBridge(
  ctx: Context,
  connection: HostConnectionLike,
  coordinator: ApprovalAssessmentCoordinator,
): void {
  ctx.effect(
    async () => {
      const registrations: (() => Promise<void>)[] = []
      const handler: ConnectionRpcHandler = (endpoint, payload, signal) => handleRiskAdvisorRpc(ctx.sessions, coordinator, endpoint, payload, signal)
      try {
        registrations.push(connection.fetch.register(createRiskAdvisorRoute(
          RISK_ADVISOR_ACTIVE_ROUTE,
          RISK_ADVISOR_ACTIVE_ENDPOINT,
          'active',
          handler,
        )))
        registrations.push(connection.fetch.register(createRiskAdvisorRoute(
          RISK_ADVISOR_ASSESSMENT_ROUTE,
          RISK_ADVISOR_ASSESSMENT_ENDPOINT,
          'assessment',
          handler,
        )))
      } catch (error) {
        await disposeRegistrations(registrations)
        throw error
      }
      return async () => { await disposeRegistrations(registrations) }
    },
    'risk-advisor-browser-bridge-generation',
  )
}

const INVALID_REQUEST_RPC_ID = RpcId('invalid-request')

function createRiskAdvisorRoute(
  path: string,
  wireEndpoint: typeof RISK_ADVISOR_ACTIVE_ENDPOINT | typeof RISK_ADVISOR_ASSESSMENT_ENDPOINT,
  endpoint: 'active' | 'assessment',
  handler: ConnectionRpcHandler,
): ConnectionFetchRoute {
  return {
    path,
    methods: ['POST'],
    requestBody: 'buffered',
    fetch: request => handleConnectionFetch(request, wireEndpoint, endpoint, handler),
  }
}

async function handleConnectionFetch(
  request: Request,
  wireEndpoint: typeof RISK_ADVISOR_ACTIVE_ENDPOINT | typeof RISK_ADVISOR_ASSESSMENT_ENDPOINT,
  endpoint: 'active' | 'assessment',
  handler: ConnectionRpcHandler,
): Promise<Response> {
  if (request.method !== 'POST') return new Response('not found', { status: 404 })
  const mediaType = request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase()
  if (mediaType !== 'application/json') return new Response('content type must be application/json', { status: 415 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return new Response('body is not JSON', { status: 400 })
  }

  const parsed = clientRequestSchema.safeParse(body)
  if (!parsed.success) {
    return connectionResponse(INVALID_REQUEST_RPC_ID, failure('gateway/bad-request', 'invalid client-request message'))
  }
  const message = parsed.data
  if (message.method !== wireEndpoint) {
    return connectionResponse(message.rpcId, failure('gateway/bad-request', 'request method does not match route endpoint'))
  }

  try {
    const result = await handler(endpoint, message.payload, request.signal)
    return connectionResponse(message.rpcId, result)
  } catch {
    return connectionResponse(message.rpcId, failure('risk-advisor/internal', 'bridge unavailable'))
  }
}

function connectionResponse(rpcId: string, result: ConnectionRpcResultLike): Response {
  return Response.json({ type: 'server-response', rpcId, result })
}

async function disposeRegistrations(registrations: readonly (() => Promise<void>)[]): Promise<void> {
  for (const dispose of [...registrations].reverse()) {
    try { await dispose() } catch { /* Preserve the owning fiber's failure while draining all routes. */ }
  }
}

export async function handleRiskAdvisorRpc(
  sessions: SessionStore,
  coordinator: ApprovalAssessmentCoordinator,
  endpoint: string,
  payload: unknown,
  signal: AbortSignal,
): Promise<ConnectionRpcResultLike> {
  try {
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (endpoint === 'active') return await handleActive(sessions, coordinator, payload, signal)
    if (endpoint === 'assessment') return await handleAssessment(coordinator, payload, signal)
    return failure('risk-advisor/endpoint-not-found', 'endpoint not found')
  } catch {
    return failure('risk-advisor/internal', 'bridge unavailable')
  }
}

async function handleActive(
  sessions: SessionStore,
  coordinator: ApprovalAssessmentCoordinator,
  payload: unknown,
  signal: AbortSignal,
): Promise<ConnectionRpcResultLike> {
  if (!isPlainRecord(payload) || !exactKeys(payload, ['sessionId', 'callId']) || !isBoundedIdentifier(payload.sessionId) || !isBoundedIdentifier(payload.callId)) {
    return failure('risk-advisor/bad-request', 'invalid request')
  }
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
  const session = sessions.get(payload.sessionId as SessionId)
  if (session === undefined) return success({ kind: 'NOT_FOUND' as const })
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
  const presentation = coordinator.queryActivePresentationForCall(session, payload.callId)
  return presentationResult(presentation)
}

async function handleAssessment(
  coordinator: ApprovalAssessmentCoordinator,
  payload: unknown,
  signal: AbortSignal,
): Promise<ConnectionRpcResultLike> {
  if (!isPlainRecord(payload) || !exactKeys(payload, ['assessmentId']) || !isBoundedIdentifier(payload.assessmentId)) {
    return failure('risk-advisor/bad-request', 'invalid request')
  }
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
  const query = coordinator.queryOpenPresentationByAssessmentId(payload.assessmentId)
  return presentationResult(query)
}

function presentationResult(query: Phase6PresentationQuery): ConnectionRpcResultLike {
  if (query.kind === 'NOT_FOUND') return success({ kind: 'NOT_FOUND' as const })
  if (query.kind === 'AMBIGUOUS') return success(ambiguousRead())
  return success({ kind: 'VIEW' as const, view: query.view })
}

function ambiguousRead(): RiskAdvisorBridgeRead {
  return Object.freeze({
    kind: 'AMBIGUOUS' as const,
    reasonCodes: Object.freeze(['MULTIPLE_ACTIVE_APPROVALS'] as const),
  })
}

function success(value: RiskAdvisorBridgeRead): ConnectionRpcResultLike {
  return Object.freeze({ ok: true as const, value: freezeBridgeRead(value) })
}

function failure(code: string, message: string): ConnectionRpcResultLike {
  return Object.freeze({ ok: false as const, error: Object.freeze({ code, message, details: EMPTY_DETAILS }) })
}

function exactKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  const keys = Object.keys(value)
  return required.every(key => Object.hasOwn(value, key)) && keys.length === required.length && keys.every(key => required.includes(key))
}
