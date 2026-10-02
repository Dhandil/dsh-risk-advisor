import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
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
import { RetryEscalationAnalyzer } from './host/retry-escalation.ts'
import type { FailureChainDiagnostics } from './host/retry-escalation.ts'
import { RuleEngine } from './host/rule-engine.ts'
import type { RuleDiagnostics } from './host/rule-engine.ts'
import type { FastJudgeConfig } from './host/fast-judge.ts'
import { ExpectedEffectRegistry } from './host/expected-effect.ts'
import { PostconditionVerifier } from './host/postcondition-verifier.ts'
import type { VerificationDiagnostics, VerificationRecordV1 } from './host/verification-store.ts'

export const inject = ['tools']

declare module '@deepseek-ai/cordis' {
interface Context {
  riskAdvisorCorrelation: CorrelationDiagnostics
  riskAdvisorLedger: LedgerDiagnostics
  riskAdvisorFoundation: FoundationDiagnostics
  riskAdvisorAssessments: AssessmentDiagnostics
  riskAdvisorFailureChain: FailureChainDiagnostics
  riskAdvisorRules: RuleDiagnostics
  riskAdvisorVerification: VerificationDiagnostics
}
}

interface CorrelationHooks {
  readonly capture?: (exec: Parameters<ActiveExecutionIndex['observePreExecute']>[0], executionId: ReturnType<ActiveExecutionIndex['observePreExecute']>, parentExecutionId: string | undefined) => void
  readonly retire?: (exec: Parameters<ActiveExecutionIndex['observeResult']>[0], result: ToolExecutionResult) => void
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
    try { hooks.retire?.(exec, result) } catch { /* Foundation is observational. */ }
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
export function apply(ctx: Context, config: { readonly fastJudge?: FastJudgeConfig } = {}): void {
  const ledger = installLedger(ctx)
  const foundation = new OperationFoundation()
  const failureChain = new RetryEscalationAnalyzer()
  const rules = new RuleEngine()
  const expectedEffects = new ExpectedEffectRegistry()
  const verifier = new PostconditionVerifier(expectedEffects, {
    onRecord: (record: VerificationRecordV1) => { failureChain.observeVerification(record) },
  })
  const assessments = new ApprovalAssessmentCoordinator(foundation.diagnostics, {
    rules: rules.diagnostics,
    failureChain: failureChain.diagnostics,
    ledger,
    ...config.fastJudge === undefined ? {} : { fastJudge: config.fastJudge },
  })
  installCorrelationInternal(ctx, {
    capture: (exec, executionId, parentExecutionId) => {
      foundation.capture(exec, executionId, parentExecutionId)
      failureChain.observePreExecute(exec, executionId)
      rules.observePreExecute(exec, executionId, executionId === undefined ? undefined : failureChain.diagnostics.get(executionId))
      expectedEffects.capture(exec, executionId)
      assessments.captureReviewerSeed(exec, executionId)
    },
    retire: (exec, result) => {
      failureChain.observeResult(exec, result)
      verifier.observeResult(exec, result)
      foundation.retire(exec)
    },
    sessionEvent: (session, event, index) => { assessments.observeSessionEvent(session, event, index) },
    sessionDisposed: session => { assessments.observeSessionDisposed(session) },
  })
  ctx.provide('riskAdvisorFoundation', foundation.diagnostics)
  ctx.provide('riskAdvisorAssessments', assessments.diagnostics)
  ctx.provide('riskAdvisorFailureChain', failureChain.diagnostics)
  ctx.provide('riskAdvisorRules', rules.diagnostics)
  ctx.provide('riskAdvisorVerification', verifier.store.diagnostics)
  ctx.inject(['connection', 'sessions'], bridgeCtx => {
    const connection = bridgeCtx.get('connection', false) as HostConnectionLike | undefined
    if (connection !== undefined) installRiskAdvisorBrowserBridge(bridgeCtx, connection, assessments)
  })
  ctx.inject(['llm'], judgeCtx => {
    const llm = judgeCtx.get('llm')
    if (llm !== undefined) assessments.attachJudge(llm)
    judgeCtx.effect(() => () => assessments.detachJudge(), 'risk-advisor-fast-judge-capability')
  })
  ctx.inject(['shell'], shellCtx => {
    const shell = shellCtx.get('shell', false)
    if (shell !== undefined) verifier.attach(shell)
    shellCtx.inject(['sandboxPolicy'], async policyCtx => {
      const sandboxPolicy = policyCtx.get('sandboxPolicy', false)
      if (shell !== undefined) await verifier.attachGeneration(shell, sandboxPolicy)
      policyCtx.effect(() => async () => { await verifier.detach() }, 'risk-advisor-postcondition-sandbox-policy-capability')
    })
    shellCtx.effect(() => async () => { await verifier.detach() }, 'risk-advisor-postcondition-shell-capability')
  })
  ctx.on('session/disposed', session => { verifier.cancelSession(session) })
  ctx.effect(() => () => { foundation.dispose() }, 'risk-advisor-operation-foundation-generation')
  ctx.effect(() => () => assessments.dispose(), 'risk-advisor-assessment-generation')
  ctx.effect(() => () => { failureChain.dispose() }, 'risk-advisor-failure-chain-generation')
  ctx.effect(() => () => { rules.dispose() }, 'risk-advisor-rule-engine-generation')
  ctx.effect(() => () => verifier.dispose(), 'risk-advisor-postcondition-verification-generation')
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
export type { VerificationDiagnostics, VerificationRecordV1, VerificationReasonCode, VerificationStatus, SemanticSuccess } from './host/verification-store.ts'
export type { FailureChainDiagnostics, FailureChainEntry, FailureChainFailureKind, FailureChainSummary, RelationSummaryStatus, RetryEscalationOptions } from './host/retry-escalation.ts'
export type { RuleDiagnostics, RuleEvaluationStatus, RuleParserConfidence, RuleOperationKind, RuleFindingCategory, RuleFinding, RuleFailureContext, RuleEvaluation } from './host/rule-engine.ts'
export type { AssessmentAssociation, AssessmentBridgeSnapshot, AssessmentDiagnostic, AssessmentDiagnostics, AssessmentIssueSummary, AssessmentReasonCode, AssessmentStage, AssessmentStatus, ApprovalAssessmentShell, Phase5AssessmentStage, Phase5AssessmentStatus } from './host/assessment-envelope.ts'
export type { FastJudgeConfig, FastJudgeCandidate, FastJudgeDimension, FastJudgeDimensionResult, JudgeFailureCode, NormalizedFastJudgeConfig, ReviewerRoute } from './host/fast-judge.ts'
export type { RiskAssessment, RiskContextSnapshot, RiskFeature, RiskFeatureSet, AssessmentFinding, AssessmentUncertainty, SaferAlternative } from './host/risk-engine.ts'
export type { BrowserBridgeClientResult, BrowserSafeReasonCode, BrowserSafeReasonCodeV2, RiskAdvisorBridgeRead, RiskAdvisorBridgeViewV1, RiskAdvisorBridgeViewV2, OperationPresentationV1, BrowserRiskAssessmentV1, FailureContextPresentationV1, BrowserOperationKind, BrowserResourceKind, BrowserDimension, BrowserDimensionSource, BrowserEvidenceQuality, BrowserFindingDimension, BrowserFindingSeverity, BrowserFindingStrength, BrowserAlternativeSource, BrowserAlternativeVerification, BrowserUncertaintyImpact } from './bridge-contract.ts'
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
