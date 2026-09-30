import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-user-approval'
import { ActiveExecutionIndex, createCorrelationDiagnostics } from './host/correlation.ts'
import type { CorrelationDiagnostics } from './host/correlation.ts'
import { installLedger } from './host/ledger.ts'
import type { LedgerDiagnostics } from './host/ledger.ts'
import { OperationFoundation } from './host/operation-foundation.ts'
import type { FoundationDiagnostics } from './host/operation-foundation.ts'
import { ApprovalAssessmentCoordinator } from './host/assessment-envelope.ts'
import type { AssessmentDiagnostics } from './host/assessment-envelope.ts'
import { installRiskAdvisorBrowserBridge } from './host/browser-bridge.ts'
import type { HostConnectionLike } from './host/browser-bridge.ts'

export const inject = ['tools']

declare module '@deepseek-ai/cordis' {
interface Context {
  riskAdvisorCorrelation: CorrelationDiagnostics
  riskAdvisorLedger: LedgerDiagnostics
  riskAdvisorFoundation: FoundationDiagnostics
  riskAdvisorAssessments: AssessmentDiagnostics
}
}

interface CorrelationHooks {
  readonly capture?: (exec: Parameters<ActiveExecutionIndex['observePreExecute']>[0], executionId: ReturnType<ActiveExecutionIndex['observePreExecute']>, parentExecutionId: string | undefined) => void
  readonly retire?: (exec: Parameters<ActiveExecutionIndex['observeResult']>[0]) => void
  readonly sessionEvent?: (session: Session, event: SessionEvent, index: ActiveExecutionIndex) => void
  readonly sessionDisposed?: (session: Session) => void
}

function installCorrelationInternal(ctx: Context, hooks: CorrelationHooks = {}): CorrelationDiagnostics {
  const index = new ActiveExecutionIndex()
  const diagnostics = createCorrelationDiagnostics(index)
  ctx.provide('riskAdvisorCorrelation', diagnostics)
  ctx.on('tools/pre-execute', (exec, next) => {
    const executionId = index.observePreExecute(exec)
    try { hooks.capture?.(exec, executionId, index.parentExecutionIdOf(exec)) } catch { /* Foundation is observational. */ }
    return next()
  })
  ctx.on('tools/result', (exec, result) => {
    try { hooks.retire?.(exec) } catch { /* Foundation is observational. */ }
    index.observeResult(exec, result)
  })
  ctx.on('session/event', (session, event) => {
    index.observeSessionEvent(session, event)
    try { hooks.sessionEvent?.(session, event, index) } catch { /* Assessment is observational. */ }
  })
  ctx.on('session/disposed', session => {
    try { hooks.sessionDisposed?.(session) } catch { /* Assessment is observational. */ }
  })
  ctx.effect(() => () => { index.dispose() }, 'risk-advisor-correlation-generation')
  return diagnostics
}

/** Install the Host-only R2 observer and return its sanitized diagnostic seam. */
export function installCorrelation(ctx: Context): CorrelationDiagnostics {
  return installCorrelationInternal(ctx)
}

/** Host bundle entry. R2 observes native execution and approval events only. */
export function apply(ctx: Context): void {
  const foundation = new OperationFoundation()
  const assessments = new ApprovalAssessmentCoordinator(foundation.diagnostics)
  installCorrelationInternal(ctx, {
    capture: (exec, executionId, parentExecutionId) => { foundation.capture(exec, executionId, parentExecutionId) },
    retire: exec => { foundation.retire(exec) },
    sessionEvent: (session, event, index) => { assessments.observeSessionEvent(session, event, index) },
    sessionDisposed: session => { assessments.observeSessionDisposed(session) },
  })
  ctx.provide('riskAdvisorFoundation', foundation.diagnostics)
  ctx.provide('riskAdvisorAssessments', assessments.diagnostics)
  ctx.inject(['connection', 'sessions'], bridgeCtx => {
    const connection = bridgeCtx.get('connection', false) as HostConnectionLike | undefined
    if (connection !== undefined) installRiskAdvisorBrowserBridge(bridgeCtx, connection, assessments)
  })
  ctx.effect(() => () => { foundation.dispose() }, 'risk-advisor-operation-foundation-generation')
  ctx.effect(() => () => { assessments.dispose() }, 'risk-advisor-assessment-generation')
  installLedger(ctx)
}

export { ActiveExecutionIndex }
export { installLedger, LEDGER_LIMITS } from './host/ledger.ts'
export {
  PTC_REPLAY_LIMITS,
  replayPtcSession,
  replayPtcSnapshot,
} from './host/ptc-replay.ts'
export type {
  ActiveExecutionLookup,
  CorrelationObservation,
  CorrelationDiagnostics,
  ExecutionId,
  NotFoundReason,
} from './host/correlation.ts'
export type { FoundationBoundaryDiagnostic, FoundationDiagnostic, FoundationDiagnostics, FoundationStatus, FoundationToolKind, FoundationUnknown } from './host/operation-foundation.ts'
export type { AssessmentAssociation, AssessmentBridgeSnapshot, AssessmentDiagnostic, AssessmentDiagnostics, AssessmentIssueSummary, AssessmentReasonCode, AssessmentStage, AssessmentStatus, ApprovalAssessmentShell } from './host/assessment-envelope.ts'
export type { BrowserBridgeClientResult, BrowserSafeReasonCode, RiskAdvisorBridgeRead, RiskAdvisorBridgeViewV1 } from './bridge-contract.ts'
export type {
  DurableOccurrenceRef,
  EdgeResolution,
  EvidenceRef,
  PtcOrphanSettlement,
  PtcReplayOccurrence,
  PtcReplayProjection,
  ReplayIssue,
  ReplayStatus,
  SettlementResolution,
} from './host/ptc-replay.ts'
export type {
  ApprovalLifecycle,
  ExecutionLifecycle,
  LedgerApprovalFact,
  LedgerDiagnostics,
  LedgerEvidenceRef,
  LedgerExecutionFact,
  LedgerHealth,
  LedgerIssue,
  LedgerProvenance,
  LedgerQueryOptions,
  LedgerSnapshot,
  LedgerTerminalClaim,
} from './host/ledger.ts'
export {
  projectApprovalOutcome,
  projectPtcProjection,
  projectShellResult,
  projectTerminalClaim,
  projectTerminalClaims,
} from './host/explicit-failure.ts'
export type {
  EvidenceStrength,
  ExecutionTerminalFact,
  ExplicitFailureFact,
  ExplicitFailureKind,
  Phase2ApprovalProjection,
  Phase2ExecutionOutcome,
  Phase2ExecutionOutcomeRecord,
  Phase2LedgerSnapshot,
  Phase2PtcOutcomeRecord,
  Phase2PtcProjection,
  ShellEvidence,
  TerminalStatus,
} from './host/explicit-failure.ts'
