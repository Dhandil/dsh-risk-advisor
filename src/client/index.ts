import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-approval/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import { RiskAdvisorDetail } from './RiskAdvisorDetail.tsx'
import { en, NS, zh } from './locales.ts'
import { PresentationClient } from './presentation-client.ts'
import type { ClientConnectionLike } from './presentation-store.ts'
import { OnlineCorrectionClient } from './online-correction-client.ts'
import { CorrectionHistoricalContextClient } from './correction-historical-context-client.ts'
import { OnlineCorrectionDock } from './OnlineCorrectionDock.tsx'
import { ONLINE_CORRECTION_NS, onlineCorrectionEn, onlineCorrectionZh } from './online-correction-locales.ts'
import { RuntimeRiskClient } from './runtime-risk-client.ts'
import { HistoricalContextClient } from './historical-context-client.ts'
import { ApprovalHistoricalContextClient } from './approval-historical-context-client.ts'
import { RuntimeRiskAwarenessDock } from './RuntimeRiskAwarenessDock.tsx'
import { RUNTIME_RISK_NS, runtimeRiskEn, runtimeRiskZh } from './runtime-risk-locales.ts'

export { createRiskAdvisorBridgeClient } from './assessment-bridge.ts'
export type { RiskAdvisorBridgeClient } from './assessment-bridge.ts'
export type { BrowserBridgeClientResult, RiskAdvisorBridgeRead, RiskAdvisorBridgeViewV1, RiskAdvisorBridgeViewV2, RiskAdvisorBridgeViewV3, RiskAdvisorBridgeViewV4, BrowserEvidenceSummaryV1, OperationPresentationV1, BrowserRiskAssessmentV1, FailureContextPresentationV1, BrowserDimension } from '../bridge-contract.ts'
export { commandForSnapshot, commandOf } from './command.ts'
export { PresentationClient } from './presentation-client.ts'
export { PresentationStore, POLL_INTERVAL_MS, NOT_FOUND_GRACE_MS } from './presentation-store.ts'
export type { PresentationStoreSnapshot, PresentationStoreStatus } from './presentation-store.ts'
export { RiskAdvisorDetail } from './RiskAdvisorDetail.tsx'
export { en, NS, zh } from './locales.ts'
export { OnlineCorrectionClient } from './online-correction-client.ts'
export { OnlineCorrectionDock, renderOnlineCorrectionAdvisory } from './OnlineCorrectionDock.tsx'
export { CorrectionHistoricalContextClient } from './correction-historical-context-client.ts'
export { CorrectionHistoricalContextStore, CORRECTION_HISTORICAL_CONTEXT_MIN_READ_INTERVAL_MS, CORRECTION_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS } from './correction-historical-context-store.ts'
export { createCorrectionHistoricalContextBridgeClient } from './correction-historical-context-bridge.ts'
export {
  CORRECTION_HISTORICAL_CONTEXT_RPC_CHANNEL,
  CORRECTION_HISTORICAL_CONTEXT_ENDPOINT,
  CORRECTION_HISTORICAL_CONTEXT_ROUTE,
  CORRECTION_HISTORICAL_CONTEXT_REASON_CODES_V1,
  parseCorrectionHistoricalContextRequest,
  parseCorrectionHistoricalContextRead,
} from '../correction-historical-context-contract.ts'
export type {
  CorrectionHistoricalContextRequestV1,
  CorrectionHistoricalContextReadV1,
  CorrectionHistoricalContextClientResult,
  CorrectionHistoricalContextReasonCodeV1,
} from '../correction-historical-context-contract.ts'
export { createOnlineCorrectionBridgeClient } from './online-correction-bridge.ts'
export { OnlineCorrectionStore, ONLINE_CORRECTION_POLL_INTERVAL_MS } from './online-correction-store.ts'
export type { OnlineCorrectionStoreSnapshot } from './online-correction-store.ts'
export { ONLINE_CORRECTION_NS, onlineCorrectionEn, onlineCorrectionZh } from './online-correction-locales.ts'
export {
  ONLINE_CORRECTION_RPC_CHANNEL,
  ONLINE_CORRECTION_ENDPOINT,
  ONLINE_CORRECTION_ROUTE,
  ONLINE_CORRECTION_IDENTIFIER_LIMIT,
  ONLINE_CORRECTION_MAX_FINDINGS,
  parseOnlineCorrectionRead,
  parseOnlineCorrectionRequest,
} from '../online-correction-contract.ts'
export { RuntimeRiskClient } from './runtime-risk-client.ts'
export { HistoricalContextClient } from './historical-context-client.ts'
export { ApprovalHistoricalContextClient } from './approval-historical-context-client.ts'
export { ApprovalHistoricalContextStore, APPROVAL_HISTORICAL_CONTEXT_MIN_READ_INTERVAL_MS, APPROVAL_HISTORICAL_CONTEXT_MAX_FRESHNESS_MS } from './approval-historical-context-store.ts'
export { createApprovalHistoricalContextBridgeClient } from './approval-historical-context-bridge.ts'
export {
  APPROVAL_HISTORICAL_CONTEXT_ENDPOINT,
  APPROVAL_HISTORICAL_CONTEXT_ROUTE,
  APPROVAL_HISTORICAL_CONTEXT_REASON_CODES_V1,
  parseApprovalHistoricalContextRequest,
  parseApprovalHistoricalContextRead,
} from '../approval-historical-context-contract.ts'
export type { ApprovalHistoricalContextRequestV1, ApprovalHistoricalContextReadV1, ApprovalHistoricalContextClientResult, ApprovalHistoricalContextReasonCodeV1 } from '../approval-historical-context-contract.ts'
export { RuntimeRiskStore, RUNTIME_RISK_POLL_INTERVAL_MS } from './runtime-risk-store.ts'
export type { RuntimeRiskStoreSnapshot } from './runtime-risk-store.ts'
export { createRuntimeRiskBridgeClient } from './runtime-risk-bridge.ts'
export { RuntimeRiskAwarenessDock } from './RuntimeRiskAwarenessDock.tsx'
export { RUNTIME_RISK_NS, runtimeRiskEn, runtimeRiskZh } from './runtime-risk-locales.ts'
export type { RuntimeRiskLocaleKey } from './runtime-risk-locales.ts'
export { HISTORICAL_CONTEXT_ENDPOINT, HISTORICAL_CONTEXT_ROUTE, HISTORICAL_CONTEXT_REASON_CODES_V1, parseHistoricalContextRead } from '../historical-context-contract.ts'
export type { HistoricalContextReadV1, HistoricalContextClientResult, HistoricalContextV1, HistoricalContextReasonCodeV1 } from '../historical-context-contract.ts'
export {
  RISK_ADVISOR_RUNTIME_RISK_ENDPOINT,
  RISK_ADVISOR_RUNTIME_RISK_ROUTE,
  RUNTIME_RISK_REASON_CODES_V1,
  parseRuntimeRiskAwarenessRead,
} from '../bridge-contract.ts'
export type { RuntimeRiskAwarenessViewV1, RuntimeRiskAwarenessReadV1, RuntimeRiskAwarenessClientResult, RuntimeRiskReasonCodeV1 } from '../bridge-contract.ts'
export type {
  BrowserOnlineCorrectionKind,
  BrowserOnlineCorrectionDiagnosis,
  BrowserOnlineCorrectionAdvisoryCode,
  BrowserOnlineCorrectionReasonCode,
  BrowserOnlineCorrectionFindingV1,
  BrowserOnlineCorrectionViewV1,
  OnlineCorrectionBridgeRead,
  OnlineCorrectionClientResult,
} from '../online-correction-contract.ts'

/** Browser advisory client: it shadows one detail cell at explicit lower priority. */
export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'risk-advisor-r1: dictionaries')
  ctx.effect(() => ctx.locale.register(ONLINE_CORRECTION_NS, { zh: onlineCorrectionZh, en: onlineCorrectionEn }), 'risk-advisor-online-correction: dictionaries')
  ctx.effect(() => ctx.locale.register(RUNTIME_RISK_NS, { zh: runtimeRiskZh, en: runtimeRiskEn }), 'risk-advisor-runtime-risk: dictionaries')

  const installSlot = (presentationClient: PresentationClient, approvalHistoricalContextClient: ApprovalHistoricalContextClient): void => {
    ctx.slots.inject('conversation.approval.detail', () => ctx.slots.register({
      name: 'conversation.approval.detail',
      priority: -100,
      locale: NS,
      inject: () => ({ presentationClient, approvalHistoricalContextClient }),
    }, RiskAdvisorDetail))
  }
  const installOnlineCorrectionSlot = (
    onlineCorrectionClient: OnlineCorrectionClient,
    correctionHistoricalContextClient: CorrectionHistoricalContextClient,
  ): void => {
    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
      name: 'conversation.input.dock',
      id: 'risk-advisor-online-correction',
      order: 10,
      locale: ONLINE_CORRECTION_NS,
      inject: () => ({ onlineCorrectionClient, correctionHistoricalContextClient }),
    }, OnlineCorrectionDock))
  }
  const installRuntimeRiskSlot = (runtimeRiskClient: RuntimeRiskClient, historicalContextClient: HistoricalContextClient): void => {
    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
      name: 'conversation.input.dock',
      id: 'risk-advisor-runtime-risk-awareness',
      order: 20,
      locale: RUNTIME_RISK_NS,
      inject: () => ({ runtimeRiskClient, historicalContextClient }),
    }, RuntimeRiskAwarenessDock))
  }
  const installClients = (lateConnection: ClientConnectionLike): void => {
    const presentationClient = new PresentationClient(lateConnection)
    ctx.effect(() => () => presentationClient.dispose(), 'risk-advisor-phase6: presentation client')
    const approvalHistoricalContextClient = new ApprovalHistoricalContextClient(lateConnection)
    ctx.effect(() => () => approvalHistoricalContextClient.dispose(), 'risk-advisor-phase14.3: approval historical context client')
    installSlot(presentationClient, approvalHistoricalContextClient)
    const onlineCorrectionClient = new OnlineCorrectionClient(lateConnection)
    ctx.effect(() => () => onlineCorrectionClient.dispose(), 'risk-advisor-phase12.2: online correction client')
    const correctionHistoricalContextClient = new CorrectionHistoricalContextClient(lateConnection)
    ctx.effect(() => () => correctionHistoricalContextClient.dispose(), 'risk-advisor-phase14.4: correction history client')
    installOnlineCorrectionSlot(onlineCorrectionClient, correctionHistoricalContextClient)
    const runtimeRiskClient = new RuntimeRiskClient(lateConnection)
    ctx.effect(() => () => runtimeRiskClient.dispose(), 'risk-advisor-phase14.1: runtime risk client')
    const historicalContextClient = new HistoricalContextClient(lateConnection)
    ctx.effect(() => () => historicalContextClient.dispose(), 'risk-advisor-phase14.2: historical context client')
    installRuntimeRiskSlot(runtimeRiskClient, historicalContextClient)
  }
  const connection = ctx.get('connection', false) as ClientConnectionLike | undefined
  if (connection !== undefined) {
    installClients(connection)
    return
  }
  ctx.inject(['connection'], connectionCtx => {
    const lateConnection = connectionCtx.get('connection', false) as ClientConnectionLike | undefined
    if (lateConnection === undefined) return
    const presentationClient = new PresentationClient(lateConnection)
    connectionCtx.effect(() => () => presentationClient.dispose(), 'risk-advisor-phase6: presentation client')
    const approvalHistoricalContextClient = new ApprovalHistoricalContextClient(lateConnection)
    connectionCtx.effect(() => () => approvalHistoricalContextClient.dispose(), 'risk-advisor-phase14.3: approval historical context client')
    installSlot(presentationClient, approvalHistoricalContextClient)
    const onlineCorrectionClient = new OnlineCorrectionClient(lateConnection)
    connectionCtx.effect(() => () => onlineCorrectionClient.dispose(), 'risk-advisor-phase12.2: online correction client')
    const correctionHistoricalContextClient = new CorrectionHistoricalContextClient(lateConnection)
    connectionCtx.effect(() => () => correctionHistoricalContextClient.dispose(), 'risk-advisor-phase14.4: correction history client')
    installOnlineCorrectionSlot(onlineCorrectionClient, correctionHistoricalContextClient)
    const runtimeRiskClient = new RuntimeRiskClient(lateConnection)
    connectionCtx.effect(() => () => runtimeRiskClient.dispose(), 'risk-advisor-phase14.1: runtime risk client')
    const historicalContextClient = new HistoricalContextClient(lateConnection)
    connectionCtx.effect(() => () => historicalContextClient.dispose(), 'risk-advisor-phase14.2: historical context client')
    installRuntimeRiskSlot(runtimeRiskClient, historicalContextClient)
  })
}
