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
import type { RuntimeRiskAwarenessRuntime } from './runtime-risk-awareness.ts'
import type { GuidanceDiagnostics } from './guidance-store.ts'
import type { ExecutionId } from './correlation.ts'
import { renderGuidance } from './guidance-schema.ts'
import {
  RISK_ADVISOR_ACTIVE_ENDPOINT,
  RISK_ADVISOR_ACTIVE_ROUTE,
  RISK_ADVISOR_ASSESSMENT_ENDPOINT,
  RISK_ADVISOR_ASSESSMENT_ROUTE,
  RISK_ADVISOR_RUNTIME_RISK_ENDPOINT,
  RISK_ADVISOR_RUNTIME_RISK_ROUTE,
  isBoundedIdentifier,
  isPlainRecord,
  type RiskAdvisorBridgeRead,
  freezeBridgeRead,
  freezeRuntimeRiskAwarenessRead,
  type RuntimeRiskAwarenessReadV1,
} from '../bridge-contract.ts'
import {
  freezeHistoricalContextRead,
  HISTORICAL_CONTEXT_ENDPOINT,
  HISTORICAL_CONTEXT_REASON_CODES_V1,
  HISTORICAL_CONTEXT_ROUTE,
  type HistoricalContextReadV1,
} from '../historical-context-contract.ts'
import {
  APPROVAL_HISTORICAL_CONTEXT_ENDPOINT,
  APPROVAL_HISTORICAL_CONTEXT_ROUTE,
  parseApprovalHistoricalContextRequest,
  freezeApprovalHistoricalContextRead,
  type ApprovalHistoricalContextReadV1,
} from '../approval-historical-context-contract.ts'
import { presentRiskAssessment } from './presentation/risk-assessment-presenter.ts'

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
  runtimeRisk?: RuntimeRiskAwarenessRuntime,
  guidance?: GuidanceDiagnostics,
): void {
  ctx.effect(
    async () => {
      const registrations: (() => Promise<void>)[] = []
      const handler: ConnectionRpcHandler = (endpoint, payload, signal) => handleRiskAdvisorRpc(ctx.sessions, coordinator, endpoint, payload, signal, runtimeRisk, guidance)
      try {
        registrations.push(connection.fetch.register(createRiskAdvisorRoute(
          RISK_ADVISOR_ACTIVE_ROUTE,
          RISK_ADVISOR_ACTIVE_ENDPOINT,
          'active',
          handler,
        )))
        if (runtimeRisk !== undefined) registrations.push(connection.fetch.register(createRiskAdvisorRoute(
          RISK_ADVISOR_RUNTIME_RISK_ROUTE,
          RISK_ADVISOR_RUNTIME_RISK_ENDPOINT,
          'runtime-risk',
          handler,
        )))
        if (runtimeRisk !== undefined && guidance !== undefined) registrations.push(connection.fetch.register(createRiskAdvisorRoute(
          HISTORICAL_CONTEXT_ROUTE,
          HISTORICAL_CONTEXT_ENDPOINT,
          'historical-context',
          handler,
        )))
        if (runtimeRisk !== undefined && guidance !== undefined) registrations.push(connection.fetch.register(createRiskAdvisorRoute(
          APPROVAL_HISTORICAL_CONTEXT_ROUTE,
          APPROVAL_HISTORICAL_CONTEXT_ENDPOINT,
          'approval-historical-context',
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
  wireEndpoint: typeof RISK_ADVISOR_ACTIVE_ENDPOINT | typeof RISK_ADVISOR_ASSESSMENT_ENDPOINT | typeof RISK_ADVISOR_RUNTIME_RISK_ENDPOINT | typeof HISTORICAL_CONTEXT_ENDPOINT | typeof APPROVAL_HISTORICAL_CONTEXT_ENDPOINT,
  endpoint: 'active' | 'assessment' | 'runtime-risk' | 'historical-context' | 'approval-historical-context',
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
  wireEndpoint: typeof RISK_ADVISOR_ACTIVE_ENDPOINT | typeof RISK_ADVISOR_ASSESSMENT_ENDPOINT | typeof RISK_ADVISOR_RUNTIME_RISK_ENDPOINT | typeof HISTORICAL_CONTEXT_ENDPOINT | typeof APPROVAL_HISTORICAL_CONTEXT_ENDPOINT,
  endpoint: 'active' | 'assessment' | 'runtime-risk' | 'historical-context' | 'approval-historical-context',
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
  runtimeRisk?: RuntimeRiskAwarenessRuntime,
  guidance?: GuidanceDiagnostics,
): Promise<ConnectionRpcResultLike> {
  try {
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (endpoint === 'active') return await handleActive(sessions, coordinator, payload, signal)
    if (endpoint === 'assessment') return await handleAssessment(coordinator, payload, signal)
    if (endpoint === 'runtime-risk') return await handleRuntimeRisk(sessions, runtimeRisk, payload, signal)
    if (endpoint === 'historical-context') return await handleHistoricalContext(sessions, runtimeRisk, guidance, payload, signal)
    if (endpoint === 'approval-historical-context') return await handleApprovalHistoricalContext(sessions, coordinator, runtimeRisk, guidance, payload, signal)
    return failure('risk-advisor/endpoint-not-found', 'endpoint not found')
  } catch {
    return failure('risk-advisor/internal', 'bridge unavailable')
  }
}

async function handleApprovalHistoricalContext(
  sessions: SessionStore,
  coordinator: ApprovalAssessmentCoordinator,
  runtimeRisk: RuntimeRiskAwarenessRuntime | undefined,
  guidance: GuidanceDiagnostics | undefined,
  payload: unknown,
  signal: AbortSignal,
): Promise<ConnectionRpcResultLike> {
  const request = parseApprovalHistoricalContextRequest(payload)
  if (request === undefined) return failure('risk-advisor/bad-request', 'invalid request')
  const { sessionId, callId } = request
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
  const session = sessions.get(sessionId as SessionId)
  if (session === undefined) return approvalHistoricalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, callId })
  if (runtimeRisk === undefined || guidance === undefined) return approvalHistoricalUnavailable(sessionId, callId, 'GUIDANCE_UNAVAILABLE')

  const binding = coordinator.queryOpenApprovalHistoricalBinding(session, callId)
  if (binding.kind !== 'VIEW') return approvalHistoricalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, callId })
  const patternId = runtimeRisk.currentApprovalHistoricalPatternId(session, binding.executionId, binding.baseAssessmentId)
  if (patternId === undefined) return approvalHistoricalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, callId })
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')

  try {
    if (guidance.status() !== 'READY') return approvalHistoricalUnavailable(sessionId, callId, 'GUIDANCE_UNAVAILABLE')
    const revision = guidance.currentForPattern(patternId)
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (revision === undefined) return guidance.status() === 'READY'
      ? approvalHistoricalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, callId })
      : approvalHistoricalUnavailable(sessionId, callId, 'GUIDANCE_UNAVAILABLE')
    if (!eligibleApprovalGuidance(revision, patternId)) return approvalHistoricalUnavailable(sessionId, callId, 'PROJECTION_UNAVAILABLE')
    const rendered = renderGuidance(revision)
    if (rendered === undefined) return approvalHistoricalUnavailable(sessionId, callId, 'PROJECTION_UNAVAILABLE')

    // Reconfirm every authority-bearing identity after projection and before disclosure.
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (sessions.get(sessionId as SessionId) !== session) return approvalHistoricalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, callId })
    const currentBinding = coordinator.queryOpenApprovalHistoricalBinding(session, callId)
    const currentPatternId = runtimeRisk.currentApprovalHistoricalPatternId(session, binding.executionId, binding.baseAssessmentId)
    if (currentBinding.kind !== 'VIEW' || currentPatternId !== patternId
      || currentBinding.approvalId !== binding.approvalId
      || currentBinding.executionId !== binding.executionId
      || currentBinding.baseAssessmentId !== binding.baseAssessmentId) {
      return approvalHistoricalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, callId })
    }
    if (guidance.status() !== 'READY') return approvalHistoricalUnavailable(sessionId, callId, 'GUIDANCE_UNAVAILABLE')
    const latestRevision = guidance.currentForPattern(patternId)
    if (latestRevision === undefined) return approvalHistoricalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId, callId })
    if (!eligibleApprovalGuidance(latestRevision, patternId)) return approvalHistoricalUnavailable(sessionId, callId, 'PROJECTION_UNAVAILABLE')
    if (latestRevision.revisionId !== revision.revisionId
      || latestRevision.patternRevisionId !== revision.patternRevisionId
      || latestRevision.patternProvenanceDigest !== revision.patternProvenanceDigest) {
      return approvalHistoricalUnavailable(sessionId, callId, 'PROJECTION_UNAVAILABLE')
    }
    const value: ApprovalHistoricalContextReadV1 = {
      schemaVersion: 1,
      kind: 'VIEW',
      sessionId,
      callId,
      approvalId: binding.approvalId,
      executionId: binding.executionId,
      baseAssessmentId: binding.baseAssessmentId,
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
    if (JSON.stringify(value).length > MAX_HISTORICAL_CONTEXT_RESPONSE_CHARS) return approvalHistoricalUnavailable(sessionId, callId, 'PROJECTION_UNAVAILABLE')
    return approvalHistoricalSuccess(value)
  } catch {
    return approvalHistoricalUnavailable(sessionId, callId, 'PROJECTION_UNAVAILABLE')
  }
}

function eligibleApprovalGuidance(revision: NonNullable<ReturnType<GuidanceDiagnostics['currentForPattern']>>, patternId: string): boolean {
  return revision.patternId === patternId && revision.state === 'ACTIVE' && revision.patternState === 'QUALIFIED'
    && revision.evidenceStrength === 'QUALIFIED_PATTERN' && revision.supportCount !== undefined
    && revision.supportUtcDateCount !== undefined && revision.guidanceId.length <= 256
    && revision.revisionId.length <= 256 && revision.patternRevisionId.length <= 256
    && /^[a-f0-9]{64}$/.test(revision.patternProvenanceDigest)
}

function approvalHistoricalSuccess(value: ApprovalHistoricalContextReadV1): ConnectionRpcResultLike {
  const frozen = freezeApprovalHistoricalContextRead(value)
  return frozen === undefined
    ? approvalHistoricalUnavailable(value.sessionId, value.callId, 'PROJECTION_UNAVAILABLE')
    : Object.freeze({ ok: true as const, value: frozen })
}

function approvalHistoricalUnavailable(sessionId: string, callId: string, reason: 'GUIDANCE_UNAVAILABLE' | 'PROJECTION_UNAVAILABLE'): ConnectionRpcResultLike {
  return approvalHistoricalSuccess({ schemaVersion: 1, kind: 'UNAVAILABLE', sessionId, callId, reasonCodes: [reason] })
}

const MAX_HISTORICAL_CONTEXT_RESPONSE_CHARS = 24_000

async function handleHistoricalContext(
  sessions: SessionStore,
  runtimeRisk: RuntimeRiskAwarenessRuntime | undefined,
  guidance: GuidanceDiagnostics | undefined,
  payload: unknown,
  signal: AbortSignal,
): Promise<ConnectionRpcResultLike> {
  if (!isPlainRecord(payload) || !exactKeys(payload, ['sessionId', 'executionId', 'assessmentId'])
    || !isBoundedIdentifier(payload.sessionId) || !isBoundedIdentifier(payload.executionId)
    || !isBoundedIdentifier(payload.assessmentId)) return failure('risk-advisor/bad-request', 'invalid request')
  const { sessionId, executionId, assessmentId } = payload
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
  const session = sessions.get(sessionId as SessionId)
  if (session === undefined) return historicalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId })
  if (runtimeRisk === undefined || guidance === undefined) {
    return historicalUnavailable(sessionId, HISTORICAL_CONTEXT_REASON_CODES_V1[0])
  }
  const patternId = runtimeRisk.currentHistoricalPatternId(session, executionId as ExecutionId, assessmentId)
  if (patternId === undefined) return historicalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId })
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
  try {
    if (guidance.status() !== 'READY') return historicalUnavailable(sessionId, 'GUIDANCE_UNAVAILABLE')
    const revision = guidance.currentForPattern(patternId)
    if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
    if (revision === undefined) return guidance.status() === 'READY'
      ? historicalSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId })
      : historicalUnavailable(sessionId, 'GUIDANCE_UNAVAILABLE')
    if (revision.patternId !== patternId || revision.state !== 'ACTIVE' || revision.patternState !== 'QUALIFIED'
      || revision.evidenceStrength !== 'QUALIFIED_PATTERN' || revision.supportCount === undefined
      || revision.supportUtcDateCount === undefined || revision.guidanceId.length > 256
      || revision.revisionId.length > 256 || revision.patternRevisionId.length > 256
      || !/^[a-f0-9]{64}$/.test(revision.patternProvenanceDigest)) {
      return historicalUnavailable(sessionId, 'PROJECTION_UNAVAILABLE')
    }
    const rendered = renderGuidance(revision)
    if (rendered === undefined) return historicalUnavailable(sessionId, 'PROJECTION_UNAVAILABLE')
    const value: HistoricalContextReadV1 = {
      schemaVersion: 1,
      kind: 'VIEW',
      sessionId,
      executionId,
      assessmentId,
      historical: {
        guidanceId: revision.guidanceId,
        guidanceRevisionId: revision.revisionId,
        patternId: revision.patternId,
        patternRevisionId: revision.patternRevisionId,
        patternProvenanceDigest: revision.patternProvenanceDigest,
        evidenceStrength: revision.evidenceStrength,
        supportCount: revision.supportCount,
        supportUtcDateCount: revision.supportUtcDateCount,
        ...rendered,
      },
      observedAt: Date.now(),
    }
    if (JSON.stringify(value).length > MAX_HISTORICAL_CONTEXT_RESPONSE_CHARS) {
      return historicalUnavailable(sessionId, 'PROJECTION_UNAVAILABLE')
    }
    return historicalSuccess(value)
  } catch {
    return historicalUnavailable(sessionId, 'PROJECTION_UNAVAILABLE')
  }
}

function historicalSuccess(value: HistoricalContextReadV1): ConnectionRpcResultLike {
  const frozen = freezeHistoricalContextRead(value)
  return frozen === undefined
    ? historicalUnavailable(value.sessionId, 'PROJECTION_UNAVAILABLE')
    : Object.freeze({ ok: true as const, value: frozen })
}

function historicalUnavailable(sessionId: string, reason: 'GUIDANCE_UNAVAILABLE' | 'PROJECTION_UNAVAILABLE'): ConnectionRpcResultLike {
  return historicalSuccess({ schemaVersion: 1, kind: 'UNAVAILABLE', sessionId, reasonCodes: [reason] })
}

const MAX_RUNTIME_RESPONSE_CHARS = 24_000

async function handleRuntimeRisk(
  sessions: SessionStore,
  runtimeRisk: RuntimeRiskAwarenessRuntime | undefined,
  payload: unknown,
  signal: AbortSignal,
): Promise<ConnectionRpcResultLike> {
  if (!isPlainRecord(payload) || !exactKeys(payload, ['sessionId']) || !isBoundedIdentifier(payload.sessionId)) {
    return failure('risk-advisor/bad-request', 'invalid request')
  }
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
  const sessionId = payload.sessionId
  const session = sessions.get(sessionId as SessionId)
  if (session === undefined) return runtimeSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId })
  if (signal.aborted) return failure('risk-advisor/cancelled', 'request cancelled')
  if (runtimeRisk === undefined) return runtimeSuccess({ schemaVersion: 1, kind: 'UNAVAILABLE', sessionId, reasonCodes: ['ASSESSMENT_UNAVAILABLE'] })

  const query = runtimeRisk.query(session)
  if (query.kind === 'NOT_FOUND') return runtimeSuccess({ schemaVersion: 1, kind: 'NOT_FOUND', sessionId })
  if (query.kind === 'UNAVAILABLE') return runtimeSuccess({ schemaVersion: 1, kind: 'UNAVAILABLE', sessionId, reasonCodes: query.reasonCodes })
  try {
    const assessment = query.assessment === undefined ? undefined : presentRiskAssessment(query.assessment)
    const value: RuntimeRiskAwarenessReadV1 = {
      ...query.view,
      kind: 'VIEW',
      ...(assessment === undefined ? {} : { assessment }),
    }
    if (JSON.stringify(value).length <= MAX_RUNTIME_RESPONSE_CHARS) return runtimeSuccess(value)
    return runtimeSuccess({
      ...query.view,
      kind: 'VIEW',
      status: 'DEGRADED',
      stage: 'COMPLETE',
      reasonCodes: Object.freeze([...new Set([...query.view.reasonCodes, 'CONTEXT_DEGRADED' as const])]),
    })
  } catch {
    return runtimeSuccess({ schemaVersion: 1, kind: 'UNAVAILABLE', sessionId, reasonCodes: ['ASSESSMENT_UNAVAILABLE'] })
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

function runtimeSuccess(value: RuntimeRiskAwarenessReadV1): ConnectionRpcResultLike {
  return Object.freeze({ ok: true as const, value: freezeRuntimeRiskAwarenessRead(value) })
}

function failure(code: string, message: string): ConnectionRpcResultLike {
  return Object.freeze({ ok: false as const, error: Object.freeze({ code, message, details: EMPTY_DETAILS }) })
}

function exactKeys(value: Record<string, unknown>, required: readonly string[]): boolean {
  const keys = Object.keys(value)
  return required.every(key => Object.hasOwn(value, key)) && keys.length === required.length && keys.every(key => required.includes(key))
}
