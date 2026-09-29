import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-user-approval'
import { ActiveExecutionIndex, createCorrelationDiagnostics } from './host/correlation.ts'
import type { CorrelationDiagnostics } from './host/correlation.ts'
import { installLedger } from './host/ledger.ts'
import type { LedgerDiagnostics } from './host/ledger.ts'

export const inject = ['tools']

declare module '@deepseek-ai/cordis' {
interface Context {
  riskAdvisorCorrelation: CorrelationDiagnostics
  riskAdvisorLedger: LedgerDiagnostics
}
}

/** Install the Host-only R2 observer and return its sanitized diagnostic seam. */
export function installCorrelation(ctx: Context): CorrelationDiagnostics {
  const index = new ActiveExecutionIndex()
  const diagnostics = createCorrelationDiagnostics(index)
  ctx.provide('riskAdvisorCorrelation', diagnostics)
  ctx.on('tools/pre-execute', (exec, next) => index.observePreExecuteAndContinue(exec, next))
  ctx.on('tools/result', (exec, result) => { index.observeResult(exec, result) })
  ctx.on('session/event', (session, event) => { index.observeSessionEvent(session, event) })
  ctx.effect(() => () => { index.dispose() }, 'risk-advisor-correlation-generation')
  return diagnostics
}

/** Host bundle entry. R2 observes native execution and approval events only. */
export function apply(ctx: Context): void {
  installCorrelation(ctx)
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
