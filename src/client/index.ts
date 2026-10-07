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
import { OnlineCorrectionDock } from './OnlineCorrectionDock.tsx'
import { ONLINE_CORRECTION_NS, onlineCorrectionEn, onlineCorrectionZh } from './online-correction-locales.ts'

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

  const installSlot = (presentationClient: PresentationClient): void => {
    ctx.slots.inject('conversation.approval.detail', () => ctx.slots.register({
      name: 'conversation.approval.detail',
      priority: -100,
      locale: NS,
      inject: () => ({ presentationClient }),
    }, RiskAdvisorDetail))
  }
  const installOnlineCorrectionSlot = (onlineCorrectionClient: OnlineCorrectionClient): void => {
    ctx.slots.inject('conversation.input.dock', () => ctx.slots.register({
      name: 'conversation.input.dock',
      id: 'risk-advisor-online-correction',
      order: 10,
      locale: ONLINE_CORRECTION_NS,
      inject: () => ({ onlineCorrectionClient }),
    }, OnlineCorrectionDock))
  }
  const connection = ctx.get('connection', false) as ClientConnectionLike | undefined
  if (connection !== undefined) {
    const presentationClient = new PresentationClient(connection)
    ctx.effect(() => () => presentationClient.dispose(), 'risk-advisor-phase6: presentation client')
    installSlot(presentationClient)
    const onlineCorrectionClient = new OnlineCorrectionClient(connection)
    ctx.effect(() => () => onlineCorrectionClient.dispose(), 'risk-advisor-phase12.2: online correction client')
    installOnlineCorrectionSlot(onlineCorrectionClient)
    return
  }
  ctx.inject(['connection'], connectionCtx => {
    const lateConnection = connectionCtx.get('connection', false) as ClientConnectionLike | undefined
    if (lateConnection === undefined) return
    const presentationClient = new PresentationClient(lateConnection)
    connectionCtx.effect(() => () => presentationClient.dispose(), 'risk-advisor-phase6: presentation client')
    installSlot(presentationClient)
    const onlineCorrectionClient = new OnlineCorrectionClient(lateConnection)
    connectionCtx.effect(() => () => onlineCorrectionClient.dispose(), 'risk-advisor-phase12.2: online correction client')
    installOnlineCorrectionSlot(onlineCorrectionClient)
  })
}
