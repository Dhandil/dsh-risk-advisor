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

export { createRiskAdvisorBridgeClient } from './assessment-bridge.ts'
export type { RiskAdvisorBridgeClient } from './assessment-bridge.ts'
export type { BrowserBridgeClientResult, RiskAdvisorBridgeRead, RiskAdvisorBridgeViewV1, RiskAdvisorBridgeViewV2, RiskAdvisorBridgeViewV3, BrowserEvidenceSummaryV1, OperationPresentationV1, BrowserRiskAssessmentV1, FailureContextPresentationV1, BrowserDimension } from '../bridge-contract.ts'
export { commandForSnapshot, commandOf } from './command.ts'
export { PresentationClient } from './presentation-client.ts'
export { PresentationStore, POLL_INTERVAL_MS, NOT_FOUND_GRACE_MS } from './presentation-store.ts'
export type { PresentationStoreSnapshot, PresentationStoreStatus } from './presentation-store.ts'
export { RiskAdvisorDetail } from './RiskAdvisorDetail.tsx'
export { en, NS, zh } from './locales.ts'

/** Browser advisory client: it shadows one detail cell at explicit lower priority. */
export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'risk-advisor-r1: dictionaries')

  const installSlot = (presentationClient: PresentationClient): void => {
    ctx.slots.inject('conversation.approval.detail', () => ctx.slots.register({
      name: 'conversation.approval.detail',
      priority: -100,
      locale: NS,
      inject: () => ({ presentationClient }),
    }, RiskAdvisorDetail))
  }
  const connection = ctx.get('connection', false) as ClientConnectionLike | undefined
  if (connection !== undefined) {
    const presentationClient = new PresentationClient(connection)
    ctx.effect(() => () => presentationClient.dispose(), 'risk-advisor-phase6: presentation client')
    installSlot(presentationClient)
    return
  }
  ctx.inject(['connection'], connectionCtx => {
    const lateConnection = connectionCtx.get('connection', false) as ClientConnectionLike | undefined
    if (lateConnection === undefined) return
    const presentationClient = new PresentationClient(lateConnection)
    connectionCtx.effect(() => () => presentationClient.dispose(), 'risk-advisor-phase6: presentation client')
    installSlot(presentationClient)
  })
}
