import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { ToolExecutionResult } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-user-approval'
import { ActiveExecutionIndex, createCorrelationDiagnostics } from './host/correlation.ts'
import type { CorrelationDiagnostics, ExecutionId } from './host/correlation.ts'
import { installLedger } from './host/ledger.ts'
import type { LedgerDiagnostics } from './host/ledger.ts'
import { OperationFoundation } from './host/operation-foundation.ts'
import type { FoundationDiagnostics } from './host/operation-foundation.ts'
import { ApprovalAssessmentCoordinator } from './host/assessment-envelope.ts'
import type { AssessmentDiagnostics } from './host/assessment-envelope.ts'
import { installRiskAdvisorBrowserBridge } from './host/browser-bridge.ts'
import type { HostConnectionLike } from './host/browser-bridge.ts'
import { RuntimeRiskAwarenessRuntime } from './host/runtime-risk-awareness.ts'
import { installOnlineCorrectionBrowserBridge } from './host/online-correction-bridge.ts'
import type { OnlineCorrectionHostConnectionLike } from './host/online-correction-bridge.ts'
import { RetryEscalationAnalyzer } from './host/retry-escalation.ts'
import type { FailureChainDiagnostics } from './host/retry-escalation.ts'
import { RuleEngine } from './host/rule-engine.ts'
import type { RuleDiagnostics } from './host/rule-engine.ts'
import type { FastJudgeConfig } from './host/fast-judge.ts'
import type { DeepJudgeConfig } from './host/deep-judge.ts'
import { getSubagentsCapability } from './host/deep-judge-subagent.ts'
import { ExpectedEffectRegistry } from './host/expected-effect.ts'
import { PostconditionVerifier } from './host/postcondition-verifier.ts'
import type { VerificationDiagnostics, VerificationRecordV1 } from './host/verification-store.ts'
import { BoundedEvidenceRuntime } from './host/evidence-collector.ts'
import type { EvidenceDiagnostics } from './host/evidence-types.ts'
import { ExperienceRuntime } from './host/experience-store.ts'
import type { ExperienceDiagnostics } from './host/experience-store.ts'
import { OutcomeRuntime } from './host/outcome-store.ts'
import type { OutcomeDiagnostics } from './host/outcome-store.ts'
import { PatternRuntime } from './host/pattern-store.ts'
import type { PatternDiagnostics } from './host/pattern-store.ts'
import { GuidanceRuntime } from './host/guidance-store.ts'
import type { GuidanceDiagnostics } from './host/guidance-store.ts'
import { LiveCorrectionRuntime } from './host/live-correction.ts'
import type { LiveCorrectionDiagnostics } from './host/live-correction.ts'
import { CorrectionHistoricalIdentityRegistry } from './host/correction-historical-identity.ts'
import { installCorrectionHistoricalContextBrowserBridge } from './host/correction-historical-context-bridge.ts'
import { installCorrectionNextCheckBrowserBridge } from './host/correction-next-check-bridge.ts'
import type { DomainFacility } from '@deepseek-ai/dsh-storage-domain'

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
  riskAdvisorEvidence: EvidenceDiagnostics
  riskAdvisorExperience: ExperienceDiagnostics
  riskAdvisorOutcomes: OutcomeDiagnostics
  riskAdvisorPatterns: PatternDiagnostics
  riskAdvisorGuidance: GuidanceDiagnostics
  riskAdvisorLiveCorrection: LiveCorrectionDiagnostics
}
}

interface CorrelationHooks {
  readonly capture?: (exec: Parameters<ActiveExecutionIndex['observePreExecute']>[0], executionId: ReturnType<ActiveExecutionIndex['observePreExecute']>, parentExecutionId: string | undefined) => void
  readonly retire?: (exec: Parameters<ActiveExecutionIndex['observeResult']>[0], result: ToolExecutionResult, index: ActiveExecutionIndex, executionId: ExecutionId | undefined) => void
  readonly sessionEvent?: (session: Session, event: SessionEvent, index: ActiveExecutionIndex) => void
  readonly sessionDisposed?: (session: Session) => void
}

function installCorrelationInternal(ctx: Context, hooks: CorrelationHooks = {}): CorrelationDiagnostics {
  const index = new ActiveExecutionIndex()
  const executionIds = new WeakMap<object, ExecutionId>()
  const diagnostics = createCorrelationDiagnostics(index)
  ctx.provide('riskAdvisorCorrelation', diagnostics)
  ctx.on('tools/pre-execute', (exec, next) => {
    const executionId = index.observePreExecute(exec)
    if (executionId !== undefined) executionIds.set(exec, executionId)
    try { hooks.capture?.(exec, executionId, index.parentExecutionIdOf(exec)) } catch { /* Foundation is observational. */ }
    return next()
  })
  ctx.on('tools/result', (exec, result) => {
    try { hooks.retire?.(exec, result, index, executionIds.get(exec)) } catch { /* Foundation is observational. */ }
    executionIds.delete(exec)
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
export function apply(ctx: Context, config: { readonly fastJudge?: FastJudgeConfig; readonly deepJudge?: DeepJudgeConfig } = {}): void {
  const ledger = installLedger(ctx)
  const foundation = new OperationFoundation()
  const failureChain = new RetryEscalationAnalyzer()
  const rules = new RuleEngine()
  const expectedEffects = new ExpectedEffectRegistry()
  const evidence = new BoundedEvidenceRuntime()
  const outcomes = new OutcomeRuntime()
  const patterns = new PatternRuntime()
  const guidance = new GuidanceRuntime()
  const liveCorrection = new LiveCorrectionRuntime()
  const runtimeRisk = new RuntimeRiskAwarenessRuntime(foundation.diagnostics, rules.diagnostics, failureChain.diagnostics, ledger, { expectedEffects })
  const correctionHistoricalIdentity = new CorrectionHistoricalIdentityRegistry()
  ctx.effect(() => () => correctionHistoricalIdentity.dispose(), 'risk-advisor-phase14.4-correction-historical-identity-generation')
  const verifier = new PostconditionVerifier(expectedEffects, {
    onRecord: (record: VerificationRecordV1) => {
      try { liveCorrection.observeVerification(record) } catch { /* Live correction is observational. */ }
      failureChain.observeVerification(record)
      outcomes.observeVerification(record)
    },
  })
  const assessments = new ApprovalAssessmentCoordinator(foundation.diagnostics, {
    rules: rules.diagnostics,
    failureChain: failureChain.diagnostics,
    ledger,
    evidence,
    ...config.fastJudge === undefined ? {} : { fastJudge: config.fastJudge },
    ...config.deepJudge === undefined ? {} : { deepJudge: config.deepJudge },
    runtimeRisk,
  })
  const experience = new ExperienceRuntime(rules.diagnostics, failureChain.diagnostics, {
    onCommitted: episode => outcomes.observeEpisodeCommitted(episode),
    onCommitFailed: executionId => outcomes.observeEpisodeCommitFailed(executionId),
  })
  installCorrelationInternal(ctx, {
    capture: (exec, executionId, parentExecutionId) => {
      foundation.capture(exec, executionId, parentExecutionId)
      failureChain.observePreExecute(exec, executionId)
      rules.observePreExecute(exec, executionId, executionId === undefined ? undefined : failureChain.diagnostics.get(executionId))
      expectedEffects.capture(exec, executionId)
      evidence.seeds.capture(exec, executionId)
      runtimeRisk.capturePreExecute(exec, executionId)
      try {
        const session = exec.agent?.session
        if (session !== undefined && executionId !== undefined) {
          correctionHistoricalIdentity.capture(session, executionId, runtimeRisk.capturedPreExecuteHistoricalPatternId(session, executionId))
        }
      } catch { /* optional Phase 14.4 association cannot affect Tool execution */ }
      assessments.captureDeepJudgeParent(exec, executionId)
    },
    retire: (exec, result, index, executionId) => {
      failureChain.observeResult(exec, result)
      try { correctionHistoricalIdentity.settle(exec.agent?.session, executionId) } catch { /* optional read identity only */ }
      try {
        liveCorrection.observeSettledResult(exec, executionId, executionId === undefined ? undefined : failureChain.diagnostics.get(executionId))
      } catch { /* Live correction is observational. */ }
      verifier.observeResult(exec, result)
      experience.observeResult(exec, result, index, executionId)
      foundation.retire(exec)
      runtimeRisk.observeResult(exec, executionId)
    },
    sessionEvent: (session, event, index) => { assessments.observeSessionEvent(session, event, index) },
    sessionDisposed: session => {
      assessments.observeSessionDisposed(session)
      runtimeRisk.disposeSession(session)
      evidence.disposeSession(session)
      liveCorrection.disposeSession(session)
      correctionHistoricalIdentity.disposeSession(session)
    },
  })
  ctx.provide('riskAdvisorFoundation', foundation.diagnostics)
  ctx.provide('riskAdvisorAssessments', assessments.diagnostics)
  ctx.provide('riskAdvisorFailureChain', failureChain.diagnostics)
  ctx.provide('riskAdvisorRules', rules.diagnostics)
  ctx.provide('riskAdvisorVerification', verifier.store.diagnostics)
  ctx.provide('riskAdvisorEvidence', evidence.diagnostics)
  ctx.provide('riskAdvisorExperience', experience.diagnostics)
  ctx.provide('riskAdvisorOutcomes', outcomes.diagnostics)
  ctx.provide('riskAdvisorPatterns', patterns.diagnostics)
  ctx.provide('riskAdvisorGuidance', guidance.diagnostics)
  ctx.provide('riskAdvisorLiveCorrection', liveCorrection.diagnostics)
  ctx.inject(['storageDomain'], async experienceCtx => {
    const storageDomain = experienceCtx.get('storageDomain', false) as DomainFacility | undefined
    experienceCtx.effect(() => async () => {
      experience.stopAccepting()
      await verifier.fenceAndDrain()
      await experience.drain()
      await outcomes.drain()
      await patterns.drain()
      await guidance.detach()
      await patterns.detach()
      await outcomes.detach()
      await experience.detach()
    }, 'risk-advisor-experience-outcome-domain-capability')
    if (storageDomain !== undefined) {
      await experience.attach(storageDomain)
      await experience.drain()
      const experienceStatus = experience.diagnostics.status()
      if (experienceStatus === 'READY' || experienceStatus === 'CAPACITY_EXCEEDED') {
        await outcomes.attach(storageDomain, experience.snapshotEpisodes())
        if (experienceStatus === 'READY' && outcomes.diagnostics.status() === 'READY') {
          await patterns.attach(storageDomain, outcomes, () => experience.diagnostics.status() === 'READY')
          if (patterns.diagnostics.status() === 'READY') await guidance.attach(storageDomain, patterns)
        }
      }
    }
  })
  ctx.inject(['connection', 'sessions'], bridgeCtx => {
    const connection = bridgeCtx.get('connection', false) as HostConnectionLike | undefined
    if (connection !== undefined) {
      installRiskAdvisorBrowserBridge(bridgeCtx, connection, assessments, runtimeRisk, guidance.diagnostics)
      installOnlineCorrectionBrowserBridge(bridgeCtx, connection as OnlineCorrectionHostConnectionLike, liveCorrection.diagnostics)
      installCorrectionHistoricalContextBrowserBridge(bridgeCtx, connection as OnlineCorrectionHostConnectionLike,
        liveCorrection.diagnostics, correctionHistoricalIdentity, guidance.diagnostics)
      installCorrectionNextCheckBrowserBridge(bridgeCtx, connection as OnlineCorrectionHostConnectionLike,
        liveCorrection.diagnostics, verifier.store.diagnostics)
    }
  })
  ctx.inject(['llm'], judgeCtx => {
    const llm = judgeCtx.get('llm')
    if (llm !== undefined) assessments.attachJudge(llm)
    judgeCtx.effect(() => () => assessments.detachJudge(), 'risk-advisor-fast-judge-capability')
  })
  ctx.inject(['subagents'], async subagentCtx => {
    const runtime = getSubagentsCapability(subagentCtx)
    if (runtime !== undefined) await assessments.attachSubagents(runtime)
    subagentCtx.effect(() => () => assessments.detachSubagents(), 'risk-advisor-deep-judge-capability')
  })
  ctx.inject(['shell'], shellCtx => {
    const shell = shellCtx.get('shell', false)
    if (shell !== undefined) verifier.attach(shell)
    if (shell !== undefined) evidence.attachShell(shell)
    shellCtx.inject(['sandboxPolicy'], async policyCtx => {
      const sandboxPolicy = policyCtx.get('sandboxPolicy', false)
      if (shell !== undefined) await verifier.attachGeneration(shell, sandboxPolicy)
      policyCtx.effect(() => async () => { await verifier.detach() }, 'risk-advisor-postcondition-sandbox-policy-capability')
    })
    shellCtx.effect(() => async () => { await Promise.all([verifier.detach(), evidence.detachShell()]) }, 'risk-advisor-postcondition-shell-capability')
  })
  ctx.inject(['fs'], fsCtx => {
    const fs = fsCtx.get('fs', false)
    if (fs !== undefined) evidence.attachFs(fs)
    fsCtx.effect(() => async () => { await evidence.detachFs() }, 'risk-advisor-evidence-filesystem-capability')
  })
  ctx.on('session/disposed', session => { verifier.cancelSession(session) })
  ctx.effect(() => () => { foundation.dispose() }, 'risk-advisor-operation-foundation-generation')
  ctx.effect(() => () => assessments.dispose(), 'risk-advisor-assessment-generation')
  ctx.effect(() => () => runtimeRisk.dispose(), 'risk-advisor-runtime-risk-generation')
  ctx.effect(() => () => { failureChain.dispose() }, 'risk-advisor-failure-chain-generation')
  ctx.effect(() => () => { rules.dispose() }, 'risk-advisor-rule-engine-generation')
  ctx.effect(() => () => verifier.dispose(), 'risk-advisor-postcondition-verification-generation')
  ctx.effect(() => () => evidence.dispose(), 'risk-advisor-evidence-collector-generation')
  ctx.effect(() => () => liveCorrection.dispose(), 'risk-advisor-live-correction-generation')
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
export type { EvidenceDiagnostics, EvidenceSnapshotV1, EvidenceReasonCode, EvidenceCollectionStatus, EvidenceFacts, EvidenceCounts } from './host/evidence-types.ts'
export type { OutcomeDiagnostics, OutcomeRuntimeStatus, Qualification } from './host/outcome-store.ts'
export type { OutcomeRevisionV1, OutcomeStatus } from './host/outcome-schema.ts'
export type { FailureChainDiagnostics, FailureChainEntry, FailureChainFailureKind, FailureChainSummary, RelationSummaryStatus, RetryEscalationOptions } from './host/retry-escalation.ts'
export type { RuleDiagnostics, RuleEvaluationStatus, RuleParserConfidence, RuleOperationKind, RuleFindingCategory, RuleFinding, RuleFailureContext, RuleEvaluation } from './host/rule-engine.ts'
export type { AssessmentAssociation, AssessmentBridgeSnapshot, AssessmentDiagnostic, AssessmentDiagnostics, AssessmentIssueSummary, AssessmentReasonCode, AssessmentStage, AssessmentStatus, ApprovalAssessmentShell, Phase5AssessmentStage, Phase5AssessmentStatus } from './host/assessment-envelope.ts'
export type { FastJudgeConfig, FastJudgeCandidate, FastJudgeDimension, FastJudgeDimensionResult, JudgeFailureCode, NormalizedFastJudgeConfig, ReviewerRoute } from './host/fast-judge.ts'
export type { DeepJudgeConfig, DeepJudgeCandidateV1, DeepJudgeDimension, DeepJudgeDimensionResult, DeepJudgeFailureCode, NormalizedDeepJudgeConfig } from './host/deep-judge.ts'
export type { RiskAssessment, RiskContextSnapshot, RiskFeature, RiskFeatureSet, AssessmentFinding, AssessmentUncertainty, SaferAlternative } from './host/risk-engine.ts'
export type { BrowserBridgeClientResult, BrowserSafeReasonCode, BrowserSafeReasonCodeV2, BrowserSafeReasonCodeV3, BrowserSafeReasonCodeV4, RiskAdvisorBridgeRead, RiskAdvisorBridgeViewV1, RiskAdvisorBridgeViewV2, RiskAdvisorBridgeViewV3, RiskAdvisorBridgeViewV4, BrowserEvidenceSummaryV1, OperationPresentationV1, BrowserRiskAssessmentV1, FailureContextPresentationV1, BrowserOperationKind, BrowserResourceKind, BrowserDimension, BrowserDimensionSource, BrowserEvidenceQuality, BrowserFindingDimension, BrowserFindingSeverity, BrowserFindingStrength, BrowserAlternativeSource, BrowserAlternativeVerification, BrowserUncertaintyImpact, RuntimeRiskAwarenessViewV1, RuntimeRiskAwarenessReadV1, RuntimeRiskAwarenessClientResult, RuntimeRiskReasonCodeV1 } from './bridge-contract.ts'
export {
  ONLINE_CORRECTION_RPC_CHANNEL,
  ONLINE_CORRECTION_ENDPOINT,
  ONLINE_CORRECTION_ROUTE,
  ONLINE_CORRECTION_IDENTIFIER_LIMIT,
  ONLINE_CORRECTION_MAX_FINDINGS,
  parseOnlineCorrectionRead,
  parseOnlineCorrectionRequest,
} from './online-correction-contract.ts'
export type {
  BrowserOnlineCorrectionKind,
  BrowserOnlineCorrectionDiagnosis,
  BrowserOnlineCorrectionAdvisoryCode,
  BrowserOnlineCorrectionReasonCode,
  BrowserOnlineCorrectionFindingV1,
  BrowserOnlineCorrectionViewV1,
  OnlineCorrectionBridgeRead,
  OnlineCorrectionClientResult,
} from './online-correction-contract.ts'
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

export type { LiveCorrectionDiagnostics, LiveCorrectionFindingV1, LiveCorrectionFindingKind, LiveCorrectionDiagnosisCode, LiveCorrectionAdvisoryCode, LiveCorrectionSessionView, LiveCorrectionRuntimeStatus } from './host/live-correction.ts'
export { RISK_ADVISOR_RUNTIME_RISK_ENDPOINT, RISK_ADVISOR_RUNTIME_RISK_ROUTE, RUNTIME_RISK_REASON_CODES_V1, parseRuntimeRiskAwarenessRead } from './bridge-contract.ts'
export {
  CORRECTION_HISTORICAL_CONTEXT_RPC_CHANNEL,
  CORRECTION_HISTORICAL_CONTEXT_ENDPOINT,
  CORRECTION_HISTORICAL_CONTEXT_ROUTE,
  CORRECTION_HISTORICAL_CONTEXT_REASON_CODES_V1,
  parseCorrectionHistoricalContextRequest,
  parseCorrectionHistoricalContextRead,
} from './correction-historical-context-contract.ts'
export type {
  CorrectionHistoricalContextRequestV1,
  CorrectionHistoricalContextReadV1,
  CorrectionHistoricalContextClientResult,
  CorrectionHistoricalContextReasonCodeV1,
} from './correction-historical-context-contract.ts'
