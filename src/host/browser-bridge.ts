import type { Context } from '@deepseek-ai/cordis'
import type { SessionId, SessionStore } from '@deepseek-ai/dsh-session'
import type {
  AssessmentBridgeSnapshot,
  ApprovalAssessmentCoordinator,
} from './assessment-envelope.ts'
import {
  RISK_ADVISOR_RPC_CHANNEL,
  isBoundedIdentifier,
  isBrowserSafeReasonCode,
  isPlainRecord,
  type BrowserSafeReasonCode,
  type RiskAdvisorBridgeRead,
  type RiskAdvisorBridgeViewV1,
  freezeBridgeRead,
  freezeView,
} from '../bridge-contract.ts'

export interface HostConnectionRpcLike {
  handle: (channel: string, handler: ConnectionRpcHandler) => () => void | Promise<void>
}

export interface HostConnectionLike {
  readonly rpc: HostConnectionRpcLike
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
    () => connection.rpc.handle(RISK_ADVISOR_RPC_CHANNEL, (endpoint, payload, signal) => handleRiskAdvisorRpc(ctx.sessions, coordinator, endpoint, payload, signal)),
    'risk-advisor-browser-bridge-generation',
  )
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
  const query = coordinator.queryActiveForCall(session, payload.callId)
  if (query.kind === 'NOT_FOUND') return success({ kind: 'NOT_FOUND' as const })
  if (query.kind === 'AMBIGUOUS') return success(ambiguousRead())
  return success(viewRead(query.snapshot))
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
  const query = coordinator.queryOpenByAssessmentId(payload.assessmentId)
  if (query.kind === 'NOT_FOUND') return success({ kind: 'NOT_FOUND' as const })
  return success(viewRead(query.snapshot))
}

function viewRead(snapshot: AssessmentBridgeSnapshot): RiskAdvisorBridgeRead {
  const reasonCodes = snapshot.reasonCodes.filter(isBrowserSafeReasonCode) as BrowserSafeReasonCode[]
  const bindable = snapshot.association === 'BOUND' && isBoundedIdentifier(snapshot.assessmentId)
  const view: RiskAdvisorBridgeViewV1 = freezeView({
    schemaVersion: 1,
    sessionId: snapshot.sessionId,
    callId: snapshot.callId,
    ...(bindable ? { assessmentId: snapshot.assessmentId } : {}),
    association: bindable ? 'BOUND' : 'UNBOUND',
    status: 'unavailable',
    stage: 'not-started',
    reasonCodes,
    updatedAt: snapshot.updatedAt,
  })
  return { kind: 'VIEW', view }
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
