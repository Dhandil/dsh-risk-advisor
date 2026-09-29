import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-approval/client'
import type {} from '@deepseek-ai/dsh-client-ui-chat/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { R1FixtureStore } from './fixture-store.ts'
import { RiskAdvisorDetail } from './RiskAdvisorDetail.tsx'
import { en, NS, zh } from './locales.ts'

export { commandForSnapshot, commandOf } from './command.ts'
export { R1FixtureStore } from './fixture-store.ts'
export type { R1FixtureSession, R1FixtureSnapshot, R1FixtureState } from './fixture-store.ts'
export { RiskAdvisorDetail } from './RiskAdvisorDetail.tsx'
export { en, NS, zh } from './locales.ts'

/** Browser-only R1 fixture: it shadows one detail cell at explicit lower priority. */
export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'risk-advisor-r1: dictionaries')

  const fixtures = new R1FixtureStore()
  ctx.effect(() => () => fixtures.dispose(), 'risk-advisor-r1: fixture store')

  // `conversation.approval.detail` is a single cell. The explicit -100 rank
  // intentionally shadows ui-chat's rank-0 renderer while this fiber lives.
  // The slot disposer restores ui-chat automatically on plugin disposal.
  ctx.slots.inject('conversation.approval.detail', () => ctx.slots.register({
    name: 'conversation.approval.detail',
    priority: -100,
    locale: NS,
    inject: (sessionId) => ({ fixture: fixtures.forSession(sessionId) }),
  }, RiskAdvisorDetail))
}
