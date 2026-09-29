import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-tools'
import { ActiveExecutionIndex } from './host/correlation.ts'

export const inject = ['tools']

declare module '@deepseek-ai/cordis' {
  interface Context {
    riskAdvisorCorrelation: ActiveExecutionIndex
  }
}

/** Install the Host-only R2 observer and return its sanitized diagnostic seam. */
export function installCorrelation(ctx: Context): ActiveExecutionIndex {
  const index = new ActiveExecutionIndex()
  ctx.provide('riskAdvisorCorrelation', index)
  ctx.on('tools/pre-execute', (exec, next) => index.observePreExecuteAndContinue(exec, next))
  ctx.on('tools/result', (exec, result) => { index.observeResult(exec, result) })
  ctx.on('session/event', (session, event) => { index.observeSessionEvent(session, event) })
  ctx.effect(() => () => { index.dispose() }, 'risk-advisor-correlation-generation')
  return index
}

/** Host bundle entry. R2 observes native execution and approval events only. */
export function apply(ctx: Context): void {
  installCorrelation(ctx)
}

export { ActiveExecutionIndex }
export type {
  ActiveExecutionLookup,
  CorrelationObservation,
  ExecutionId,
  NotFoundReason,
} from './host/correlation.ts'
